import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { ParkingSite } from '../models/ParkingSite.js';
import { ParkingSlot } from '../models/ParkingSlot.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { TokenService } from '../services/tokenService.js';
import { runInTransaction } from '../utils/transactionHelper.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitBookingUpdated, emitSlotsUpdated } from '../services/socketService.js';

// =========================================================================
// 1. SCAN QR (DECIDES ENTRY OR EXIT PER KEY RULES)
// =========================================================================
export const scanQr = asyncHandler(async (req, res, next) => {
  const { qrToken } = req.body;
  const handler = req.user;

  // Handler must be assigned to an active parking site
  if (!handler.assignedSite) {
    return next(
      AppError.forbidden('You are not currently assigned to any parking site. Please contact Admin.')
    );
  }

  // Verify signed QR token
  let decoded;
  try {
    decoded = TokenService.verifyQRToken(qrToken);
  } catch (err) {
    return next(AppError.badRequest('Invalid or expired QR code. Please ask the user to refresh their app.'));
  }

  // Handle case where user showed Profile QR instead of Ticket QR
  if (decoded.purpose === 'profile') {
    const customer = await User.findById(decoded.userId);
    if (!customer) {
      return next(AppError.notFound('Customer profile not found'));
    }

    // Check if customer has an existing active or booked ticket at this site
    const existingBooking = await Booking.findOne({
      user: customer._id,
      site: handler.assignedSite,
      status: { $in: ['booked', 'active'] },
    })
      .populate('slot', 'slotNumber')
      .populate('site', 'name');

    return ApiResponse.success(res, 'User profile scanned', {
      type: 'profile_scanned',
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        vehicleNumber: customer.vehicleNumber,
        walletBalance: customer.walletBalance,
      },
      activeBooking: existingBooking || null,
      instructions: 'You can recharge cash into this user wallet or use it for walk-in check-in.',
    });
  }

  // Must be a ticket QR
  if (decoded.purpose !== 'ticket' || !decoded.bookingId) {
    return next(AppError.badRequest('Invalid QR code: Expected a parking ticket QR code'));
  }

  // Find booking
  const booking = await Booking.findById(decoded.bookingId)
    .populate('site')
    .populate('slot')
    .populate('user');

  if (!booking) {
    return next(AppError.notFound('Booking not found for this ticket QR'));
  }

  // Verify site boundary: handler can only scan tickets for their assigned site
  if (booking.site._id.toString() !== handler.assignedSite.toString()) {
    return next(
      AppError.forbidden(
        `Site mismatch: This ticket belongs to "${booking.site.name}", but you are assigned to a different site.`
      )
    );
  }

  // -----------------------------------------------------------------------
  // BRANCH A: ENTRY (Status === 'booked')
  // -----------------------------------------------------------------------
  if (booking.status === 'booked') {
    const entryTime = new Date();

    await runInTransaction(async (session) => {
      // Mark booking active
      booking.status = 'active';
      booking.entryTime = entryTime;
      booking.handler = handler._id;
      await booking.save({ session });

      // Atomically occupy the slot
      await ParkingSlot.findByIdAndUpdate(
        booking.slot._id,
        { status: 'occupied' },
        { session }
      );
    });

    emitBookingUpdated(booking.user._id.toString(), {
      bookingId: booking._id.toString(),
      status: 'active',
      entryTime,
    });
    emitSlotsUpdated(booking.site._id.toString(), {
      siteId: booking.site._id.toString(),
      action: 'entry',
      slotId: booking.slot._id.toString(),
    });

    return ApiResponse.success(res, 'Vehicle entry registered successfully', {
      action: 'entry',
      bookingId: booking._id,
      vehicleNumber: booking.vehicleNumber,
      slotNumber: booking.slot.slotNumber,
      siteName: booking.site.name,
      entryTime,
      customer: {
        name: booking.user.name,
        phone: booking.user.phone,
      },
    });
  }

  // -----------------------------------------------------------------------
  // BRANCH B: EXIT (Status === 'active')
  // -----------------------------------------------------------------------
  if (booking.status === 'active') {
    const exitTime = new Date();
    const entryTime = booking.entryTime || booking.createdAt;
    const diffMs = exitTime.getTime() - entryTime.getTime();

    // Compute bill: ceil(hours) * hourlyRate, minimum = minimumCharge
    const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const calculatedAmount = hours * booking.site.hourlyRate;
    const totalAmount = Math.max(booking.site.minimumCharge, calculatedAmount);

    const customer = await User.findById(booking.user._id);

    // Case B1: Customer has sufficient wallet balance
    if (customer.walletBalance >= totalAmount) {
      await runInTransaction(async (session) => {
        // Atomic wallet deduction
        await User.findOneAndUpdate(
          { _id: customer._id, walletBalance: { $gte: totalAmount } },
          { $inc: { walletBalance: -totalAmount } },
          { session }
        );

        // Record financial ledger transaction
        await Transaction.create(
          [
            {
              user: customer._id,
              type: 'parking',
              amount: totalAmount,
              method: 'wallet',
              status: 'completed',
              booking: booking._id,
              handler: handler._id,
            },
          ],
          { session }
        );

        // Complete booking
        booking.status = 'completed';
        booking.exitTime = exitTime;
        booking.amount = totalAmount;
        booking.paymentMode = 'wallet';
        booking.handler = handler._id;
        await booking.save({ session });

        // Release slot back to available
        await ParkingSlot.findByIdAndUpdate(
          booking.slot._id,
          { status: 'available' },
          { session }
        );
      });

      emitBookingUpdated(booking.user._id.toString(), {
        bookingId: booking._id.toString(),
        status: 'completed',
        exitTime,
        totalAmount,
      });
      emitSlotsUpdated(booking.site._id.toString(), {
        siteId: booking.site._id.toString(),
        action: 'exit',
        slotId: booking.slot._id.toString(),
      });

      const updatedCustomer = await User.findById(customer._id);

      return ApiResponse.success(res, 'Vehicle exit registered & fee deducted from wallet', {
        action: 'exit',
        settled: true,
        paymentMode: 'wallet',
        bookingId: booking._id,
        parkingDurationHours: hours,
        totalAmount,
        deductedFromWallet: totalAmount,
        shortfall: 0,
        customerWalletRemaining: updatedCustomer.walletBalance,
        slotNumber: booking.slot.slotNumber,
      });
    }

    // Case B2: Insufficient wallet balance -> Return shortfall for cash collection
    const walletDeduction = customer.walletBalance > 0 ? customer.walletBalance : 0;
    const shortfall = totalAmount - walletDeduction;

    return ApiResponse.success(
      res,
      'Insufficient wallet balance. Cash payment required to complete exit.',
      {
        action: 'exit',
        settled: false,
        requiresCashPayment: true,
        bookingId: booking._id,
        parkingDurationHours: hours,
        totalAmount,
        customerWalletBalance: customer.walletBalance,
        walletDeduction,
        shortfall,
        vehicleNumber: booking.vehicleNumber,
        customer: {
          name: customer.name,
          phone: customer.phone,
        },
        instructions: `Collect ₹${shortfall} in cash from the driver and call POST /handler/exit/confirm-cash.`,
      }
    );
  }

  // Branch C: Booking already ended or invalid
  return next(
    AppError.badRequest(
      `Cannot scan ticket: Booking #${booking._id} is already in '${booking.status}' status`
    )
  );
});

