// /src/pages/api/ws/token.ts
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth/next";
// ATTENZIONE al path: da /pages/api/ws/token.ts a /pages/api/auth/[...nextauth].ts
import { authOptions } from "../auth/[...nextauth]";

const SECRET = process.env.WS_JWT_SECRET || process.env.JWT_SECRET || "dev-ws-secret";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // richiede utente autenticato (cookie di Next-Auth)
  const session = await getServerSession(req, res, authOptions as any).catch(() => null);
  if (!session?.user) return res.status(401).json({ error: "Not authenticated" });

  const user = session.user as { id?: string; name?: string; email?: string };

  const payload = {
    sub: user.id || user.email || "user",
    name: user.name || "Player",
    scope: "ws",
  };

  const token = jwt.sign(payload, SECRET, { expiresIn: "12h" });

  res.status(200).json({ token });
}