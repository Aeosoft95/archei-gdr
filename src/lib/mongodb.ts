// src/lib/mongodb.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.DATABASE_URL!;
if (!MONGODB_URI) throw new Error("DATABASE_URL non impostato");

let cached = (global as any).mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

export async function connectMongo() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(MONGODB_URI).then(m => m);
  cached.conn = await cached.promise;
  return cached.conn;
}