// =========================================================================
// 2. CONFIRM CASH EXIT (SETTLE SHORTFALL / CASH PAYMENT)
// =========================================================================
export const confirmCashExit = asyncHandler(async (req, res, next) => {
  const { bookingId, cashCollected } = req.body;
  const handler = req.user;

  const booking = await Booking.findById(bookingId)
    .populate('site')
    .populate('slot')
    .populate('user');

  if (!booking) {
    return next(AppError.notFound('Booking not found'));
  }

  if (booking.site._id.toString() !== handler.assignedSite?.toString()) {
    return next(AppError.forbidden('You can only settle tickets for your assigned site'));
  }

  if (booking.status !== 'active') {
    return next(AppError.badRequest(`Booking status is '${booking.status}', cannot settle exit`));
  }

  const exitTime = new Date();
  const entryTime = booking.entryTime || booking.createdAt;
  const diffMs = exitTime.getTime() - entryTime.getTime();
  const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const calculatedAmount = hours * booking.site.hourlyRate;
  const totalAmount = Math.max(booking.site.minimumCharge, calculatedAmount);

  const customer = await User.findById(booking.user._id);
  const walletDeduction = customer.walletBalance > 0 ? customer.walletBalance : 0;
  const shortfall = totalAmount - walletDeduction;

  if (cashCollected < shortfall) {
    return next(
      AppError.badRequest(
        `Insufficient cash collected: Required shortfall is ₹${shortfall}, but received ₹${cashCollected}`
      )
    );
  }

  await runInTransaction(async (session) => {
    // If partial wallet deduction is available
    if (walletDeduction > 0) {
      await User.findOneAndUpdate(
        { _id: customer._id, walletBalance: { $gte: walletDeduction } },
        { $inc: { walletBalance: -walletDeduction } },
        { session }
      );

      await Transaction.create(
        [
          {
            user: customer._id,
            type: 'parking',
            amount: walletDeduction,
            method: 'wallet',
            status: 'completed',
            booking: booking._id,
            handler: handler._id,
          },
        ],
        { session }
      );
    }

    // Record cash collected by handler
    await Transaction.create(
      [
        {
          user: customer._id,
          type: 'parking',
          amount: shortfall,
          method: 'handler_cash',
          status: 'completed',
          booking: booking._id,
          handler: handler._id,
        },
      ],
      { session }
    );

    // Complete booking
    booking.status = 'completed';
    booking.exitTime = exitTime;
    booking.amount = totalAmount;
    booking.paymentMode = walletDeduction > 0 ? 'mixed' : 'cash';
    booking.handler = handler._id;
    await booking.save({ session });

    // Release slot back to available
    await ParkingSlot.findByIdAndUpdate(
      booking.slot._id,
      { status: 'available' },
      { session }
    );
  });

  emitBookingUpdated(booking.user._id.toString(), {
    bookingId: booking._id.toString(),
    status: 'completed',
    exitTime: booking.exitTime,
    totalAmount,
  });
  emitSlotsUpdated(booking.site._id.toString(), {
    siteId: booking.site._id.toString(),
    action: 'exit',
    slotId: booking.slot._id.toString(),
  });

  return ApiResponse.success(res, 'Cash payment confirmed and vehicle exit completed', {
    bookingId: booking._id,
    settled: true,
    totalAmount,
    deductedFromWallet: walletDeduction,
    cashCollected: shortfall,
    paymentMode: walletDeduction > 0 ? 'mixed' : 'cash',
  });
});

