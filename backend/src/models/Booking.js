import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for booking'],
      index: true,
    },
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSite',
      required: [true, 'Parking site is required'],
      index: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSlot',
      required: [true, 'Parking slot is required'],
      index: true,
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['booked', 'active', 'completed', 'cancelled', 'expired'],
      default: 'booked',
      index: true,
    },
    bookedFrom: {
      type: Date,
      default: Date.now,
      required: true,
    },
    bookedUntil: {
      type: Date,
      required: [true, 'Booking end time is required'],
    },
    entryTime: {
      type: Date,
      default: null,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Amount cannot be negative'],
    },
    paymentMode: {
      type: String,
      enum: ['wallet', 'cash', 'mixed'],
      default: 'wallet',
    },
    createdBy: {
      type: String,
      enum: ['user', 'handler'],
      default: 'user',
    },
    handler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for common queries (history, active slots)
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ site: 1, status: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);

