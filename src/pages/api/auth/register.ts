// src/pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs"; // <-- bcryptjs
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

  try {
    await connectMongo();

    const normalized = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: normalized });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10); // <-- bcryptjs
    const created = await User.create({
      email: normalized,
      password: hash,
      name: name || "",
    });

    return res.status(201).json({ id: String(created._id), email: created.email, name: created.name });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
