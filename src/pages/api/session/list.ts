import type { NextApiRequest, NextApiResponse } from "next";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    await connectMongo();
    const docs = await Session.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      sessions: docs.map((d) => ({
        id: String(d._id),
        name: d.name,
        description: d.description || "",
        maxPlayers: d.maxPlayers,
        playersCount: d.playersCount,
        code: d.code
      }))
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to load sessions" });
  }
}
