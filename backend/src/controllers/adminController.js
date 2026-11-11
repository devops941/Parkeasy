import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ParkingSite } from '../models/ParkingSite.js';
import { ParkingSlot } from '../models/ParkingSlot.js';
import { Booking } from '../models/Booking.js';
import { Transaction } from '../models/Transaction.js';
import { Feedback } from '../models/Feedback.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// =========================================================================
// 1. HANDLER MANAGEMENT
// =========================================================================

export const createHandler = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, assignedSite } = req.body;

  // Check duplicate email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(AppError.conflict('An account with this email already exists'));
  }

  // Validate assignedSite if provided
  if (assignedSite) {
    const siteExists = await ParkingSite.findById(assignedSite);
    if (!siteExists) {
      return next(AppError.notFound('Assigned parking site not found'));
    }
  }

  const passwordHash = await User.hashPassword(password);

  const handler = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: 'handler',
    assignedSite: assignedSite || null,
    walletBalance: 0,
    isActive: true,
  });

  return ApiResponse.created(res, 'Handler created successfully', { handler });
});

export const getHandlers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, siteId, isActive } = req.query;

  const query = { role: 'handler' };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (siteId) {
    query.assignedSite = siteId;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [handlers, total] = await Promise.all([
    User.find(query)
      .populate('assignedSite', 'name area address hourlyRate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return ApiResponse.success(res, 'Handlers retrieved successfully', {
    handlers,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

export const getHandlerById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const handler = await User.findOne({ _id: id, role: 'handler' }).populate(
    'assignedSite',
    'name area address totalSlots hourlyRate'
  );

  if (!handler) {
    return next(AppError.notFound('Handler not found'));
  }

  return ApiResponse.success(res, 'Handler fetched successfully', { handler });
});

export const updateHandler = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, phone, password, assignedSite, isActive } = req.body;

  const handler = await User.findOne({ _id: id, role: 'handler' });
  if (!handler) {
    return next(AppError.notFound('Handler not found'));
  }

  if (assignedSite !== undefined) {
    if (assignedSite !== null) {
      const site = await ParkingSite.findById(assignedSite);
      if (!site) {
        return next(AppError.notFound('Assigned parking site not found'));
      }
    }
    handler.assignedSite = assignedSite;
  }

  if (name) handler.name = name;
  if (phone) handler.phone = phone;
  if (isActive !== undefined) handler.isActive = isActive;

  if (password) {
    handler.passwordHash = await User.hashPassword(password);
    handler.refreshToken = null; // Invalidate session
  }

  await handler.save();

  return ApiResponse.success(res, 'Handler updated successfully', { handler });
});

export const deleteHandler = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const handler = await User.findOne({ _id: id, role: 'handler' });
  if (!handler) {
    return next(AppError.notFound('Handler not found'));
  }

  // Soft delete: deactivate and unassign site
  handler.isActive = false;
  handler.assignedSite = null;
  handler.refreshToken = null;
  await handler.save();

  return ApiResponse.success(res, 'Handler deactivated successfully');
});

// =========================================================================
// 2. PARKING SITES MANAGEMENT (WITH AUTO SLOT GENERATION)
// =========================================================================

export const createSite = asyncHandler(async (req, res) => {
  const {
    name,
    address,
    area,
    postalCode,
    latitude,
    longitude,
    hourlyRate,
    minimumCharge,
    totalSlots,
  } = req.body;

  // Create Parking Site document
  const site = await ParkingSite.create({
    name,
    address,
    area,
    postalCode,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON [lng, lat]
    },
    hourlyRate,
    minimumCharge,
    totalSlots,
    isActive: true,
  });

  // Automatically generate slots: S-01, S-02, ... S-N
  const slotsToCreate = [];
  for (let i = 1; i <= totalSlots; i++) {
    const slotNumber = `S-${String(i).padStart(2, '0')}`;
    slotsToCreate.push({
      site: site._id,
      slotNumber,
      status: 'available',
    });
  }

  await ParkingSlot.insertMany(slotsToCreate);

  return ApiResponse.created(res, 'Parking site and slots created successfully', {
    site,
    slotsCreatedCount: slotsToCreate.length,
  });
});

