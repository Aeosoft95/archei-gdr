// src/lib/dice/roller-d6.ts

export type DicePart = {
  kind: "dice";
  count: number;
  sides: 6;
  rolls: number[];
  sum: number;
  sign: 1 | -1;
};

export type ModPart = {
  kind: "mod";
  value: number;
  sign: 1 | -1;
};

export type PartResult = DicePart | ModPart;

export type RollResult = {
  total: number;
  parts: PartResult[];
};

export type PoolResult = {
  pool: number;          // pool richiesto (Nd6) - solo per info
  thrown: number;        // dadi effettivamente tirati
  threshold: number;     // soglia successi (solo per modalità normale)
  aimed: boolean;        // true = tiro mirato
  target?: number;       // numero mirato 1..6 (mirato)
  rolls: number[];       // risultati dei d6 tirati
  successes: number;     // conteggio successi
  sum: number;           // somma aritmetica dei dadi tirati
};

function rnd1d6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function parseD6Pool(input: string): number | undefined {
  const s = input.trim().toLowerCase();
  const m = s.match(/^(\d+)\s*d\s*6$/i);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

export function thresholdForPool(pool: number): number {
  if (pool <= 5)  return 6; // 1–5 → 6+
  if (pool <= 10) return 5; // 6–10 → 5+
  if (pool <= 20) return 4; // 11–20 → 4+
  return 3;                 // 21+ → 3+
}

/**
 * Tira un pool di d6.
 * - Normale: thrown = min(pool, 5); successi = roll >= soglia fissa per range
 * - Mirato:  thrown = aimedCount (clamp 1..5, default 1); successi = roll == target
 */
export function rollD6Pool(
  pool: number,
  opts?: { aimed?: boolean; target?: number; aimedCount?: number }
): PoolResult {
  const aimed = !!opts?.aimed;
  const target = opts?.target && Number.isFinite(opts.target)
    ? Math.max(1, Math.min(6, Math.floor(opts.target)))
    : undefined;

  const thrown = aimed
    ? Math.max(1, Math.min(5, Math.floor(opts?.aimedCount ?? 1)))
    : (pool <= 5 ? pool : 5);

  const rolls: number[] = Array.from({ length: thrown }, rnd1d6);
  const sum = rolls.reduce((a, b) => a + b, 0);

  if (aimed) {
    const tgt = target ?? 6;
    const successes = rolls.filter(v => v === tgt).length;
    return {
      pool, thrown,
      threshold: thresholdForPool(pool), // informativo
      aimed: true, target: tgt,
      rolls, successes, sum,
    };
  }

  const thr = thresholdForPool(pool);
  const successes = rolls.filter(v => v >= thr).length;
  return { pool, thrown, threshold: thr, aimed: false, rolls, successes, sum };
}

export function fmtPoolResult(r: PoolResult): string {
  const diceStr = `[${r.rolls.join(",")}]`;
  const succLbl = r.successes === 1 ? "successo" : "successi";

  if (r.aimed) {
    const tgt = r.target ?? 6;
    return `mirato ${tgt} con ${r.thrown}d6 ${diceStr} → ${r.successes} ${succLbl}`;
  }
  return `pool ${r.pool}d6 → ${r.thrown}d6 ${diceStr} · soglia ${r.threshold}+ → ${r.successes} ${succLbl}`;
}

/** Facoltativo: formule aritmetiche tipo "2d6+3" (non usa successi) */
export function rollArithmeticExpression(formula: string): RollResult {
  const tokens = formula.replace(/\s+/g, "").match(/[+-]?\d+d6|[+-]?\d+/gi);
  if (!tokens) throw new Error("Formula non valida");

  const parts: PartResult[] = [];
  let total = 0;

  for (const t of tokens) {
    if (/^[+-]?\d+d6$/i.test(t)) {
      const sign: 1 | -1 = t.startsWith("-") ? -1 : 1;
      const m = t.match(/(\d+)\s*d\s*6/i);
      const count = m ? parseInt(m[1], 10) : 1;
      const rolls: number[] = Array.from({ length: count }, rnd1d6);
      const sum = rolls.reduce((a, b) => a + b, 0);
      parts.push({ kind: "dice", count, sides: 6, rolls, sum, sign });
      total += sign * sum;
    } else if (/^[+-]?\d+$/i.test(t)) {
      const value = parseInt(t, 10);
      const sign: 1 | -1 = value < 0 ? -1 : 1;
      parts.push({ kind: "mod", value: Math.abs(value), sign });
      total += value;
    } else {
      throw new Error(`Token non riconosciuto: ${t}`);
    }
  }

  return { total, parts };
}