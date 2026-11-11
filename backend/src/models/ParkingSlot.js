import mongoose from 'mongoose';

const parkingSlotSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSite',
      required: [true, 'Parking site reference is required'],
      index: true,
    },
    slotNumber: {
      type: String,
      required: [true, 'Slot number is required'],
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'occupied', 'disabled'],
      default: 'available',
      index: true,
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

// Unique compound index on (site, slotNumber)
parkingSlotSchema.index({ site: 1, slotNumber: 1 }, { unique: true });

export const ParkingSlot = mongoose.model('ParkingSlot', parkingSlotSchema);

