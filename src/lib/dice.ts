export type Precision = 1 | 3 | 4 | 5 | 6;

export function thresholdFromTheoretical(theor: number): 3 | 4 | 5 | 6 {
  if (theor >= 20) return 3;
  if (theor >= 10) return 4;
  if (theor >= 6) return 5;
  return 6;
}

export function normalizeRealDice(theor: number, real?: number) {
  const r = real ?? Math.max(1, Math.min(5, theor || 1));
  return Math.max(1, Math.min(5, r));
}

export function rollND6(n: number) {
  const rolls: number[] = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
  return rolls;
}

export function countSuccesses(rolls: number[], baseThreshold: number, precision?: Precision) {
  const need = Math.max(baseThreshold, precision ?? 1);
  const successes = rolls.filter(v => v >= need).length;
  const critAbsolute = successes === rolls.length && rolls.length > 0;
  return { successes, need, critAbsolute };
}

export type SingleRollInput = {
  theor: number;          // dadi teorici totali
  real?: number;          // dadi reali da tirare (default min(5, theor), >=1)
  precision?: Precision;  // 1,3,4,5,6
  target?: number;        // opzionale, successi richiesti (1/2/3…)
};

export type SingleRollResult = {
  rolls: number[];
  threshold: number;
  precision?: Precision;
  needPerDie: number;
  successes: number;
  critAbsolute: boolean;
  passedTarget?: boolean;
};

export function singleRoll(input: SingleRollInput): SingleRollResult {
  const threshold = thresholdFromTheoretical(input.theor);
  const real = normalizeRealDice(input.theor, input.real);
  const rolls = rollND6(real);
  const { successes, need, critAbsolute } = countSuccesses(rolls, threshold, input.precision);
  const passedTarget = typeof input.target === "number" ? successes >= input.target : undefined;
  return {
    rolls, threshold, precision: input.precision, needPerDie: need,
    successes, critAbsolute, passedTarget
  };
}

export type OpposedSide = {
  theor: number;
  real?: number;
  precision?: Precision;
};

export type OpposedResult = {
  attacker: SingleRollResult;
  defender: SingleRollResult;
  outcome: "attacker" | "defender" | "tie";
  margin: number; // differenza successi (>=0)
};

export function opposedRoll(attacker: OpposedSide, defender: OpposedSide): OpposedResult {
  const atk = singleRoll(attacker);
  const def = singleRoll(defender);
  let outcome: OpposedResult["outcome"] = "tie";
  if (atk.successes > def.successes) outcome = "attacker";
  else if (def.successes > atk.successes) outcome = "defender";
  return { attacker: atk, defender: def, outcome, margin: Math.abs(atk.successes - def.successes) };
}