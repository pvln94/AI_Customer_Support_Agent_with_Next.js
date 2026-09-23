// The agent's diary table — short masked summaries of each step (shown on the admin logs tab; written by lib/logging/logger.ts).
import mongoose, { Schema } from "mongoose";
import { cleanJSON } from "./Customer";

const AgentLogSchema = new Schema(
  {
    requestId: { type: String, required: true, index: true },
    customerId: { type: String, index: true },
    orderId: { type: String },
    eventType: {
      type: String,
      enum: [
        "request_received",
        "intent_identified",
        "tool_selected",
        "tool_started",
        "tool_result",
        "policy_validation",
        "retry",
        "failure",
        "final_decision",
        "escalation",
        "response_sent",
      ],
      required: true,
    },
    toolName: { type: String },
    inputSummary: { type: String },
    outputSummary: { type: String },
    status: { type: String, enum: ["success", "error", "info"], required: true },
    errorMessage: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: false, toJSON: { transform: cleanJSON } }
);

// WHY: admin timeline queries are newest-first by request; these indexes keep them fast.
AgentLogSchema.index({ timestamp: -1 });
AgentLogSchema.index({ eventType: 1, status: 1 });

export const AgentLogModel =
  mongoose.models.AgentLog || mongoose.model("AgentLog", AgentLogSchema);
