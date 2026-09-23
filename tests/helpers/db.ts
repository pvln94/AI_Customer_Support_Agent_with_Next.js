// Test helper that spins up a throwaway in-memory database so tests never touch your real demo data (used by the integration and agent tests).
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// WHY: mongodb-memory-server binary may fail to download; fall back to MONGODB_TEST_URI.
export async function startTestDB() {
  let uri = process.env.MONGODB_TEST_URI;
  let mongod: MongoMemoryServer | null = null;
  if (!uri) {
    try {
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    } catch {
      uri = process.env.MONGODB_URI;
      if (!uri) throw new Error("No test DB: set MONGODB_TEST_URI or MONGODB_URI.");
    }
  }
  try {
    await mongoose.disconnect();
  } catch {}
  (global as unknown as { __mongoosePromise?: unknown }).__mongoosePromise = undefined;
  process.env.MONGODB_URI = uri;
  const { connectDB } = await import("@/lib/mongodb");
  await connectDB();
  return async () => {
    await mongoose.disconnect();
    (global as unknown as { __mongoosePromise?: unknown }).__mongoosePromise = undefined;
    if (mongod) await mongod.stop();
  };
}

export async function clearDB() {
  const { CustomerModel } = await import("@/models/Customer");
  const { OrderModel } = await import("@/models/Order");
  const { RefundRequestModel } = await import("@/models/RefundRequest");
  const { AgentLogModel } = await import("@/models/AgentLog");
  const { ConversationModel } = await import("@/models/Conversation");
  await Promise.all([
    CustomerModel.deleteMany({}),
    OrderModel.deleteMany({}),
    RefundRequestModel.deleteMany({}),
    AgentLogModel.deleteMany({}),
    ConversationModel.deleteMany({}),
  ]);
}