export const getSites = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, isActive } = req.query;

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { area: { $regex: search, $options: 'i' } },
      { postalCode: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [sites, total] = await Promise.all([
    ParkingSite.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ParkingSite.countDocuments(query),
  ]);

  // Aggregate slot statistics for each site
  const siteIds = sites.map((s) => s._id);
  const slotStats = await ParkingSlot.aggregate([
    { $match: { site: { $in: siteIds } } },
    {
      $group: {
        _id: { site: '$site', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Map slot counts onto site records
  const sitesWithSlotStats = sites.map((site) => {
    const siteObj = site.toJSON();
    siteObj.slotBreakdown = {
      available: 0,
      reserved: 0,
      occupied: 0,
      disabled: 0,
    };
    slotStats.forEach((stat) => {
      if (stat._id.site.toString() === site._id.toString()) {
        siteObj.slotBreakdown[stat._id.status] = stat.count;
      }
    });
    return siteObj;
  });

  return ApiResponse.success(res, 'Parking sites retrieved successfully', {
    sites: sitesWithSlotStats,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

export const getSiteById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const site = await ParkingSite.findById(id);
  if (!site) {
    return next(AppError.notFound('Parking site not found'));
  }

  // Get assigned handlers & slot summary
  const [handlers, slots] = await Promise.all([
    User.find({ assignedSite: id, role: 'handler' }, 'name email phone isActive'),
    ParkingSlot.find({ site: id }).sort({ slotNumber: 1 }),
  ]);

  const slotBreakdown = {
    available: 0,
    reserved: 0,
    occupied: 0,
    disabled: 0,
  };
  slots.forEach((s) => {
    slotBreakdown[s.status] = (slotBreakdown[s.status] || 0) + 1;
  });

  return ApiResponse.success(res, 'Parking site details fetched', {
    site,
    slotBreakdown,
    handlers,
    slots,
  });
});

export const updateSite = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    address,
    area,
    postalCode,
    latitude,
    longitude,
    hourlyRate,
    minimumCharge,
    totalSlots,
    isActive,
  } = req.body;

  const site = await ParkingSite.findById(id);
  if (!site) {
    return next(AppError.notFound('Parking site not found'));
  }

  if (name) site.name = name;
  if (address) site.address = address;
  if (area) site.area = area;
  if (postalCode) site.postalCode = postalCode;
  if (hourlyRate !== undefined) site.hourlyRate = hourlyRate;
  if (minimumCharge !== undefined) site.minimumCharge = minimumCharge;
  if (isActive !== undefined) site.isActive = isActive;

  if (latitude !== undefined && longitude !== undefined) {
    site.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }

  // Handle totalSlots increase automatically
  if (totalSlots && totalSlots > site.totalSlots) {
    const slotsToAdd = [];
    const currentTotal = site.totalSlots;
    for (let i = currentTotal + 1; i <= totalSlots; i++) {
      slotsToAdd.push({
        site: site._id,
        slotNumber: `S-${String(i).padStart(2, '0')}`,
        status: 'available',
      });
    }
    await ParkingSlot.insertMany(slotsToAdd);
    site.totalSlots = totalSlots;
  }

  await site.save();

  return ApiResponse.success(res, 'Parking site updated successfully', { site });
});

export const deleteSite = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const site = await ParkingSite.findById(id);
  if (!site) {
    return next(AppError.notFound('Parking site not found'));
  }

  // Check if there are active or booked reservations
  const activeBookingsCount = await Booking.countDocuments({
    site: id,
    status: { $in: ['booked', 'active'] },
  });

  if (activeBookingsCount > 0) {
    return next(
      AppError.badRequest(
        `Cannot deactivate site: There are currently ${activeBookingsCount} active/booked parking sessions`
      )
    );
  }

  await ParkingSlot.deleteMany({ site: id });
  await ParkingSite.findByIdAndDelete(id);

  return ApiResponse.success(res, 'Parking site and all its slots permanently deleted');
});

// =========================================================================
// 3. INDIVIDUAL SLOTS MANAGEMENT
// =========================================================================

export const getSiteSlots = asyncHandler(async (req, res, next) => {
  const { siteId } = req.params;
  const { status } = req.query;

  const site = await ParkingSite.findById(siteId);
  if (!site) {
    return next(AppError.notFound('Parking site not found'));
  }

  const query = { site: siteId };
  if (status) {
    query.status = status;
  }

  const slots = await ParkingSlot.find(query).sort({ slotNumber: 1 });

  return ApiResponse.success(res, 'Slots fetched successfully', {
    siteId,
    siteName: site.name,
    totalSlots: slots.length,
    slots,
  });
});

export const createSlot = asyncHandler(async (req, res, next) => {
  const { siteId } = req.params;
  const { slotNumber, status = 'available' } = req.body;

  const site = await ParkingSite.findById(siteId);
  if (!site) {
    return next(AppError.notFound('Parking site not found'));
  }

  const existingSlot = await ParkingSlot.findOne({ site: siteId, slotNumber });
  if (existingSlot) {
    return next(AppError.conflict(`Slot number ${slotNumber} already exists in this parking site`));
  }

  const slot = await ParkingSlot.create({
    site: siteId,
    slotNumber,
    status,
  });

  // Increment totalSlots on site
  await ParkingSite.findByIdAndUpdate(siteId, { $inc: { totalSlots: 1 } });

  return ApiResponse.created(res, 'Parking slot added successfully', { slot });
});

export const updateSlot = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { slotNumber, status } = req.body;

  const slot = await ParkingSlot.findById(id);
  if (!slot) {
    return next(AppError.notFound('Slot not found'));
  }

  // If slot is occupied or reserved and attempting to disable or make available
  if (
    (slot.status === 'occupied' || slot.status === 'reserved') &&
    (status === 'disabled' || status === 'available')
  ) {
    const hasActiveBooking = await Booking.findOne({
      slot: id,
      status: { $in: ['booked', 'active'] },
    });
    if (hasActiveBooking) {
      return next(
        AppError.badRequest(
          `Cannot modify slot status: It is currently held by active booking #${hasActiveBooking._id}`
        )
      );
    }
  }

  if (slotNumber && slotNumber !== slot.slotNumber) {
    const duplicate = await ParkingSlot.findOne({
      site: slot.site,
      slotNumber,
      _id: { $ne: id },
    });
    if (duplicate) {
      return next(AppError.conflict(`Slot number ${slotNumber} already exists in this site`));
    }
    slot.slotNumber = slotNumber;
  }

  if (status) slot.status = status;
  await slot.save();

  return ApiResponse.success(res, 'Slot updated successfully', { slot });
});

