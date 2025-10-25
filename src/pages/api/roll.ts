import type { NextApiRequest, NextApiResponse } from "next";
import { singleRoll, opposedRoll } from "../../lib/dice";

export const config = { runtime: "nodejs" };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const b = (req.body ?? {}) as any;
    const mode = b.mode === "opposed" ? "opposed" : "single";

    if (mode === "single") {
      const { theor, real, precision, target } = b;
      if (!Number.isFinite(theor) || theor <= 0) return res.status(400).json({ error: "Invalid 'theor'" });
      const result = singleRoll({ theor: Number(theor), real: real != null ? Number(real) : undefined, precision, target });
      return res.status(200).json({ mode, result });
    }

    // opposed
    const atk = b.attacker || {};
    const def = b.defender || {};
    if (!Number.isFinite(atk.theor) || atk.theor <= 0) return res.status(400).json({ error: "Invalid attacker.theor" });
    if (!Number.isFinite(def.theor) || def.theor <= 0) return res.status(400).json({ error: "Invalid defender.theor" });

    const result = opposedRoll(
      { theor: Number(atk.theor), real: atk.real != null ? Number(atk.real) : undefined, precision: atk.precision },
      { theor: Number(def.theor), real: def.real != null ? Number(def.real) : undefined, precision: def.precision }
    );
    return res.status(200).json({ mode, result });
  } catch (e: any) {
    return res.status(500).json({ error: "Internal error", details: e?.message });
  }
}