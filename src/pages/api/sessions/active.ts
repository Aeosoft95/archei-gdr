import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";

export const config = { runtime: "nodejs" };

// Criteri "attive":
// - visibilità: public
// - oppure private ma dell'utente loggato
// - opzionale: future-first (date >= now) o recenti
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as any)?.id;

  try {
    await connectMongo();

    const now = new Date();
    const $or: any[] = [{ visibility: "public" }];
    if (userId) $or.push({ ownerId: userId });

    // se usi il campo "date", mostriamo prima le future, altrimenti ordina per createdAt
    const query: any = { $or };
    // se vuoi solo future:
    // query.date = { $gte: now };

    const items = await Session
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(20)
      .lean();

    const data = items.map(s => ({
      id: String(s._id),
      title: s.title,
      visibility: s.visibility,
      ownerId: String(s.ownerId),
      date: s.date ?? null,
      createdAt: s.createdAt,
    }));

    return res.status(200).json({ items: data });
  } catch (err) {
    console.error("active sessions error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