export const deleteSlot = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const slot = await ParkingSlot.findById(id);
  if (!slot) {
    return next(AppError.notFound('Slot not found'));
  }

  if (slot.status === 'occupied' || slot.status === 'reserved') {
    return next(AppError.badRequest('Cannot delete a slot that is currently reserved or occupied'));
  }

  const siteId = slot.site;
  await ParkingSlot.findByIdAndDelete(id);

  // Decrement totalSlots on site
  await ParkingSite.findByIdAndUpdate(siteId, { $inc: { totalSlots: -1 } });

  return ApiResponse.success(res, 'Slot deleted successfully');
});

// =========================================================================
// 4. USERS MANAGEMENT
// =========================================================================

export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role = 'user', isActive } = req.query;

  const query = {};
  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { vehicleNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return ApiResponse.success(res, 'Users retrieved successfully', {
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

export const getUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  // Get user's recent bookings & transactions
  const [recentBookings, recentTransactions] = await Promise.all([
    Booking.find({ user: id })
      .populate('site', 'name area')
      .populate('slot', 'slotNumber')
      .sort({ createdAt: -1 })
      .limit(5),
    Transaction.find({ user: id }).sort({ createdAt: -1 }).limit(5),
  ]);

  return ApiResponse.success(res, 'User profile fetched successfully', {
    user,
    recentBookings,
    recentTransactions,
  });
});

export const toggleUserStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  if (user.role === 'admin') {
    return next(AppError.badRequest('Admin account status cannot be deactivated through this endpoint'));
  }

  user.isActive = !user.isActive;
  if (!user.isActive) {
    user.refreshToken = null; // Terminate active session
  }
  await user.save();

  return ApiResponse.success(
    res,
    `User account has been ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    { user }
  );
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  if (user.role === 'admin') {
    return next(AppError.badRequest('Admin accounts cannot be deleted'));
  }

  const activeBookings = await Booking.countDocuments({
    user: id,
    status: { $in: ['booked', 'active'] },
  });

  if (activeBookings > 0) {
    return next(
      AppError.badRequest(
        `Cannot delete user: they have ${activeBookings} active/booked parking session(s)`
      )
    );
  }

  await User.findByIdAndDelete(id);

  return ApiResponse.success(res, 'User account permanently deleted');
});

// =========================================================================
// 5. DASHBOARD TOTALS & STATS
// =========================================================================

export const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const [
    totalUsers,
    totalHandlers,
    totalSites,
    activeSites,
    slotStatusCounts,
    activeBookingsCount,
    completedBookingsCount,
    bookingRevenueAllTime,
    bookingRevenueToday,
    bookingRevenueMonth,
    parkingTxAllTime,
    parkingTxToday,
    parkingTxMonth,
    rechargeAllTime,
    rechargeToday,
    rechargeMonth,
    recentBookings,
    recentTransactions,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'handler', isActive: true }),
    ParkingSite.countDocuments(),
    ParkingSite.countDocuments({ isActive: true }),
    ParkingSlot.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Booking.countDocuments({ status: { $in: ['booked', 'active'] } }),
    Booking.countDocuments({ status: 'completed' }),

    // Completed Bookings revenue
    Booking.aggregate([
      { $match: { amount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.aggregate([
      {
        $match: {
          amount: { $gt: 0 },
          $or: [{ exitTime: { $gte: startOfDay } }, { updatedAt: { $gte: startOfDay } }, { createdAt: { $gte: startOfDay } }],
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.aggregate([
      {
        $match: {
          amount: { $gt: 0 },
          $or: [{ exitTime: { $gte: startOfMonth } }, { updatedAt: { $gte: startOfMonth } }, { createdAt: { $gte: startOfMonth } }],
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // Parking Transactions revenue
    Transaction.aggregate([
      { $match: { type: 'parking', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'parking', status: 'completed', createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'parking', status: 'completed', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // Wallet Recharge Transactions
    Transaction.aggregate([
      { $match: { type: 'recharge', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'recharge', status: 'completed', createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'recharge', status: 'completed', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    Booking.find()
      .populate('user', 'name phone vehicleNumber')
      .populate('site', 'name area')
      .populate('slot', 'slotNumber')
      .sort({ createdAt: -1 })
      .limit(5),
    Transaction.find()
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  // Format slots breakdown
  const slotsSummary = {
    total: 0,
    available: 0,
    reserved: 0,
    occupied: 0,
    disabled: 0,
  };

  slotStatusCounts.forEach((item) => {
    slotsSummary[item._id] = item.count;
    slotsSummary.total += item.count;
  });

  // Calculate parking revenue
  const totalParking = Math.max(
    bookingRevenueAllTime[0]?.total || 0,
    parkingTxAllTime[0]?.total || 0
  );
  const todayParking = Math.max(
    bookingRevenueToday[0]?.total || 0,
    parkingTxToday[0]?.total || 0
  );
  const monthParking = Math.max(
    bookingRevenueMonth[0]?.total || 0,
    parkingTxMonth[0]?.total || 0
  );

  const totalRecharge = rechargeAllTime[0]?.total || 0;
  const todayRecharge = rechargeToday[0]?.total || 0;
  const monthRecharge = rechargeMonth[0]?.total || 0;

  // Total system revenue reflects parking operations or wallet inflows if parking is 0
  const totalRevenue = totalParking > 0 ? totalParking : totalRecharge;
  const todayRevenue = todayParking > 0 ? todayParking : todayRecharge;
  const monthRevenue = monthParking > 0 ? monthParking : monthRecharge;

  const revenueData = {
    totalRevenue,
    todayRevenue,
    monthRevenue,
    parkingRevenue: totalParking,
    walletRecharge: totalRecharge,
    totalWalletRecharged: totalRecharge,
    todayRecharge,
    monthRecharge,
  };

  return ApiResponse.success(res, 'Admin dashboard summary retrieved', {
    overview: {
      totalUsers,
      totalHandlers,
      totalSites,
      totalSlots: slotsSummary.total,
      activeBookings: activeBookingsCount,
      completedBookings: completedBookingsCount,
      sites: {
        total: totalSites,
        active: activeSites,
      },
      slots: slotsSummary,
      bookings: {
        active: activeBookingsCount,
        completed: completedBookingsCount,
      },
      financials: revenueData,
    },
    revenue: revenueData,
    recentBookings,
    recentTransactions,
    recentActivity: {
      bookings: recentBookings,
      transactions: recentTransactions,
    },
  });
});

// =========================================================================
// 6. READ-ONLY HISTORY & FEEDBACK WITH DATE FILTERS
// =========================================================================

export const getParkingHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, startDate, endDate, status, siteId, userId } = req.query;

  const query = {};

  if (status) query.status = status;
  if (siteId) query.site = siteId;
  if (userId) query.user = userId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('user', 'name email phone vehicleNumber')
      .populate('site', 'name area address hourlyRate')
      .populate('slot', 'slotNumber')
      .populate('handler', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  return ApiResponse.success(res, 'Parking history retrieved successfully', {
    bookings,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

export const getRechargeHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, startDate, endDate, method, userId, handlerId } = req.query;

  const query = { type: 'recharge' };

  if (method) query.method = method;
  if (userId) query.user = userId;
  if (handlerId) query.handler = handlerId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [recharges, total, totalAmountAgg] = await Promise.all([
    Transaction.find(query)
      .populate('user', 'name email phone vehicleNumber')
      .populate('handler', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(query),
    Transaction.aggregate([
      { $match: query },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]),
  ]);

  return ApiResponse.success(res, 'Recharge history retrieved successfully', {
    recharges,
    summary: {
      totalAmount: totalAmountAgg[0]?.totalAmount || 0,
    },
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

export const getFeedbackList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, startDate, endDate, rating } = req.query;

  const query = {};

  if (rating) query.rating = Number(rating);

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [feedback, total, stats] = await Promise.all([
    Feedback.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Feedback.countDocuments(query),
    Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  return ApiResponse.success(res, 'Feedback list retrieved successfully', {
    feedback,
    summary: {
      averageRating: stats[0]?.avgRating ? Number(stats[0].avgRating.toFixed(2)) : 0,
      totalFeedbacks: stats[0]?.totalCount || 0,
    },
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

