// src/pages/api/sessions/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";
import mongoose from "mongoose";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const s = await getServerSession(req, res, authOptions);
  const userId = (s?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  if (!id || typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  await connectMongo();

  const doc = await Session.findById(id).select("_id ownerId");
  if (!doc) return res.status(404).json({ error: "Not found" });

  if (String(doc.ownerId) !== String(userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await Session.deleteOne({ _id: doc._id });

  // TODO: in futuro broadcast WS a chi è nella stanza
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
}