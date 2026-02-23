import mongoose, { Schema, Document } from 'mongoose';
import type { IOtpCode } from '@evient/shared';

export interface IOtpDocument extends Omit<IOtpCode, '_id'>, Document {}

const otpSchema = new Schema<IOtpDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['register', 'login', 'reset_password'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },  // TTL index: auto-delete when expired
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for OTP lookup
otpSchema.index({ email: 1, code: 1, type: 1 });

export const OtpCode = mongoose.model<IOtpDocument>('OtpCode', otpSchema);
