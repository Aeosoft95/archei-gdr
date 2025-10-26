// src/data/spells.ts
export type SpellTier = "I"|"II"|"III"|"IV";
export type SpellKind = "Incantesimo"|"Preghiera";
export type SpellEntry = {
  id: string; name: string; kind: SpellKind; tier: SpellTier;
  school?: string; action?: string; range?: string; duration?: string; foc?: string; text: string;
};
export const SPELLS_DB: SpellEntry[] = [];