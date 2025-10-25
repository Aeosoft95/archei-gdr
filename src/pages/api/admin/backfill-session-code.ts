import type { NextApiRequest, NextApiResponse } from "next";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (req.query.secret !== process.env.ADMIN_TASK_SECRET) return res.status(401).json({ error: "Unauthorized" });

  await connectMongo();

  const r = await Session.updateMany(
    {
      $or: [{ code: { $exists: false } }, { code: null }, { code: "" }],
      inviteCode: { $exists: true, $ne: "" },
    },
    [{ $set: { code: "$inviteCode" } }]
  );

  // Compatibilità tra driver recenti (matchedCount/modifiedCount) e vecchi (n/nModified)
  const anyR = r as any;
  const matched = typeof anyR.matchedCount === "number" ? anyR.matchedCount : (anyR.n ?? 0);
  const modified = typeof anyR.modifiedCount === "number" ? anyR.modifiedCount : (anyR.nModified ?? 0);

  return res.status(200).json({ matched, modified });
}