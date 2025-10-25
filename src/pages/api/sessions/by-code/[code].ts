import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { connectMongo } from "../../../../lib/mongodb";
import Session from "../../../../models/Session";
import mongoose from "mongoose";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const s = await getServerSession(req, res, authOptions);
  const userId = (s?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const code = String(req.query.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "Missing code" });

  await connectMongo();
  const doc = await Session.findOne({ inviteCode: code }).lean();

  if (!doc) return res.status(404).json({ error: "Not found" });

  const ownerId = String(doc.ownerId);
  const isGM = ownerId === String(userId);

  return res.status(200).json({
    id: String(doc._id),
    title: doc.title,
    description: doc.description || "",
    date: doc.date ?? null,
    maxPlayers: doc.maxPlayers ?? 5,
    tags: doc.tags ?? [],
    visibility: doc.visibility,
    inviteCode: doc.inviteCode,
    ownerId,
    participants: (doc.participants || []).map((p: mongoose.Types.ObjectId) => String(p)),
    me: { id: String(userId), isGM },
  });
}