import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";

function genCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // senza confondenti
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function genUniqueCode() {
  // riprova finché non è unico (limite sicurezza 20 tentativi)
  for (let i = 0; i < 20; i++) {
    const code = genCode(6);
    const exists = await Session.findOne({ code }).lean();
    if (!exists) return code;
  }
  throw new Error("Unable to generate unique code");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: "Not authenticated" });

  const { name, maxPlayers, description } = req.body || {};
  if (!name || !maxPlayers) return res.status(400).json({ error: "Missing fields" });

  try {
    await connectMongo();
    const code = await genUniqueCode();

    const doc = await Session.create({
      name: String(name).trim(),
      description: description ? String(description) : undefined,
      maxPlayers: Number(maxPlayers),
      code,
      ownerId: (session.user as any).id,
      playersCount: 1,
      isActive: true
    });

    return res.status(201).json({
      ok: true,
      session: {
        id: String(doc._id),
        name: doc.name,
        description: doc.description,
        maxPlayers: doc.maxPlayers,
        playersCount: doc.playersCount,
        code: doc.code,
        isActive: doc.isActive,
        createdAt: doc.createdAt
      }
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Failed to create session" });
  }
}
