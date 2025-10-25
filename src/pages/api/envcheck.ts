import type { NextApiRequest, NextApiResponse } from "next";

export const config = { runtime: "nodejs" };

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const uri = process.env.DATABASE_URL || "";
  const m = uri.match(/^mongodb\+srv:\/\/([^:]+):[^@]+@([^/]+)/);
  res.status(200).json({
    ok: Boolean(uri),
    user: m?.[1] || null,
    host: m?.[2] || null,
  });
}
