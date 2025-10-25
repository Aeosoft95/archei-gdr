import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";
import crypto from "crypto";

export const config = { runtime: "nodejs" };

function genInviteCode() {
  // 6 caratteri, maiuscole/senza confusione
  return crypto.randomBytes(4).toString("base64").replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { title, description, date, maxPlayers, tags, visibility } = req.body || {};
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Titolo obbligatorio" });
  }

  try {
    await connectMongo();

    const created = await Session.create({
      title: title.trim(),
      description: typeof description === "string" ? description : "",
      date: date ? new Date(date) : undefined,
      maxPlayers: maxPlayers ? Number(maxPlayers) : 5,
      tags: Array.isArray(tags) ? tags.map((t) => String(t)) : [],
      visibility: visibility === "public" ? "public" : "private",
      ownerId: userId,
      inviteCode: genInviteCode(),
      participants: [userId], // opzionale: il GM conta come presente
    });

    // niente cache
    res.setHeader("Cache-Control", "no-store");

    return res.status(201).json({
      id: String(created._id),
      inviteCode: created.inviteCode
    });
  } catch (err: any) {
    console.error("create session error:", err?.message || err);
    return res.status(500).json({ error: "Internal error" });
  }
}
