import cron from 'node-cron';
import { Booking } from '../models/Booking.js';
import { ParkingSlot } from '../models/ParkingSlot.js';

/**
 * Sweeps for bookings that were never checked into within the grace period or past bookedUntil
 * Marks them as 'expired' and atomically releases their reserved slots back to 'available'
 */
export const expireStaleBookings = async () => {
  try {
    const now = new Date();
    const graceMinutes = parseInt(process.env.BOOKING_GRACE_PERIOD_MINUTES || '30', 10);
    const graceThreshold = new Date(now.getTime() - graceMinutes * 60 * 1000);

    // Find bookings that have exceeded the grace period or passed bookedUntil
    const staleBookings = await Booking.find({
      status: 'booked',
      entryTime: null,
      $or: [
        { bookedUntil: { $lt: now } },
        { bookedFrom: { $lt: graceThreshold } },
      ],
    });

    if (staleBookings.length === 0) {
      return 0;
    }

    console.log(`[ExpireJob] Found ${staleBookings.length} stale booking(s) to expire.`);

    for (const booking of staleBookings) {
      booking.status = 'expired';
      await booking.save();

      // Release slot back to available
      if (booking.slot) {
        await ParkingSlot.findByIdAndUpdate(booking.slot, { status: 'available' });
      }
      console.log(`[ExpireJob] Expired booking #${booking._id} and released slot #${booking.slot}`);
    }

    return staleBookings.length;
  } catch (error) {
    console.error('[ExpireJob] Error expiring stale bookings:', error.message);
    return 0;
  }
};

/**
 * Initializes cron scheduler to run every minute
 */
export const initExpireBookingsJob = () => {
  // Runs every minute
  const task = cron.schedule('* * * * *', async () => {
    await expireStaleBookings();
  });

  console.log('[Scheduler] Booking auto-expiry job initialized (runs every minute).');
  return task;
};

