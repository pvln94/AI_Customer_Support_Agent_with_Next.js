// The bouncer for all incoming data — defines the allowed shapes of chat messages, tool arguments and admin queries in one place (used by API routes and tools).
import { z } from "zod";

// WHY: one zod source keeps /api/chat, tools, and admin routes consistent.

export const chatRequestSchema = z.object({
  conversationId: z.string().min(1).max(100).optional(),
  message: z.string().min(1, "Message is required").max(1000, "Max 1000 chars"),
});

export const identifyCustomerSchema = z.object({
  customerId: z.string().min(1).max(50),
  email: z.string().email().max(200),
});

export const orderIdSchema = z.object({
  orderId: z.string().min(1).max(50),
});

export const submitRefundSchema = z.object({
  orderId: z.string().min(1).max(50),
  reason: z.string().min(1).max(500),
});

export const escalateSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const adminLogsQuerySchema = z.object({
  eventType: z.string().optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  requestId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  before: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
