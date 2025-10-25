// src/pages/api/sessions/join.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";
import mongoose from "mongoose";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const s = await getServerSession(req, res, authOptions);
  const userId = (s?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: "Invalid user id" });

  const body = req.body ?? {};
  const codeInput: string = String(body.code || body.inviteCode || "").trim().toUpperCase();
  if (!codeInput) return res.status(400).json({ error: "Codice invito mancante" });

  await connectMongo();

  // compat: cerchiamo sia su inviteCode che su code (vecchio indice unico)
  const session = await Session.findOne({
    $or: [{ inviteCode: codeInput }, { code: codeInput }],
  })
    .select("_id title ownerId inviteCode code participants maxPlayers visibility")
    .lean();

  if (!session) return res.status(404).json({ error: "Sessione non trovata" });

  // se già presente tra i partecipanti, ok
  const uid = new mongoose.Types.ObjectId(userId);
  const alreadyIn = (session.participants || []).some((p: any) => String(p) === String(uid));

  if (!alreadyIn) {
    await Session.updateOne(
      { _id: session._id },
      { $addToSet: { participants: uid } }
    );
  }

  const inviteCode = (session.inviteCode || session.code || "").toUpperCase();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    id: String(session._id),
    inviteCode,
    path: `/table/${inviteCode}`,
  });
}