import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import { signToken } from "../../../server/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: "Not authenticated" });

  const user = {
    id: (session.user as any).id,
    name: session.user.name || session.user.email || "User"
  };
  const token = signToken(user);
  res.status(200).json({ token, user });
}
