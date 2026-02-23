import mongoose, { Schema, Document } from 'mongoose';
import type { IUser } from '@evient/shared';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    avatarUrl: String,
    phoneNumber: String,
    facebookUrl: String,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    address: String,
    dateOfBirth: Date,
    passwordHistory: [{
      changedAt: { type: Date, required: true },
      reason: {
        type: String,
        enum: ['register', 'reset', 'admin_update', 'self_update'],
        required: true,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for admin user listing
userSchema.index({ role: 1, isActive: 1 });

// Text index for search
userSchema.index({ fullName: 'text', email: 'text' });

export const User = mongoose.model<IUserDocument>('User', userSchema);
