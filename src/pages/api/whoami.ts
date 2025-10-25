import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const s = await getServerSession(req, res, authOptions);
  res.status(200).json({
    ok: !!s?.user,
    user: s?.user || null,
    id: (s?.user as any)?.id || null,
    node: process.version,
  });
}
