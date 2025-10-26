import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]";
import jwt from "jsonwebtoken";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const user = session?.user as any;
  if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

  const SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!SECRET) return res.status(500).json({ error: "Missing JWT secret" });

  // dati minimi per il WS
  const payload = { id: user.id, name: user.name, email: user.email };
  const token = jwt.sign(payload, SECRET, { expiresIn: "12h" });

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ token });
}