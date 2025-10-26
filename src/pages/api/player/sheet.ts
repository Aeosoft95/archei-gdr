// src/pages/api/player/sheet.ts
import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE_NAME = "pcData";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(req: NextApiRequest): any | null {
  try {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw) return null;
    // Il valore è URI-encoded per sicurezza
    const json = decodeURIComponent(raw);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function writeCookie(res: NextApiResponse, data: any) {
  try {
    const json = JSON.stringify(data);
    const value = encodeURIComponent(json);
    // Cookie persistente, visibile solo lato HTTP
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${value}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax`);
  } catch {
    // in caso di errore, niente cookie
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const saved = readCookie(req);
    return res.status(200).json({ ok: true, data: saved ?? null });
  }

  if (req.method === "POST") {
    const body = req.body;
    // accetta sia { data: ... } che payload diretto
    const payload = body?.data ?? body ?? null;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, message: "Invalid payload" });
    }
    writeCookie(res, payload);
    return res.status(200).json({ ok: true, data: payload });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, message: "Method Not Allowed" });
}