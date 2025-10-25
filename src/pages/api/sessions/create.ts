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

  try {
    const s = await getServerSession(req, res, authOptions);
    const userId = (s?.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const { title, description, date, maxPlayers, tags, visibility } = extractPayload(req);
    if (!title) return res.status(400).json({ error: "Titolo obbligatorio" });

    await connectMongo();

    // pre-genera codice con check collisione
    let inviteCode = genInviteCode();
    for (let i = 0; i < 4; i++) {
      const exists = await Session.exists({ inviteCode });
      if (!exists) break;
      inviteCode = genInviteCode();
    }

    // create con retry se collisione su inviteCode/code
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
          // compat con indice unico già presente in Atlas
          code: inviteCode,
          inviteCode,
          participants: [new mongoose.Types.ObjectId(userId)],
        });
        break;
      } catch (e: any) {
        // collisione unique su inviteCode o su code
        if (e?.code === 11000 && (e?.keyPattern?.inviteCode || e?.keyPattern?.code)) {
          inviteCode = genInviteCode();
          continue;
        }
        // altro errore
        return res.status(500).json({
          error: "Create failed",
          details: {
            name: e?.name,
            code: e?.code,
            message: e?.message,
            keyPattern: e?.keyPattern,
          },
        });
      }
    }

    if (!created) {
      return res.status(500).json({ error: "Create returned null" });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(201).json({
      id: String(created._id),
      inviteCode: created.inviteCode,
      path: `/table/${created.inviteCode}`, // 👈 URL stanza per redirect immediato
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Internal error",
      details: {
        name: err?.name,
        code: err?.code,
        message: err?.message,
      },
    });
  }
}