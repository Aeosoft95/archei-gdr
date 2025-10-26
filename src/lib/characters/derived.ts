import {
  ArmorTipo, Attrs, PCData, QualitaCategoria,
  QUALITA_BONUS_D6_ARMOR, QUALITA_DANNO_SEG, AttackBase
} from "@/types/character";

export const uid = () => Math.random().toString(36).slice(2, 9);
export const clamp = (n:number, a:number, b:number) => Math.max(a, Math.min(b, n));

export function derivedHP(level:number, COS:number) {
  const base = 8 + COS + Math.max(0, (level-1))*2;
  return Math.max(1, base);
}
export function armorEffectiveD6Auto(tipo: ArmorTipo, qualita: QualitaCategoria) {
  const base = tipo === 'Leggera' ? 1 : tipo === 'Media' ? 2 : tipo === 'Pesante' ? 3 : 3;
  const byQual = QUALITA_BONUS_D6_ARMOR[qualita] || 0;
  let eff = base + byQual;
  if (tipo === 'Magica') eff = Math.min(5, Math.max(3, eff));
  return Math.max(0, eff);
}
export function calcDIF(des:number, armorEffD6:number) {
  return 10 + Math.max(0, des) + Math.max(0, armorEffD6);
}
export function defenseDiceFromDIF(dif:number){
  const tot = Math.max(1, 1 + Math.max(0, dif - 10));
  const reali = Math.min(tot, 5);
  const teorici = tot - reali;
  return { tot, reali, teorici };
}
export function diceFromAttribute(attr:number){
  const real = Math.min(Math.max(0, attr), 5);
  const theo = Math.max(0, attr - 5);
  return { real, theo };
}
export function buildAttackPool(params: {
  attackBase: AttackBase; attrs: Attrs;
  hasSkillMelee: boolean; hasSkillRanged: boolean; hasSkillArcana: boolean;
  armaBonusTeorico: number; bonusReal?: number; bonusTheo?: number;
}) {
  const { attackBase, attrs, hasSkillMelee, hasSkillRanged, hasSkillArcana, armaBonusTeorico, bonusReal=0, bonusTheo=0 } = params;
  let primaryAttrValue = 0;
  if (attackBase === 'FOR') primaryAttrValue = attrs.FOR || 0;
  else if (attackBase === 'DES') primaryAttrValue = attrs.DES || 0;
  else primaryAttrValue = Math.max(attrs.SAP || 0, attrs.INT || 0);
  const fromAttr = diceFromAttribute(primaryAttrValue);
  let skillReal = 0;
  if (attackBase === 'FOR' && hasSkillMelee) skillReal += 1;
  if (attackBase === 'DES' && hasSkillRanged) skillReal += 1;
  if (attackBase === 'ARCANO' && hasSkillArcana) skillReal += 1;
  const theoFromQuality = Math.max(0, armaBonusTeorico);
  const real = fromAttr.real + skillReal + Math.max(0, bonusReal);
  const theo = fromAttr.theo + theoFromQuality + Math.max(0, bonusTheo);
  const threshold = theo <= 5 ? 6 : theo <= 9 ? 5 : theo <= 19 ? 4 : 3;
  return { real, theo, threshold };
}
export function defaultsForArmorType(tipo: ArmorTipo){
  if (tipo==='Leggera')  return { bonusD6:1, durMax:4,  penalita:'', note:'Agile, silenziosa.' };
  if (tipo==='Media')    return { bonusD6:2, durMax:6,  penalita:'-1d6 a tiri furtivi', note:'Standard per avventurieri.' };
  if (tipo==='Pesante')  return { bonusD6:3, durMax:8,  penalita:'-1d6 ai movimenti', note:'Perfetta per tank.' };
  return { bonusD6:3, durMax:8, penalita:'Consuma 1 FOC/Scena', note:'Effetti speciali.' };
}

export const EMPTY_NORMALIZED = (inData: PCData): PCData => {
  const out: PCData = JSON.parse(JSON.stringify(inData));
  out.weapons = Array.isArray(inData.weapons)
    ? inData.weapons.map(w => ({
        id: w.id || uid(),
        qualita: (w as any).qualita || 'Comune',
        damageSeg: w.damageSeg ?? QUALITA_DANNO_SEG[((w as any).qualita || 'Comune') as QualitaCategoria],
        attackBase: (w as any).attackBase || ((w as any).usesDES ? 'DES' : 'FOR'),
        bonusReal: typeof (w as any).bonusReal === 'number' ? (w as any).bonusReal : 0,
        bonusTheo: typeof (w as any).bonusTheo === 'number' ? (w as any).bonusTheo : 0,
        usesDES: !!(w as any).usesDES,
        effettoMeccanico: w.effettoMeccanico||'',
        effettoNarrativo: w.effettoNarrativo||'',
        durMax: w.durMax ?? 4,
        durVal: w.durVal ?? 0,
        notes: w.notes || '',
        equipped: !!w.equipped,
        collapsed: w.collapsed ?? true,
        name: w.name || '',
      }))
    : [];
  out.armors = Array.isArray(inData.armors)
    ? inData.armors.map(a => ({
        id: a.id || uid(),
        name: a.name || '',
        tipo: (a as any).tipo || 'Leggera',
        qualita: (a as any).qualita || 'Comune',
        bonusD6: typeof a.bonusD6==='number' ? a.bonusD6 : defaultsForArmorType(((a as any).tipo||'Leggera') as ArmorTipo).bonusD6,
        durMax: typeof a.durMax==='number' ? a.durMax : defaultsForArmorType(((a as any).tipo||'Leggera') as ArmorTipo).durMax,
        durVal: typeof a.durVal==='number' ? a.durVal : 0,
        penalita: a.penalita || defaultsForArmorType(((a as any).tipo||'Leggera') as ArmorTipo).penalita,
        effettoMagico: a.effettoMagico || '',
        notes: a.notes || defaultsForArmorType(((a as any).tipo||'Leggera') as ArmorTipo).note,
        equipped: !!a.equipped,
        collapsed: a.collapsed ?? true,
        useOverride: !!(a as any).useOverride,
      }))
    : [];
  out.abilities = Array.isArray(inData.abilities)
    ? inData.abilities.map(ab => ({ id:ab.id||uid(), name:ab.name||'', rank: clamp((ab.rank??0) as any,0,4) as 0|1|2|3|4, desc: ab.desc||'' }))
    : [];
  if (!out.ap) out.ap = { total: 0, spent: 0 };
  if (!out.current) out.current = { hp: derivedHP(out.ident.level||1, out.attrs.COS||0), difMod: 0 };
  if (typeof out.current.difMod !== 'number') out.current.difMod = 0;
  if (!Array.isArray(out.spells)) out.spells = [];
  return out;
};