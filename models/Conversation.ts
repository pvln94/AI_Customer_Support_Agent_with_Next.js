// Saved chats — one row per conversation with the verified customer and the user/assistant messages (read/written by lib/agent/loop.ts; shown on the admin conversations tab).
import mongoose, { Schema } from "mongoose";
import { cleanJSON } from "./Customer";

// WHY: store only user/assistant text, not raw tool transcripts (privacy + size).
const MessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new Schema(
  {
    conversationId: { type: String, required: true, unique: true },
    verifiedCustomerId: { type: String },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true, toJSON: { transform: cleanJSON } }
);

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
