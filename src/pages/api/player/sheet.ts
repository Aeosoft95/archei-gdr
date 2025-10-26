// src/pages/api/player/sheet.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { EMPTY_PC, type PCData } from "@/types/character";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // TODO: caricare la scheda dell’utente autenticato
    return res.status(200).json({ data: EMPTY_PC });
  }

  if (req.method === "POST") {
    // TODO: validare e salvare la scheda
    const body = req.body as PCData | undefined;
    if (!body) return res.status(400).json({ error: "Missing body" });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}