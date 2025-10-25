import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { connectMongo } from "../../../lib/mongodb";
import User from "../../../models/User";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: { sizeLimit: "6mb" } // per immagini base64
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: "Not authenticated" });

  const { imageBase64 } = req.body as { imageBase64?: string };
  if (!imageBase64 || !imageBase64.startsWith("data:image/"))
    return res.status(400).json({ error: "Invalid image" });

  try {
    await connectMongo();

    const userId = (session.user as any).id as string;
    const avatarsDir = path.join(process.cwd(), "public", "avatars");
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

    const ext = imageBase64.substring(imageBase64.indexOf("/") + 1, imageBase64.indexOf(";")); // png|jpeg|webp
    const base64Data = imageBase64.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = path.join(avatarsDir, `${userId}.png`); // salviamo come png
    fs.writeFileSync(filePath, buffer);

    // aggiorna avatarUrl con busting cache
    const avatarUrl = `/avatars/${userId}.png?v=${Date.now()}`;
    await User.findByIdAndUpdate(userId, { avatarUrl });

    return res.status(200).json({ ok: true, avatarUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update avatar" });
  }
}
