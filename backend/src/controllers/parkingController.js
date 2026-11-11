import mongoose from 'mongoose';
import { ParkingSite } from '../models/ParkingSite.js';
import { ParkingSlot } from '../models/ParkingSlot.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { TokenService } from '../services/tokenService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitBookingUpdated, emitSlotsUpdated } from '../services/socketService.js';

// =========================================================================
// (a) GET NEARBY SITES ($geoNear) - Serves 10km auto-search & 5km filter
// =========================================================================
export const getNearbySites = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 10 } = req.query;

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusInMeters = parseFloat(radius) * 1000;

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude], // GeoJSON [lng, lat]
        },
        distanceField: 'distanceMeters',
        maxDistance: radiusInMeters,
        spherical: true,
        query: { isActive: true },
      },
    },
    {
      $lookup: {
        from: 'parkingslots',
        localField: '_id',
        foreignField: 'site',
        as: 'slots',
      },
    },
    {
      $project: {
        name: 1,
        address: 1,
        area: 1,
        postalCode: 1,
        location: 1,
        hourlyRate: 1,
        minimumCharge: 1,
        totalSlots: 1,
        isActive: 1,
        distanceMeters: { $round: ['$distanceMeters', 1] },
        distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
        freeSlotsCount: {
          $size: {
            $filter: {
              input: '$slots',
              as: 'slot',
              cond: { $eq: ['$$slot.status', 'available'] },
            },
          },
        },
        occupiedSlotsCount: {
          $size: {
            $filter: {
              input: '$slots',
              as: 'slot',
              cond: { $eq: ['$$slot.status', 'occupied'] },
            },
          },
        },
        reservedSlotsCount: {
          $size: {
            $filter: {
              input: '$slots',
              as: 'slot',
              cond: { $eq: ['$$slot.status', 'reserved'] },
            },
          },
        },
      },
    },
  ];

  const sites = await ParkingSite.aggregate(pipeline);

  return ApiResponse.success(res, `Found ${sites.length} parking site(s) within ${radius} km`, {
    searchRadiusKm: parseFloat(radius),
    userLocation: { latitude, longitude },
    count: sites.length,
    sites,
  });
});

// =========================================================================
// (b) GET SITES WITH AREA / POSTAL CODE FILTERS
// =========================================================================
export const getSitesWithFilter = asyncHandler(async (req, res) => {
  const { area, postalCode, search, page = 1, limit = 10 } = req.query;

  const matchQuery = { isActive: true };

  if (area) {
    matchQuery.area = { $regex: area, $options: 'i' };
  }

  if (postalCode) {
    matchQuery.postalCode = { $regex: postalCode, $options: 'i' };
  }

  if (search) {
    matchQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
      { area: { $regex: search, $options: 'i' } },
      { postalCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, sites] = await Promise.all([
    ParkingSite.countDocuments(matchQuery),
    ParkingSite.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'parkingslots',
          localField: '_id',
          foreignField: 'site',
          as: 'slots',
        },
      },
      {
        $project: {
          name: 1,
          address: 1,
          area: 1,
          postalCode: 1,
          location: 1,
          hourlyRate: 1,
          minimumCharge: 1,
          totalSlots: 1,
          isActive: 1,
          createdAt: 1,
          freeSlotsCount: {
            $size: {
              $filter: {
                input: '$slots',
                as: 'slot',
                cond: { $eq: ['$$slot.status', 'available'] },
              },
            },
          },
        },
      },
    ]),
  ]);

  return ApiResponse.success(res, 'Parking sites retrieved successfully', {
    sites,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

// =========================================================================
// (c) GET SITE SLOTS WITH REAL-TIME AVAILABILITY
// =========================================================================
export const getSiteSlotsWithAvailability = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const site = await ParkingSite.findOne({ _id: id, isActive: true });
  if (!site) {
    return next(AppError.notFound('Parking site not found or inactive'));
  }

  const slots = await ParkingSlot.find({ site: id }).sort({ slotNumber: 1 });

  const summary = {
    total: slots.length,
    available: 0,
    reserved: 0,
    occupied: 0,
    disabled: 0,
  };

  slots.forEach((s) => {
    if (summary[s.status] !== undefined) {
      summary[s.status]++;
    }
  });

  return ApiResponse.success(res, 'Parking slots and live availability retrieved', {
    site: {
      _id: site._id,
      name: site.name,
      address: site.address,
      area: site.area,
      postalCode: site.postalCode,
      location: site.location,
      hourlyRate: site.hourlyRate,
      minimumCharge: site.minimumCharge,
      totalSlots: site.totalSlots,
    },
    summary,
    slots,
  });
});

