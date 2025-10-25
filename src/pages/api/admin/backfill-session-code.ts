import type { NextApiRequest, NextApiResponse } from "next";
import { connectMongo } from "../../../lib/mongodb";
import Session from "../../../models/Session";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (req.query.secret !== process.env.ADMIN_TASK_SECRET) return res.status(401).json({ error: "Unauthorized" });

  await connectMongo();

  // allinea i documenti che hanno inviteCode valorizzato ma code nullo/assente
  const r = await Session.updateMany(
    { $or: [{ code: { $exists: false } }, { code: null }, { code: "" }], inviteCode: { $exists: true, $ne: "" } },
    [{ $set: { code: "$inviteCode" } }]
  );

  res.status(200).json({ matched: r.matchedCount ?? r.n, modified: r.modifiedCount ?? r.nModified });
}