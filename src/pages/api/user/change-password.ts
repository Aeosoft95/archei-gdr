import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";
import bcrypt from "bcrypt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: "Not authenticated" });

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });

  await connectMongo();
  const userId = (session.user as any).id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return res.status(403).json({ error: "Current password is incorrect" });

  const hash = await bcrypt.hash(newPassword, 12);
  user.password = hash;
  await user.save();

  return res.status(200).json({ ok: true });
}