// =========================================================================
// 3. HANDLER WALLET CASH RECHARGE (SCAN USER PROFILE QR + AMOUNT)
// =========================================================================
export const rechargeUserWalletCash = asyncHandler(async (req, res, next) => {
  const { profileQrToken, amount } = req.body;
  const handler = req.user;

  let decoded;
  try {
    decoded = TokenService.verifyQRToken(profileQrToken);
  } catch (err) {
    return next(AppError.badRequest('Invalid or expired profile QR code'));
  }

  if (decoded.purpose !== 'profile' || !decoded.userId) {
    return next(AppError.badRequest('QR code is not a valid user profile QR'));
  }

  const customer = await User.findById(decoded.userId);
  if (!customer || !customer.isActive) {
    return next(AppError.notFound('Customer account not found or deactivated'));
  }

  // In MongoDB transaction: increment customer wallet & log handler_cash transaction
  const result = await runInTransaction(async (session) => {
    const updatedCustomer = await User.findByIdAndUpdate(
      customer._id,
      { $inc: { walletBalance: amount } },
      { session, new: true }
    );

    const transaction = await Transaction.create(
      [
        {
          user: customer._id,
          type: 'recharge',
          amount,
          method: 'handler_cash',
          status: 'completed',
          handler: handler._id,
        },
      ],
      { session }
    );

    return { updatedCustomer, transaction: transaction[0] };
  });

  return ApiResponse.success(
    res,
    `Successfully recharged ₹${amount} in cash for customer ${customer.name}`,
    {
      customerName: customer.name,
      phone: customer.phone,
      amountRecharged: amount,
      newWalletBalance: result.updatedCustomer.walletBalance,
      transactionId: result.transaction._id,
    }
  );
});

