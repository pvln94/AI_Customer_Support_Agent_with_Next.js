// lib/mongodb.ts
import mongoose from "mongoose";

// WHY: Next.js hot reload creates new module instances; caching the promise
// on globalThis avoids opening a new MongoDB connection per reload.
declare global {
  var __mongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Copy .env.example to .env.local and set it (default mongodb://localhost:27017/refund-agent)."
    );
  }
  if (!global.__mongoosePromise) {
    // Short timeout so a down DB fails fast with a clear error, not a hang.
    global.__mongoosePromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  return global.__mongoosePromise;
}

// Server-side only guard: importing this file from client components is a bug.
if (typeof window !== "undefined") {
  throw new Error("lib/mongodb.ts is server-only; do not import it in client components.");
}
