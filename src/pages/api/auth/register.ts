import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcrypt";
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  await connectMongo();

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: String(email).toLowerCase(),
    password: hash,
    name: name || String(email).split("@")[0]
  });

  return res.status(201).json({ ok: true, id: user._id });
}
