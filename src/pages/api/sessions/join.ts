import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session, { type ISession } from "../../../models/Session";
import mongoose from "mongoose";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const s = await getServerSession(req, res, authOptions);
  const userId = (s?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body ?? {};
  const raw = String(body.code || body.inviteCode || "").trim().toUpperCase();
  if (!raw) return res.status(400).json({ error: "Invite code mancante" });

  await connectMongo();

  // Trova la sessione per inviteCode (nuovo) o code (vecchio)
  const doc = await Session.findOne({
    $or: [{ inviteCode: raw }, { code: raw }],
  })
    .select("_id ownerId inviteCode code participants banned maxPlayers visibility title")
    .lean<ISession>();

  if (!doc) return res.status(404).json({ error: "Sessione non trovata" });

  const uid = new mongoose.Types.ObjectId(userId);

  // bannato?
  const bannedList = (doc as any).banned as mongoose.Types.ObjectId[] | undefined;
  if (Array.isArray(bannedList) && bannedList.some((b) => String(b) === String(uid))) {
    return res.status(403).json({ error: "Sei stato bannato da questa sessione" });
  }

  // già dentro?
  const participants = (doc.participants ?? []) as mongoose.Types.ObjectId[];
  const alreadyIn = participants.some((p) => String(p) === String(uid));

  // limite posti (il GM è sempre dentro come owner, ma controlliamo comunque maxPlayers per i join)
  const max = doc.maxPlayers ?? 5;
  if (!alreadyIn && participants.length >= max) {
    return res.status(400).json({ error: "Sessione piena" });
  }

  if (!alreadyIn) {
    await Session.updateOne(
      { _id: doc._id },
      { $addToSet: { participants: uid } }
    );
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    id: String(doc._id),
    inviteCode: (doc.inviteCode || doc.code || "").toUpperCase(),
    path: `/table/${(doc.inviteCode || doc.code || "").toUpperCase()}`,
  });
}