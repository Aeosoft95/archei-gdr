import type { NextApiRequest, NextApiResponse } from "next";
import { connectMongo } from "../../lib/mongodb";
import User from "../../models/User";

export const config = { runtime: "nodejs" };

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectMongo();
    const count = await User.estimatedDocumentCount();
    res.status(200).json({ ok: true, count });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err?.name || "Error",
      message: err?.message || "Unknown",
    });
  }
}