// =========================================================================
// 4. WALK-IN BOOKING (IMMEDIATE CHECK-IN FOR ARRIVING CAR)
// =========================================================================
export const createWalkinBooking = asyncHandler(async (req, res, next) => {
  const { vehicleNumber, profileQrToken, slotId, name, phone, bookedHours = 4 } = req.body;
  const handler = req.user;

  if (!handler.assignedSite) {
    return next(AppError.forbidden('You are not assigned to any parking site'));
  }

  // 1. Resolve customer
  let customerId = null;

  if (profileQrToken) {
    try {
      const decoded = TokenService.verifyQRToken(profileQrToken);
      if (decoded.purpose === 'profile' && decoded.userId) {
        customerId = decoded.userId;
      }
    } catch (e) {
      // ignore invalid QR and continue
    }
  }

  // If phone provided, find user by phone
  if (!customerId && phone) {
    const userByPhone = await User.findOne({ phone });
    if (userByPhone) {
      customerId = userByPhone._id;
    }
  }

  // If still no user, use the handler as creator/host or find/create a walk-in guest record
  if (!customerId) {
    let guestUser = await User.findOne({ email: 'guest@parkeasy.com' });
    if (!guestUser) {
      guestUser = await User.create({
        name: name || 'Walk-in Guest',
        email: 'guest@parkeasy.com',
        phone: phone || '0000000000',
        passwordHash: await User.hashPassword('Guest@12345'),
        role: 'user',
        walletBalance: 0,
      });
    }
    customerId = guestUser._id;
  }

  // 2. Atomically reserve & occupy slot in handler's site
  const slotQuery = { site: handler.assignedSite, status: 'available' };
  if (slotId) {
    slotQuery._id = slotId;
  }

  const occupiedSlot = await ParkingSlot.findOneAndUpdate(
    slotQuery,
    { status: 'occupied' },
    { new: true }
  );

  if (!occupiedSlot) {
    return next(AppError.conflict('No available parking slots at this site for walk-in entry'));
  }

  const now = new Date();
  const bookedUntil = new Date(now.getTime() + bookedHours * 60 * 60 * 1000);

  // 3. Create active booking
  const booking = await Booking.create({
    user: customerId,
    site: handler.assignedSite,
    slot: occupiedSlot._id,
    vehicleNumber,
    status: 'active',
    bookedFrom: now,
    bookedUntil,
    entryTime: now,
    paymentMode: 'cash',
    createdBy: 'handler',
    handler: handler._id,
  });

  // 4. Generate signed ticket QR token
  const ticketQrToken = TokenService.generateQRToken(
    { bookingId: booking._id.toString(), purpose: 'ticket' },
    '24h'
  );

  return ApiResponse.created(res, 'Walk-in vehicle checked in successfully', {
    booking,
    slotNumber: occupiedSlot.slotNumber,
    ticketQrToken,
    entryTime: now,
  });
});

