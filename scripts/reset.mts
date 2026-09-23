// The fresh-start button — wipes agent logs and saved chats (customers, orders and fixtures stay); run with `npm run reset`.
import mongoose from "mongoose";
import { AgentLogModel } from "../models/AgentLog";
import { ConversationModel } from "../models/Conversation";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI missing. Copy .env.example to .env.local first.");
  process.exit(1);
}
await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
const logs = await AgentLogModel.deleteMany({});
const convos = await ConversationModel.deleteMany({});
console.log(`Reset complete — deleted ${logs.deletedCount} logs and ${convos.deletedCount} conversations.`);
await mongoose.disconnect();