// =========================================================================
// (d) POST BOOKING WITH ATOMIC SLOT RESERVATION & SHORT SIGNED QR TOKEN
// =========================================================================
export const createBooking = asyncHandler(async (req, res, next) => {
  const { siteId, slotId, vehicleNumber, bookedHours = 2, bookedUntil } = req.body;

  // 1. Verify parking site
  const site = await ParkingSite.findOne({ _id: siteId, isActive: true });
  if (!site) {
    return next(AppError.notFound('Parking site not found or is currently closed'));
  }

  // 2. Resolve vehicle number
  const assignedVehicleNumber = vehicleNumber || req.user.vehicleNumber;
  if (!assignedVehicleNumber) {
    return next(
      AppError.badRequest('Vehicle number is required. Please provide it or update your profile.')
    );
  }

  // 3. Atomic slot reservation (Prevents double booking race conditions)
  let reservedSlot;
  if (slotId) {
    // User requested a specific slot
    reservedSlot = await ParkingSlot.findOneAndUpdate(
      { _id: slotId, site: siteId, status: 'available' },
      { status: 'reserved' },
      { new: true }
    );
  } else {
    // Pick the first available slot in the site
    reservedSlot = await ParkingSlot.findOneAndUpdate(
      { site: siteId, status: 'available' },
      { status: 'reserved' },
      { new: true }
    );
  }

  if (!reservedSlot) {
    return next(
      AppError.conflict(
        'Sorry, no available slot found or the requested slot has just been reserved by another user'
      )
    );
  }

  // 4. Calculate booking end time
  const now = new Date();
  const calculatedEndTime = bookedUntil
    ? new Date(bookedUntil)
    : new Date(now.getTime() + bookedHours * 60 * 60 * 1000);

  // 5. Create Booking record
  const booking = await Booking.create({
    user: req.user._id,
    site: siteId,
    slot: reservedSlot._id,
    vehicleNumber: assignedVehicleNumber,
    status: 'booked',
    bookedFrom: now,
    bookedUntil: calculatedEndTime,
    paymentMode: 'wallet',
    createdBy: 'user',
  });

  // 6. Generate short signed ticket QR token (signed JWT)
  const ticketQrToken = TokenService.generateQRToken(
    {
      bookingId: booking._id.toString(),
      purpose: 'ticket',
    },
    '24h'
  );

  return ApiResponse.created(res, 'Parking slot reserved successfully', {
    booking,
    slotNumber: reservedSlot.slotNumber,
    ticketQrToken,
    instructions: 'Show this QR code at the parking site entry to check in.',
  });
});

// =========================================================================
// (e) CANCEL BOOKING & ATOMICALLY RELEASE SLOT
// =========================================================================
export const cancelBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    return next(AppError.notFound('Booking not found'));
  }

  // Ensure user owns booking or is admin
  if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(AppError.forbidden('You are not authorized to cancel this booking'));
  }

  // User can only cancel if booking is still in 'booked' status (before entry)
  if (booking.status !== 'booked') {
    return next(
      AppError.badRequest(
        `Cannot cancel booking: Status is '${booking.status}'. Free cancellation is only available before vehicle entry.`
      )
    );
  }

  // Mark booking cancelled
  booking.status = 'cancelled';
  await booking.save();

  // Atomically release the slot back to available
  await ParkingSlot.findByIdAndUpdate(booking.slot, { status: 'available' });

  emitBookingUpdated(booking.user.toString(), {
    bookingId: booking._id.toString(),
    status: 'cancelled',
  });
  emitSlotsUpdated(booking.site.toString(), {
    siteId: booking.site.toString(),
    action: 'cancelled',
    slotId: booking.slot.toString(),
  });

  return ApiResponse.success(res, 'Booking cancelled successfully and parking slot released');
});

