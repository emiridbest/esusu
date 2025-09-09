import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

// Ensure schemas do not buffer operations waiting for connection
// This avoids 10s "buffering timed out" errors and surfaces connection issues early
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

// User Schema
export interface IUser extends Document {
  walletAddress: string;
  email?: string;
  phone?: string;
  profileData: {
    firstName?: string;
    lastName?: string;
    country?: string;
    preferredCurrency?: string;
  };
  savings: {
    totalSaved: number;
    aaveDeposits: number;
    currentAPY: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  walletAddress: { type: String, required: true, unique: true, index: true },
  email: { type: String, sparse: true, unique: true },
  phone: { type: String, sparse: true },
  profileData: {
    firstName: String,
    lastName: String,
    country: String,
    preferredCurrency: { type: String, default: 'USD' }
  },
  savings: {
    totalSaved: { type: Number, default: 0 },
    aaveDeposits: { type: Number, default: 0 },
    currentAPY: { type: Number, default: 0 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

// Transaction Schema - Comprehensive transaction management
export interface ITransaction extends Document {
  user: Types.ObjectId;
  transactionHash: string; // Blockchain transaction hash
  type: 'savings' | 'withdrawal' | 'utility_payment' | 'group_contribution' | 'group_payout';
  subType?: 'airtime' | 'data' | 'electricity' | 'aave_deposit' | 'aave_withdrawal';
  amount: number;
  token: string;
  status: 'pending' | 'confirmed' | 'failed' | 'completed';
  blockchainStatus: {
    confirmed: boolean;
    blockNumber?: number;
    confirmations: number;
  };
  utilityDetails?: {
    recipient: string;
    provider: string;
    country: string;
    metadata: any;
  };
  aaveDetails?: {
    aaveTransactionHash?: string;
    underlyingAsset: string;
    apy: number;
  };
  groupDetails?: {
    groupId: Types.ObjectId;
    contributionRound: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  transactionHash: { type: String, required: true, unique: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['savings', 'withdrawal', 'utility_payment', 'group_contribution', 'group_payout'],
    index: true 
  },
  subType: { 
    type: String, 
    enum: ['airtime', 'data', 'electricity', 'aave_deposit', 'aave_withdrawal'] 
  },
  amount: { type: Number, required: true },
  token: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'confirmed', 'failed', 'completed'], 
    default: 'pending',
    index: true 
  },
  blockchainStatus: {
    confirmed: { type: Boolean, default: false },
    blockNumber: Number,
    confirmations: { type: Number, default: 0 }
  },
  utilityDetails: {
    recipient: String,
    provider: String,
    country: String,
    metadata: Schema.Types.Mixed
  },
  aaveDetails: {
    aaveTransactionHash: String,
    underlyingAsset: String,
    apy: Number
  },
  groupDetails: {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    contributionRound: Number
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

// Group Schema - 5-member thrift groups
export interface IGroup extends Document {
  name: string;
  description?: string;
  members: {
    user: Types.ObjectId;
    joinedAt: Date;
    role: 'admin' | 'member';
    isActive: boolean;
  }[];
  settings: {
    contributionAmount: number;
    contributionToken: string;
    contributionInterval: 'weekly' | 'monthly';
    startDate: Date;
    maxMembers: number;
  };
  currentRound: number;
  status: 'forming' | 'active' | 'completed' | 'paused';
  payoutSchedule: {
    round: number;
    recipient: Types.ObjectId;
    scheduledDate: Date;
    payoutDate?: Date;
    amount: number;
    status: 'pending' | 'paid' | 'missed';
  }[];
  totalContributions: number;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>({
  name: { type: String, required: true },
  description: String,
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    isActive: { type: Boolean, default: true }
  }],
  settings: {
    contributionAmount: { type: Number, required: true },
    contributionToken: { type: String, required: true },
    contributionInterval: { type: String, enum: ['weekly', 'monthly'], required: true },
    startDate: { type: Date, required: true },
    maxMembers: { type: Number, default: 5, max: 5 }
  },
  currentRound: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['forming', 'active', 'completed', 'paused'], 
    default: 'forming',
    index: true 
  },
  payoutSchedule: [{
    round: { type: Number, required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledDate: { type: Date, required: true },
    payoutDate: Date,
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'missed'], default: 'pending' }
  }],
  totalContributions: { type: Number, default: 0 }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

// Notification Schema
export interface INotification extends Document {
  user: Types.ObjectId;
  type: 'contribution_due' | 'payout_received' | 'bill_payment_success' | 'bill_payment_failed' | 'group_invitation' | 'savings_milestone';
  title: string;
  message: string;
  data?: any;
  channels: {
    email: { sent: boolean; sentAt?: Date; };
    sms: { sent: boolean; sentAt?: Date; };
    push: { sent: boolean; sentAt?: Date; };
  };
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: ['contribution_due', 'payout_received', 'bill_payment_success', 'bill_payment_failed', 'group_invitation', 'savings_milestone'],
    index: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: Schema.Types.Mixed,
  channels: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    }
  },
  read: { type: Boolean, default: false, index: true }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

// Analytics Schema
export interface IAnalytics extends Document {
  user: Types.ObjectId;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: Date;
  metrics: {
    totalSavings: number;
    savingsGrowth: number;
    aaveEarnings: number;
    utilitySpent: number;
    groupContributions: number;
    groupPayouts: number;
    transactionCount: number;
  };
  createdAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  period: { type: String, required: true, enum: ['daily', 'weekly', 'monthly', 'yearly'], index: true },
  date: { type: Date, required: true, index: true },
  metrics: {
    totalSavings: { type: Number, default: 0 },
    savingsGrowth: { type: Number, default: 0 },
    aaveEarnings: { type: Number, default: 0 },
    utilitySpent: { type: Number, default: 0 },
    groupContributions: { type: Number, default: 0 },
    groupPayouts: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

// Payment Hash Tracking - Prevent transaction replay attacks
export interface IPaymentHash extends Document {
  transactionHash: string;
  used: boolean;
  usedAt?: Date;
  amount: number;
  token: string;
  user: Types.ObjectId;
  createdAt: Date;
}

const PaymentHashSchema = new Schema<IPaymentHash>({
  transactionHash: { type: String, required: true, unique: true, index: true },
  used: { type: Boolean, default: false, index: true },
  usedAt: Date,
  amount: { type: Number, required: true },
  token: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

// Export models
export const User = models.User || model<IUser>('User', UserSchema);
export const Transaction = models.Transaction || model<ITransaction>('Transaction', TransactionSchema);
export const Group = models.Group || model<IGroup>('Group', GroupSchema);
export const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);
export const Analytics = models.Analytics || model<IAnalytics>('Analytics', AnalyticsSchema);
export const PaymentHash = models.PaymentHash || model<IPaymentHash>('PaymentHash', PaymentHashSchema);

// Thrift Group Metadata Schema - off-chain metadata for on-chain groups
export interface IThriftGroupMetadata extends Document {
  contractAddress: string;
  groupId: number;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ThriftGroupMetadataSchema = new Schema<IThriftGroupMetadata>({
  contractAddress: { type: String, required: true, index: true },
  groupId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

// Ensure uniqueness per chain/contract and group id
ThriftGroupMetadataSchema.index({ contractAddress: 1, groupId: 1 }, { unique: true });

export const ThriftGroupMetadata = models.ThriftGroupMetadata 
  || model<IThriftGroupMetadata>('ThriftGroupMetadata', ThriftGroupMetadataSchema);

 // Add indexes for performance
  TransactionSchema.index({ 'user': 1, 'createdAt': -1 });
  TransactionSchema.index({ 'type': 1, 'status': 1 });
  GroupSchema.index({ 'members.user': 1 });
  NotificationSchema.index({ 'user': 1, 'read': 1, 'createdAt': -1 });
  AnalyticsSchema.index({ 'user': 1, 'period': 1, 'date': -1 });
