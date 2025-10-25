// server/db/mongo.ts
import mongoose from "mongoose";

/**
 * Connessione centralizzata a MongoDB per il server WS
 */
const MONGODB_URI = process.env.DATABASE_URL!;
let conn: typeof mongoose | null = null;

export async function connectMongo() {
  if (conn) return conn;
  if (!MONGODB_URI) throw new Error("DATABASE_URL non impostato");

  try {
    conn = await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGO_DBNAME || undefined,
    });
    console.log("✅ WS connesso a MongoDB");
    return conn;
  } catch (err) {
    console.error("❌ Errore connessione Mongo:", err);
    throw err;
  }
}
