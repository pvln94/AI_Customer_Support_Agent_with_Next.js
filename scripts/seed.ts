// The fixture loader — fills the database with 15 fake customers and 25 orders covering every demo scenario; safe to re-run anytime via `npm run seed` (writes to all tables except logs).
// Seed script: npm run seed (tsx --env-file=.env.local scripts/seed.ts)
// WHY: dates are relative to now so demo scenarios stay valid over time.
import mongoose from "mongoose";
import { CustomerModel } from "../models/Customer";
import { OrderModel } from "../models/Order";
import { RefundRequestModel } from "../models/RefundRequest";
import { AgentLogModel } from "../models/AgentLog";
import { ConversationModel } from "../models/Conversation";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const customers = [
  { customerId: "CUST-001", name: "Priya Nair", email: "priya.nair@example.test", accountStatus: "active" },
  { customerId: "CUST-002", name: "Marcus Lee", email: "marcus.lee@example.test", accountStatus: "active" },
  { customerId: "CUST-003", name: "Elena Rossi", email: "elena.rossi@example.test", accountStatus: "active" },
  { customerId: "CUST-004", name: "Tom Becker", email: "tom.becker@example.test", accountStatus: "active" },
  { customerId: "CUST-005", name: "Aisha Khan", email: "aisha.khan@example.test", accountStatus: "active" },
  { customerId: "CUST-006", name: "Diego Alvarez", email: "diego.alvarez@example.test", accountStatus: "active" },
  { customerId: "CUST-007", name: "Hannah Wolf", email: "hannah.wolf@example.test", accountStatus: "active" },
  { customerId: "CUST-008", name: "Liam O'Connor", email: "liam.oconnor@example.test", accountStatus: "active" },
  { customerId: "CUST-009", name: "Sofia Petrov", email: "sofia.petrov@example.test", accountStatus: "suspended" },
  { customerId: "CUST-010", name: "Ravi Menon", email: "ravi.menon@example.test", accountStatus: "active" },
  { customerId: "CUST-011", name: "Grace Kim", email: "grace.kim@example.test", accountStatus: "active" },
  { customerId: "CUST-012", name: "Omar Haddad", email: "omar.haddad@example.test", accountStatus: "active" },
  { customerId: "CUST-013", name: "Nina Fischer", email: "nina.fischer@example.test", accountStatus: "active" },
  { customerId: "CUST-014", name: "Ben Carter", email: "ben.carter@example.test", accountStatus: "active" },
  { customerId: "CUST-015", name: "Yuki Tanaka", email: "yuki.tanaka@example.test", accountStatus: "active" },
];

