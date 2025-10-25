import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";
import mongoose from "mongoose";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as any)?.id || null;

  try {
    await connectMongo();

    const or: any[] = [{ visibility: "public" }];
    if (userId) or.push({ ownerId: new mongoose.Types.ObjectId(userId) });

    const items = await Session
      .find({ $or: or })
      .sort({ date: -1, createdAt: -1 })
      .limit(50)
      .lean();

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      items: items.map((s: any) => ({
        id: String(s._id),
        title: s.title,
        description: s.description || "",
        visibility: s.visibility,
        ownerId: String(s.ownerId),
        inviteCode: s.inviteCode,
        playersNow: Array.isArray(s.participants) ? s.participants.length : 0,
        playersMax: s.maxPlayers || 5,
        date: s.date || null,
        createdAt: s.createdAt,
      }))
    });
  } catch (err) {
    console.error("active sessions error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
