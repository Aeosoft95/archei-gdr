// src/pages/api/sessions/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";
import crypto from "crypto";
import mongoose from "mongoose";

export const config = { runtime: "nodejs", api: { bodyParser: true } };

function genInviteCode() {
  return crypto
    .randomBytes(4)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase();
}

function extractPayload(req: NextApiRequest) {
  const b = (req.body ?? {}) as Record<string, any>;
  const rawTitle =
    typeof b.title === "string"
      ? b.title
      : typeof b.name === "string"
      ? b.name
      : typeof b.sessionTitle === "string"
      ? b.sessionTitle
      : "";
  const title = rawTitle.trim();
  const description = typeof b.description === "string" ? b.description : "";
  const date = b.date ? new Date(b.date) : undefined;

  let maxPlayers = Number.isFinite(Number(b.maxPlayers)) ? Number(b.maxPlayers) : 5;
  if (maxPlayers < 1) maxPlayers = 1;
  if (maxPlayers > 50) maxPlayers = 50;

  const tags = Array.isArray(b.tags)
    ? b.tags.map(String)
    : typeof b.tags === "string"
    ? b.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const visibility = b.visibility === "public" ? "public" : "private";

  return { title, description, date, maxPlayers, tags, visibility };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { title, description, date, maxPlayers, tags, visibility } = extractPayload(req);
  if (!title) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).json({ error: "Titolo obbligatorio" });
  }

  try {
    await connectMongo();

    // Pre-genera un codice, verifica collisione, poi prova a creare con retry su 11000
    let inviteCode = genInviteCode();
    for (let i = 0; i < 4; i++) {
      const exists = await Session.exists({ inviteCode });
      if (!exists) break;
      inviteCode = genInviteCode();
    }

    let created: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await Session.create({
          title,
          description,
          date,
          maxPlayers,
          tags,
          visibility,
          ownerId: new mongoose.Types.ObjectId(userId),
          inviteCode,
          participants: [new mongoose.Types.ObjectId(userId)],
        });
        break; // ok
      } catch (e: any) {
        if (e?.code === 11000 && e?.keyPattern?.inviteCode) {
          // collisione unica: rigenera e riprova
          inviteCode = genInviteCode();
          continue;
        }
        throw e;
      }
    }

    if (!created) throw new Error("Impossibile creare la sessione");

    res.setHeader("Cache-Control", "no-store");
    return res.status(201).json({ id: String(created._id), inviteCode: created.inviteCode });
  } catch (err: any) {
    console.error("create session error:", err?.name, err?.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "Internal error" });
  }
}
