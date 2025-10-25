// src/pages/api/user/change-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";
import bcrypt from "bcryptjs"; // <-- bcryptjs

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });

  try {
    await connectMongo();

    // recupera utente dalla sessione/jwt come fai di solito
    // esempio placeholder (adatta alla tua auth):
    const userId = (req as any).user?.id || (req as any).token?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select("+password");
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid current password" });

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("change-password error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
