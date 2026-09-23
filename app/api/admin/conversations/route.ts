// Admin endpoint that returns recent customer chats (called by the AdminDashboard conversations tab).
import { connectDB } from "@/lib/mongodb";
import { ConversationModel } from "@/models/Conversation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const conversations = await ConversationModel.find({}).sort({ updatedAt: -1 }).limit(50).lean();
    return Response.json({ conversations });
  } catch {
    return Response.json({ error: { code: "DB_ERROR", message: "Could not load conversations." } }, { status: 503 });
  }
}
