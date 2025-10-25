// src/pages/api/sessions/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";
import crypto from "crypto";

export const config = {
  runtime: "nodejs",
  api: { bodyParser: true }, // Next parser JSON & x-www-form-urlencoded
};

function genInviteCode() {
  // 6 caratteri alfanumerici maiuscoli (evita caratteri confondenti)
  return crypto
    .randomBytes(4)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase();
}

// Normalizza e valida input proveniente sia da JSON che da form
function extractPayload(req: NextApiRequest) {
  const b = (req.body ?? {}) as Record<string, any>;

  // compat: title, name, sessionTitle
  const rawTitle =
    typeof b.title === "string"
      ? b.title
      : typeof b.name === "string"
      ? b.name
      : typeof b.sessionTitle === "string"
      ? b.sessionTitle
      : "";

  const title = rawTitle.trim();

  const description =
    typeof b.description === "string" ? b.description : "";

  const date =
    b.date ? new Date(b.date) : undefined;

  let maxPlayers = Number.isFinite(Number(b.maxPlayers))
    ? Number(b.maxPlayers)
    : 5;
  if (maxPlayers < 1) maxPlayers = 1;
  if (maxPlayers > 50) maxPlayers = 50;

  const tags = Array.isArray(b.tags)
    ? b.tags.map(String)
    : typeof b.tags === "string"
    ? b.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const visibility =
    b.visibility === "public" ? "public" : "private";

  const wantRedirect =
    req.query.redirect !== undefined ||
    b.redirect === true ||
    b.redirectDashboard === true;

  const redirectTo =
    typeof req.query.redirect === "string" && req.query.redirect
      ? req.query.redirect
      : "/dashboard";

  return {
    title,
    description,
    date,
    maxPlayers,
    tags,
    visibility,
    wantRedirect,
    redirectTo,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const {
    title,
    description,
    date,
    maxPlayers,
    tags,
    visibility,
    wantRedirect,
    redirectTo,
  } = extractPayload(req);

  if (!title) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).json({ error: "Titolo obbligatorio" });
  }

  try {
    await connectMongo();

    // genera codice invito unico (retry fino a 5 tentativi)
    let inviteCode = "";
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const candidate = genInviteCode();
      const exists = await Session.exists({ inviteCode: candidate });
      if (!exists) {
        inviteCode = candidate;
        break;
      }
    }
    if (!inviteCode) {
      res.setHeader("Cache-Control", "no-store");
      return res
        .status(500)
        .json({ error: "Impossibile generare codice invito" });
    }

    const created = await Session.create({
      title,
      description,
      date,
      maxPlayers,
      tags,
      visibility,
      ownerId: userId,
      inviteCode,
      participants: [userId], // il GM conta come presente
    });

    res.setHeader("Cache-Control", "no-store");

    // Supporta redirect server-side opzionale
    if (wantRedirect) {
      // Next espone res.redirect in API routes; fallback manuale se non presente
      const r: any = res as any;
      if (typeof r.redirect === "function") {
        return r.redirect(303, redirectTo);
      }
      res.statusCode = 303;
      res.setHeader("Location", redirectTo);
      return res.end();
    }

    return res
      .status(201)
      .json({ id: String(created._id), inviteCode: created.inviteCode });
  } catch (err) {
    console.error("create session error:", err);
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "Internal error" });
  }
}