// =========================================================================
// (f) USER EXIT & SETTLE PARKING (WALLET CHECKOUT)
// =========================================================================
export const userExitBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findById(id).populate('site').populate('slot');
  if (!booking) {
    return next(AppError.notFound('Booking not found'));
  }

  // Ensure user owns booking or is admin
  if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(AppError.forbidden('You are not authorized to close this parking session'));
  }

  if (booking.status !== 'active') {
    return next(
      AppError.badRequest(
        `Cannot exit: Booking status is '${booking.status}'. Only currently active parked sessions can be completed.`
      )
    );
  }

  const exitTime = new Date();
  const entryTime = booking.entryTime || booking.createdAt;
  const diffMs = exitTime.getTime() - entryTime.getTime();

  // Compute bill: ceil(hours) * hourlyRate, minimum = minimumCharge
  const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const calculatedAmount = hours * (booking.site?.hourlyRate || 40);
  const totalAmount = Math.max(booking.site?.minimumCharge || 20, calculatedAmount);

  const customer = await User.findById(booking.user._id || booking.user);
  if (!customer) {
    return next(AppError.notFound('Customer user record not found'));
  }

  if (customer.walletBalance < totalAmount) {
    return next(
      AppError.badRequest(
        `Insufficient wallet balance. Total parking fee is ₹${totalAmount}, but your current wallet balance is ₹${customer.walletBalance}. Please recharge your wallet or present your QR to the booth officer to complete exit with cash.`
      )
    );
  }

  // Deduct wallet balance
  await User.findByIdAndUpdate(customer._id, { $inc: { walletBalance: -totalAmount } });

  // Record transaction in financial ledger
  await Transaction.create({
    user: customer._id,
    type: 'parking',
    amount: totalAmount,
    method: 'wallet',
    status: 'completed',
    booking: booking._id,
  });

  // Mark booking completed
  booking.status = 'completed';
  booking.exitTime = exitTime;
  booking.amount = totalAmount;
  booking.paymentMode = 'wallet';
  await booking.save();

  // Release parking slot
  await ParkingSlot.findByIdAndUpdate(booking.slot._id, { status: 'available' });

  emitBookingUpdated(booking.user.toString(), {
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

  return ApiResponse.success(res, 'Parking session closed successfully and payment deducted from wallet', {
    bookingId: booking._id,
    status: 'completed',
    totalAmount,
    durationHours: hours,
    walletDeduction: totalAmount,
    remainingWalletBalance: updatedCustomer.walletBalance,
  });
});

// =========================================================================
// (g) GET MY BOOKINGS (CURRENT + PREVIOUS)
// =========================================================================
export const getMyBookings = asyncHandler(async (req, res) => {
  const { type = 'all', page = 1, limit = 10 } = req.query;

  const userId = req.user._id;

  if (type === 'current') {
    // Current: booked or active
    const bookings = await Booking.find({
      user: userId,
      status: { $in: ['booked', 'active'] },
    })
      .populate('site', 'name address area postalCode hourlyRate minimumCharge location')
      .populate('slot', 'slotNumber status')
      .sort({ createdAt: -1 });

    // Attach signed ticket QR tokens
    const enriched = bookings.map((b) => {
      const bObj = b.toJSON();
      if (b.status === 'booked' || b.status === 'active') {
        bObj.ticketQrToken = TokenService.generateQRToken(
          { bookingId: b._id.toString(), purpose: 'ticket' },
          '24h'
        );
      }
      return bObj;
    });

    return ApiResponse.success(res, 'Current bookings retrieved', {
      bookings: enriched,
      count: enriched.length,
    });
  }

  if (type === 'previous') {
    const skip = (page - 1) * limit;
    const query = {
      user: userId,
      status: { $in: ['completed', 'cancelled', 'expired'] },
    };

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('site', 'name address area hourlyRate')
        .populate('slot', 'slotNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    return ApiResponse.success(res, 'Previous bookings retrieved', {
      bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  }

  // Default: Return both current and previous
  const [currentBookings, previousBookings] = await Promise.all([
    Booking.find({
      user: userId,
      status: { $in: ['booked', 'active'] },
    })
      .populate('site', 'name address area postalCode hourlyRate minimumCharge location')
      .populate('slot', 'slotNumber status')
      .sort({ createdAt: -1 }),
    Booking.find({
      user: userId,
      status: { $in: ['completed', 'cancelled', 'expired'] },
    })
      .populate('site', 'name address area hourlyRate')
      .populate('slot', 'slotNumber')
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  const enrichedCurrent = currentBookings.map((b) => {
    const bObj = b.toJSON();
    bObj.ticketQrToken = TokenService.generateQRToken(
      { bookingId: b._id.toString(), purpose: 'ticket' },
      '24h'
    );
    return bObj;
  });

  return ApiResponse.success(res, 'User bookings retrieved', {
    current: enrichedCurrent,
    previous: previousBookings,
  });
});

// =========================================================================
// (h) GET SINGLE BOOKING BY ID — used for live status polling on ticket screen
// =========================================================================
export const getBookingById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findOne({ _id: id, user: req.user._id })
    .populate('site', 'name address area hourlyRate minimumCharge')
    .populate('slot', 'slotNumber status');

  if (!booking) return next(AppError.notFound('Booking not found'));

  return ApiResponse.success(res, 'Booking retrieved', { booking });
});

