import type { NextApiRequest, NextApiResponse } from "next";

export const config = { runtime: "nodejs" };

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    ok: true,
    service: "next-api",
    node: process.version,
    hasDbUrl: Boolean(process.env.DATABASE_URL),
  });
}