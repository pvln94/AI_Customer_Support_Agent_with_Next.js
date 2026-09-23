// The refund records table — every decision ever made, with a database-level rule blocking two active refunds for one order (written by the submit tool; shown on the admin refunds tab).
import mongoose, { Schema } from "mongoose";
import { cleanJSON } from "./Customer";

const RefundRequestSchema = new Schema(
  {
    refundRequestId: { type: String, required: true, unique: true },
    customerId: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    reason: { type: String, required: true },
    eligibilityStatus: { type: String, default: "" },
    decision: { type: String, enum: ["approved", "denied", "escalated"], required: true },
    reasonCode: { type: String, required: true },
    decisionReason: { type: String, required: true },
    status: {
      type: String,
      enum: ["simulated_processed", "denied", "pending_human_review", "failed"],
      required: true,
    },
    isActive: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { transform: cleanJSON } }
);

// WHY: the database itself rejects a second active refund for an order.
// Set isActive=true only for simulated_processed and pending_human_review.
RefundRequestSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export const RefundRequestModel =
  mongoose.models.RefundRequest ||
  mongoose.model("RefundRequest", RefundRequestSchema);
