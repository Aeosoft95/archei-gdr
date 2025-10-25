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
    // ⚠️ Il DB viene già specificato dentro l'URI di Atlas.
    conn = await mongoose.connect(MONGODB_URI);
    console.log("✅ WS connesso a MongoDB");
    return conn;
  } catch (err) {
    console.error("❌ Errore connessione Mongo:", err);
    throw err;
  }
}