type O = Parameters<typeof OrderModel.create>[0];
// Use `any` spread helper to keep seed readable.
const orders: Record<string, unknown>[] = [
  { orderId: "ORD-1001", customerId: "CUST-001", productName: "Headphones", productCategory: "electronics", purchaseDate: daysAgo(8), price: 12900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1002", customerId: "CUST-002", productName: "Blender", productCategory: "home", purchaseDate: daysAgo(62), price: 8900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1003", customerId: "CUST-003", productName: "Keyboard", productCategory: "electronics", purchaseDate: daysAgo(10), price: 14900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "refunded", productCondition: "as_delivered" },
  { orderId: "ORD-1004", customerId: "CUST-004", productName: "Monitor", productCategory: "electronics", purchaseDate: daysAgo(12), price: 32900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "damaged_on_arrival" },
  { orderId: "ORD-1005", customerId: "CUST-005", productName: "Jacket", productCategory: "apparel", purchaseDate: daysAgo(31), price: 19900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1006", customerId: "CUST-006", productName: "Lamp", productCategory: "home", purchaseDate: daysAgo(5), price: 4500, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1007", customerId: "CUST-006", productName: "Sneakers", productCategory: "apparel", purchaseDate: daysAgo(40), price: 12000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1008", customerId: "CUST-006", productName: "E-book reader", productCategory: "electronics", purchaseDate: daysAgo(3), price: 22000, currency: "USD", orderStatus: "shipped", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1009", customerId: "CUST-006", productName: "Mug set", productCategory: "home", purchaseDate: daysAgo(9), price: 3500, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1010", customerId: "CUST-007", productName: "Chair", productCategory: "home", purchaseDate: daysAgo(6), price: 24900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "pending_review", productCondition: "as_delivered" },
  { orderId: "ORD-1011", customerId: "CUST-008", productName: "Laptop", productCategory: "electronics", purchaseDate: daysAgo(5), price: 149900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1012", customerId: "CUST-009", productName: "Desk organizer", productCategory: "home", purchaseDate: daysAgo(7), price: 6000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1013", customerId: "CUST-010", productName: "Tablet", productCategory: "electronics", purchaseDate: daysAgo(4), price: 39900, currency: "USD", orderStatus: "shipped", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1014", customerId: "CUST-011", productName: "Software license", productCategory: "digital", purchaseDate: daysAgo(3), price: 9900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1015", customerId: "CUST-012", productName: "Vase", productCategory: "home", purchaseDate: daysAgo(9), price: 7000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "customer_damaged" },
  { orderId: "ORD-1016", customerId: "CUST-013", productName: "Coffee maker", productCategory: "home", purchaseDate: daysAgo(50), price: 15900, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "defective" },
  { orderId: "ORD-1017", customerId: "CUST-014", productName: "Backpack", productCategory: "apparel", purchaseDate: daysAgo(6), price: 11000, currency: "USD", orderStatus: "delivered", paymentStatus: "pending", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1018", customerId: "CUST-015", productName: "Scarf", productCategory: "apparel", purchaseDate: daysAgo(6), price: 5500, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1019", customerId: "CUST-015", productName: "Gift card", productCategory: "final_sale", purchaseDate: daysAgo(4), price: 5000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1020", customerId: "CUST-015", productName: "Notebook set", productCategory: "home", purchaseDate: daysAgo(45), price: 4000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  // Extra orders to reach ~25
  { orderId: "ORD-1021", customerId: "CUST-001", productName: "Mouse pad", productCategory: "home", purchaseDate: daysAgo(20), price: 2500, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1022", customerId: "CUST-002", productName: "T-shirt", productCategory: "apparel", purchaseDate: daysAgo(9), price: 3000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1023", customerId: "CUST-004", productName: "USB cable", productCategory: "electronics", purchaseDate: daysAgo(50), price: 1500, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1024", customerId: "CUST-009", productName: "Pen set", productCategory: "home", purchaseDate: daysAgo(2), price: 2000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
  { orderId: "ORD-1025", customerId: "CUST-013", productName: "Kettle", productCategory: "home", purchaseDate: daysAgo(15), price: 8000, currency: "USD", orderStatus: "delivered", paymentStatus: "paid", refundStatus: "none", productCondition: "as_delivered" },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("ERROR: MONGODB_URI missing. Copy .env.example to .env.local and set it.");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch {
    console.error("ERROR: cannot reach MongoDB at", uri);
    console.error("Fix: install MongoDB Community Server locally, or set an Atlas URI in .env.local (Compass can connect to either).");
    process.exit(1);
  }
  console.log("Connected to", uri);

  for (const c of customers) {
    await CustomerModel.findOneAndUpdate({ customerId: c.customerId }, { $set: c }, { upsert: true });
  }
  console.log(`Upserted ${customers.length} customers.`);

  for (const o of orders) {
    await OrderModel.findOneAndUpdate({ orderId: o.orderId }, { $set: o as O }, { upsert: true });
  }
  console.log(`Upserted ${orders.length} orders.`);

  // Historical rows: CUST-003 already refunded; CUST-007 has an active pending request.
  await RefundRequestModel.deleteMany({ orderId: { $in: ["ORD-1003", "ORD-1010"] } });
  await OrderModel.findOneAndUpdate({ orderId: "ORD-1003" }, { $set: { refundStatus: "refunded" } });
  await OrderModel.findOneAndUpdate({ orderId: "ORD-1010" }, { $set: { refundStatus: "pending_review" } });
  await RefundRequestModel.create({
    refundRequestId: "RR-SEED-1003",
    customerId: "CUST-003",
    orderId: "ORD-1003",
    reason: "seed: previously refunded",
    eligibilityStatus: "APPROVED",
    decision: "approved",
    reasonCode: "APPROVED",
    decisionReason: "Seed historical refund (simulated).",
    status: "simulated_processed",
    isActive: true,
  });
  await RefundRequestModel.create({
    refundRequestId: "RR-SEED-1010",
    customerId: "CUST-007",
    orderId: "ORD-1010",
    reason: "seed: pending review",
    eligibilityStatus: "ESCALATE_HIGH_VALUE",
    decision: "escalated",
    reasonCode: "ESCALATE_HIGH_VALUE",
    decisionReason: "Seed pending review.",
    status: "pending_human_review",
    isActive: true,
  });
  console.log("Seed refund requests ready (ORD-1003 refunded, ORD-1010 pending review).");

  // Keep demo DB tidy but do not wipe user chat history blindly: clear only seed-run logs marker.
  await AgentLogModel.deleteMany({ "metadata.seed": true }).catch(() => {});
  await ConversationModel.deleteMany({ conversationId: /^seed-/ }).catch(() => {});

  console.log("SUCCESS: seed complete — 15 customers, ~25 orders.");
  await mongoose.disconnect();
}

main().catch((e: unknown) => {
  console.error("Seed failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
