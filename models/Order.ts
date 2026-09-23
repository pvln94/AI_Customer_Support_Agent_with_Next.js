// LAYMAN: The orders table — product, dates, price, delivery/payment/refund status per order; the policy engine judges refunds off these rows (read by order tools; filled by scripts/seed.ts).
import mongoose, { Schema } from "mongoose";
import { cleanJSON } from "./Customer";

const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    productCategory: {
      type: String,
      enum: ["electronics", "apparel", "home", "digital", "final_sale"],
      required: true,
    },
    purchaseDate: { type: Date, required: true },
    price: { type: Number, required: true }, // integer cents
    currency: { type: String, default: "USD" },
    orderStatus: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "failed"],
      required: true,
    },
    refundStatus: {
      type: String,
      enum: ["none", "pending_review", "refunded"],
      default: "none",
    },
    productCondition: {
      type: String,
      enum: ["as_delivered", "defective", "damaged_on_arrival", "customer_damaged"],
      default: "as_delivered",
    },
  },
  { timestamps: true, toJSON: { transform: cleanJSON } }
);

export const OrderModel =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);
