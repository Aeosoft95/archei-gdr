import mongoose from "mongoose";

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return mongoose.connection;
  const url = process.env.DB_URL as string;
  if (!url) throw new Error("DB_URL is not set");
  return mongoose.connect(url);
}
