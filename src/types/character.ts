// Tipi base condivisi per la scheda PG

export type Attrs = { FOR:number; DES:number; COS:number; INT:number; SAP:number; CAR:number };

export type QualitaCategoria = 'Comune' | 'Buona' | 'Eccellente' | 'Maestrale' | 'Magica' | 'Artefatto';
export const QUALITA_BONUS_TEO_WEAPON: Record<QualitaCategoria, number> = {
  Comune: 0, Buona: 2, Eccellente: 4, Maestrale: 6, Magica: 8, Artefatto: 10
};
export const QUALITA_DANNO_SEG: Record<QualitaCategoria, number> = {
  Comune: 1, Buona: 2, Eccellente: 3, Maestrale: 4, Magica: 4, Artefatto: 5
};
export const QUALITA_BONUS_D6_ARMOR: Record<QualitaCategoria, number> = {
  Comune: 0, Buona: 1, Eccellente: 2, Maestrale: 3, Magica: 4, Artefatto: 5
};

export type AttackBase = 'FOR' | 'DES' | 'ARCANO';

export type Weapon = {
  id: string;
  name: string;
  qualita: QualitaCategoria;
  damageSeg?: number;
  attackBase?: AttackBase;
  bonusReal?: number;
  bonusTheo?: number;
  usesDES?: boolean;
  effettoMeccanico?: string;
  effettoNarrativo?: string;
  durMax?: number;
  durVal?: number;
  notes?: string;
  equipped?: boolean;
  collapsed?: boolean;
};

export type ArmorTipo = 'Leggera' | 'Media' | 'Pesante' | 'Magica';
export type Armor = {
  id: string;
  name: string;
  tipo: ArmorTipo;
  qualita: QualitaCategoria;
  bonusD6: number;
  durMax: number;
  durVal: number;
  penalita?: string;
  effettoMagico?: string;
  notes?: string;
  equipped?: boolean;
  collapsed?: boolean;
  useOverride?: boolean;
};

export type Ability = { id: string; name: string; rank: 0|1|2|3|4; desc?: string };

export type SpellTier = 'I'|'II'|'III'|'IV';
export type SpellKind = 'Incantesimo'|'Preghiera';
export type SpellEntry = {
  id: string; name: string; kind: SpellKind; tier: SpellTier;
  school?: string; action?: string; range?: string; duration?: string; foc?: string; text: string;
};
export type LearnedSpell = { id: string; refId: string; notes?: string };

export type PCData = {
  ident: { name: string; race: string; clazz: string; level: number; background?: string; portraitUrl?: string; };
  ap: { total:number; spent:number };
  attrs: Attrs;
  skills: { melee:boolean; ranged:boolean; arcana:boolean };
  abilities: Ability[];
  weapons: Weapon[];
  armors: Armor[];
  current: { hp: number; difMod?: number };
  notes?: string;
  spells?: LearnedSpell[];
};

export const EMPTY_PC: PCData = {
  ident: { name: '', race: '', clazz: '', level: 1, portraitUrl: '', background:'' },
  ap: { total: 0, spent: 0 },
  attrs: { FOR: 0, DES: 0, COS: 0, INT: 0, SAP: 0, CAR: 0 },
  skills: { melee: false, ranged: false, arcana: false },
  abilities: [],
  weapons: [],
  armors: [],
  current: { hp: 10, difMod: 0 },
  notes: '',
  spells: [],
};