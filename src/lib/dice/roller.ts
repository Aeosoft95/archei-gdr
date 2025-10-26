// Tutto d6, come da manuale.
// Forme supportate: d6, Nd6, somma/sottrazione di termini e interi (es. 3d6+2-1+2d6).
// Qualsiasi dado non d6 genera errore.

export type PartResult = {
  count: number;     // N in Nd6
  sides: 6;          // fisso a 6
  rolls: number[];   // risultati individuali
  sum: number;       // somma del termine (prima del segno)
  sign: 1 | -1;      // + o -
};

export type RollOutcome = {
  total: number;
  parts: PartResult[];
  text: string;      // es: "3d6 [4,2,5]=11 + 2d6 [1,6]=7 - 1 = 17"
  expr: string;      // espressione normalizzata
};

/** Lancia un intero tra 1 e 6 */
function d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Pulisce e normalizza: rimuove spazi, mette leading + dove manca */
function normalize(expr: string): string {
  const e = expr.replace(/\s+/g, "").toLowerCase();
  if (!e) throw new Error("Formula vuota");
  // se non inizia con + o -, aggiungi +
  return /^[+-]/.test(e) ? e : "+" + e;
}

/** Parso una formula in termini firmati (+/-). Supporto: Nd6 | d6 | intero */
export function rollDiceExpression(expr: string): RollOutcome {
  const normalized = normalize(expr);

  // split in termini con segno, es: "+3d6" "-2" "+d6" ...
  const terms = normalized.match(/[+-][^+-]+/g);
  if (!terms) throw new Error("Formula non valida");

  const parts: PartResult[] = [];
  let total = 0;
  const chunks: string[] = [];

  for (const term of terms) {
    const sign: 1 | -1 = term[0] === "-" ? -1 : 1;
    const body = term.slice(1);

    // Caso 1: Nd6 oppure d6 (inteso 1d6)
    const m = body.match(/^(\d*)d(\d+)$/);
    if (m) {
      const nStr = m[1];
      const sidesStr = m[2];

      const sides = Number(sidesStr);
      if (sides !== 6) throw new Error("Sono consentiti solo d6.");

      const count = nStr ? Math.max(0, Number(nStr)) : 1;
      if (!Number.isFinite(count) || count < 0) throw new Error("Quantità dadi non valida.");

      const rolls: number[] = [];
      for (let i = 0; i < count; i++) rolls.push(d6());
      const sum = rolls.reduce((a, b) => a + b, 0);

      total += sign * sum;

      parts.push({ count, sides: 6, rolls, sum, sign });

      const label = `${count || 1}d6`;
      const chunk = `${sign < 0 ? "-" : (chunks.length ? "+" : "")}${label} [${rolls.join(",")}]=${sum}`;
      chunks.push(chunk);
      continue;
    }

    // Caso 2: intero (modificatore)
    if (/^\d+$/.test(body)) {
      const mod = Number(body);
      total += sign * mod;

      parts.push({ count: 0, sides: 6, rolls: [], sum: mod, sign });

      const chunk = `${sign < 0 ? "-" : (chunks.length ? "+" : "")}${mod}`;
      chunks.push(chunk);
      continue;
    }

    // Non riconosciuto
    throw new Error(`Termine non valido: "${body}"`);
  }

  const text = `${chunks.join(" ")} = ${total}`;
  return { total, parts, text, expr: normalized };
}