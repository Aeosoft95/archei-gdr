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
  const where = "POST /api/sessions/create";
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const session = await getServerSession(req, res, authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      console.error(`[${where}] 401 – no user in session`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = extractPayload(req);
    if (!payload.title) {
      console.warn(`[${where}] 400 – missing title`, { bodyKeys: Object.keys(req.body ?? {}) });
      return res.status(400).json({ error: "Titolo obbligatorio" });
    }

    await connectMongo();

    // pre-check: userId deve essere un ObjectId valido
    if (!mongoose.isValidObjectId(userId)) {
      console.error(`[${where}] 400 – invalid userId ObjectId`, { userId });
      return res.status(400).json({ error: "Invalid user id" });
    }

    // genera un inviteCode (con pre-check collisioni)
    let inviteCode = genInviteCode();
    for (let i = 0; i < 4; i++) {
      const exists = await Session.exists({ inviteCode });
      if (!exists) break;
      inviteCode = genInviteCode();
    }

    // tenta la creazione con retry su eventuale duplicato dell’unico
    let created: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await Session.create({
          title: payload.title,
          description: payload.description,
          date: payload.date,
          maxPlayers: payload.maxPlayers,
          tags: payload.tags,
          visibility: payload.visibility,
          ownerId: new mongoose.Types.ObjectId(userId),
          inviteCode,
          participants: [new mongoose.Types.ObjectId(userId)],
        });
        break;
      } catch (e: any) {
        // duplicate inviteCode
        if (e?.code === 11000 && e?.keyPattern?.inviteCode) {
          console.warn(`[${where}] duplicate inviteCode, retry`, { inviteCode });
          inviteCode = genInviteCode();
          continue;
        }
        throw e;
      }
    }

    if (!created) {
      console.error(`[${where}] 500 – create returned null`);
      return res.status(500).json({ error: "Internal error" });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(201).json({ id: String(created._id), inviteCode: created.inviteCode });
  } catch (err: any) {
    // LOG DETTAGLIATO
    const info = {
      name: err?.name,
      code: err?.code,
      message: err?.message,
      keyPattern: err?.keyPattern,
      errors: err?.errors ? Object.keys(err.errors) : undefined,
    };
    console.error("[create session error]", info);

    res.setHeader("Cache-Control", "no-store");

    // restituiamo dettaglio SOLO fuori da production per debug
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) {
      return res.status(500).json({ error: "Internal error", details: info });
    }
    return res.status(500).json({ error: "Internal error" });
  }
}
