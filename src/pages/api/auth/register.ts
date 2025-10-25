import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    await connectMongo();

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "User exists" });

    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({ email: email.toLowerCase(), password: hash, name: name || "" });

    return res.status(200).json({ id: String(u._id), email: u.email });
  } catch (e) {
    console.error("register error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
