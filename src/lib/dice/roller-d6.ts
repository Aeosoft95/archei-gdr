// Solo d6, con sintassi: Xd6, Xd6+N, Xd6-N (spazi consentiti, case-insensitive)
// Esempi validi: "1d6", "2D6+1", "  4d6 - 2  "

export type DicePart = {
  type: "dice";
  count: number;      // numero di d6 lanciati
  sides: 6;           // fisso a 6
  rolls: number[];    // risultati singoli
  sum: number;        // somma dei risultati
  mod?: number;       // eventuale modificatore integrato in questo blocco
};

export type ModPart = {
  type: "mod";
  value: number;      // modificatore finale
};

export type PartResult = DicePart | ModPart;

export type RollResult = {
  total: number;
  parts: PartResult[];
  text: string;       // stringa leggibile (es. "2d6+1 [3,6]=9 +1 = 10")
};

// ---------------------------------------------------------------

const RE = /^\s*(\d+)\s*[dD]\s*(\d+)\s*(?:([+-])\s*(\d+)\s*)?$/;

function rand1to6(): number {
  // Math.random semplice va benissimo per un VTT
  return 1 + Math.floor(Math.random() * 6);
}

/**
 * Effettua il lancio per una espressione basata SOLO su d6.
 * Accetta "Xd6", "Xd6+N", "Xd6-N".
 */
export function rollD6Expression(expr: string): RollResult {
  const m = RE.exec(expr);
  if (!m) {
    throw new Error("Formula non valida (usa solo Xd6±N)");
  }

  const count = Math.max(1, parseInt(m[1], 10));
  const sides = parseInt(m[2], 10);
  if (sides !== 6) {
    throw new Error("Sono supportati solo d6");
  }

  const sign = m[3]; // "+" | "-" | undefined
  const modNum = m[4] ? parseInt(m[4], 10) : 0;
  const modifier = sign ? (sign === "+" ? modNum : -modNum) : 0;

  // lanci
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rand1to6());
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;

  const parts: PartResult[] = [
    { type: "dice", count, sides: 6, rolls, sum },
  ];
  if (modifier !== 0) parts.push({ type: "mod", value: modifier });

  // testo leggibile
  const base = `${count}d6`;
  const modTxt = modifier === 0 ? "" : (modifier > 0 ? `+${modifier}` : `${modifier}`);
  const detail = `[${rolls.join(",")}]=${sum}`;
  const text =
    `${base}${modTxt} ${detail}` +
    (modifier !== 0 ? ` ${modifier > 0 ? `+${modifier}` : `${modifier}`} = ${total}` : ` = ${total}`);

  return { total, parts, text };
}