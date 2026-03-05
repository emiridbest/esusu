import mongoose, { Schema, Document, models, model, Model } from 'mongoose';

export interface IFaceVerificationLog extends Document {
  address: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  extra?: any;
}

const FaceVerificationLogSchema = new Schema<IFaceVerificationLog>({
  address: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true },
  success: { type: Boolean, required: true },
  error: { type: String },
  extra: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: false
});

export const FaceVerificationLog: Model<IFaceVerificationLog> = models.FaceVerificationLog || model<IFaceVerificationLog>('FaceVerificationLog', FaceVerificationLogSchema);
