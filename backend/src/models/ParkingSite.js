import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    // [longitude, latitude]
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates [lng, lat] are required'],
      validate: {
        validator: function (val) {
          return (
            Array.isArray(val) &&
            val.length === 2 &&
            val[0] >= -180 &&
            val[0] <= 180 &&
            val[1] >= -90 &&
            val[1] <= 90
          );
        },
        message: 'Coordinates must be valid [longitude (-180 to 180), latitude (-90 to 90)]',
      },
    },
  },
  { _id: false }
);

const parkingSiteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Parking site name is required'],
      trim: true,
      maxlength: 120,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true,
      index: true,
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
      index: true,
    },
    location: {
      type: pointSchema,
      required: [true, 'GeoJSON location is required'],
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0, 'Hourly rate cannot be negative'],
    },
    minimumCharge: {
      type: Number,
      required: [true, 'Minimum charge is required'],
      min: [0, 'Minimum charge cannot be negative'],
    },
    totalSlots: {
      type: Number,
      default: 0,
      min: [0, 'Total slots cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// 2dsphere index for geospatial queries ($near, $geoWithin)
parkingSiteSchema.index({ location: '2dsphere' });

export const ParkingSite = mongoose.model('ParkingSite', parkingSiteSchema);