// =========================================================================
// 5. HANDLER PARKING HISTORY (LIMITED TO HANDLER'S ASSIGNED SITE)
// =========================================================================
export const getHandlerHistory = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status, startDate, endDate } = req.query;
  const handler = req.user;

  if (!handler.assignedSite) {
    return next(AppError.forbidden('You are not assigned to any parking site'));
  }

  const query = { site: handler.assignedSite };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('user', 'name phone vehicleNumber')
      .populate('slot', 'slotNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(query),
  ]);

  return ApiResponse.success(res, 'Handler site parking history retrieved', {
    siteId: handler.assignedSite,
    bookings,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// =========================================================================
// 6. HANDLER CASH RECHARGES HISTORY (RECORDED BY THIS HANDLER)
// =========================================================================
export const getHandlerRecharges = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, startDate, endDate } = req.query;
  const handler = req.user;

  const query = {
    handler: handler._id,
    type: 'recharge',
    method: 'handler_cash',
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [recharges, total, totalAmountAgg] = await Promise.all([
    Transaction.find(query)
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Transaction.countDocuments(query),
    Transaction.aggregate([
      { $match: query },
      { $group: { _id: null, totalCashCollected: { $sum: '$amount' } } },
    ]),
  ]);

  return ApiResponse.success(res, 'Handler cash recharges retrieved', {
    recharges,
    shiftSummary: {
      totalCashCollected: totalAmountAgg[0]?.totalCashCollected || 0,
      transactionCount: total,
    },
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// =========================================================================
// 7. HANDLER DASHBOARD STATS
// =========================================================================
export const getHandlerDashboardStats = asyncHandler(async (req, res, next) => {
  const handler = req.user;

  if (!handler.assignedSite) {
    return ApiResponse.success(res, 'Handler dashboard summary', {
      assignedSite: null,
      today: { entries: 0, exits: 0, cashCollected: 0 },
      slots: { total: 0, available: 0, occupied: 0, reserved: 0 },
      activeVehicles: [],
    });
  }

  const site = await ParkingSite.findById(handler.assignedSite);
  if (!site) {
    return next(AppError.notFound('Assigned parking site not found'));
  }

  // Today time boundaries
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [
    todayEntries,
    todayExits,
    slotsCount,
    parkingCashAgg,
    rechargeCashAgg,
    activeVehicles,
  ] = await Promise.all([
    // Today's entries
    Booking.countDocuments({
      site: site._id,
      entryTime: { $gte: startOfDay, $lte: endOfDay },
    }),
    // Today's exits
    Booking.countDocuments({
      site: site._id,
      exitTime: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed',
    }),
    // Slots count by status
    ParkingSlot.aggregate([
      { $match: { site: site._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Cash collected from parking settlements today
    Transaction.aggregate([
      {
        $match: {
          handler: handler._id,
          type: 'parking',
          method: { $in: ['cash', 'mixed'] },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Cash collected from wallet recharges today
    Transaction.aggregate([
      {
        $match: {
          handler: handler._id,
          type: 'recharge',
          method: 'handler_cash',
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Currently active parked vehicles
    Booking.find({
      site: site._id,
      status: 'active',
    })
      .populate('user', 'name phone')
      .populate('slot', 'slotNumber')
      .sort({ entryTime: -1 })
      .limit(10),
  ]);

  const slotsMap = { available: 0, occupied: 0, reserved: 0, disabled: 0 };
  let totalSlots = 0;
  slotsCount.forEach((sc) => {
    slotsMap[sc._id] = sc.count;
    totalSlots += sc.count;
  });

  const parkingCash = parkingCashAgg[0]?.total || 0;
  const rechargeCash = rechargeCashAgg[0]?.total || 0;
  const totalCashCollected = parkingCash + rechargeCash;

  return ApiResponse.success(res, 'Handler dashboard summary', {
    assignedSite: {
      _id: site._id,
      name: site.name,
      address: site.address,
      area: site.area,
      hourlyRate: site.hourlyRate,
      minimumCharge: site.minimumCharge,
      totalSlots: site.totalSlots || totalSlots,
    },
    today: {
      entries: todayEntries,
      exits: todayExits,
      cashCollected: totalCashCollected,
      parkingCash,
      rechargeCash,
    },
    slots: {
      total: totalSlots,
      available: slotsMap.available || 0,
      occupied: slotsMap.occupied || 0,
      reserved: slotsMap.reserved || 0,
      disabled: slotsMap.disabled || 0,
    },
    activeVehicles,
  });
});


