// src/pages/api/sessions/mine.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";
import type { ISession } from "../../../models/Session";
import mongoose from "mongoose";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const s = await getServerSession(req, res, authOptions);
  const userId = (s?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await connectMongo();
  const uid = new mongoose.Types.ObjectId(userId);

  const docs = await Session.find({
    $or: [{ ownerId: uid }, { participants: uid }],
  })
    .sort({ updatedAt: -1 })
    .lean<ISession[]>();

  const sessions = docs.map((d) => {
    const isGM = String(d.ownerId) === String(userId);
    return {
      id: String(d._id),
      title: d.title,
      description: d.description || "",
      inviteCode: d.inviteCode,
      code: d.code, // compat
      ownerId: String(d.ownerId),
      participants: (d.participants || []).map((p: any) => String(p)),
      maxPlayers: d.maxPlayers ?? 5,
      isGM,
    };
  });

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ sessions });
}