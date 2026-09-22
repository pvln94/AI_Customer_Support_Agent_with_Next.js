import mongoose, { Schema } from "mongoose";

// WHY: shared transform removes Mongo internals so API responses use business IDs.

export function cleanJSON(_doc: unknown, ret: Record<string, unknown>) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

const CustomerSchema = new Schema(
  {
    customerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String },
    accountStatus: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true, toJSON: { transform: cleanJSON } }
);

export const CustomerModel =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
