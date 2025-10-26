'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PCData, EMPTY_PC, Attrs, QualitaCategoria, ArmorTipo, AttackBase, SpellEntry,
  QUALITA_DANNO_SEG, QUALITA_BONUS_TEO_WEAPON
} from '@/types/character';
import {
  armorEffectiveD6Auto, buildAttackPool, calcDIF, clamp, defaultsForArmorType,
  defenseDiceFromDIF, derivedHP, EMPTY_NORMALIZED, uid
} from '@/lib/characters/derived';

type Props = {
  initialData?: PCData;
  onSave?: (data: PCData) => Promise<void> | void;
  spellsDb?: SpellEntry[]; // opzionale (se non hai ancora il DB, passane [])
};

export default function CharacterSheet({ initialData, onSave, spellsDb = [] }: Props) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PCData>(initialData ? EMPTY_NORMALIZED(initialData) : EMPTY_PC);

  // Ricerca spell (se disponibile)
  const [spellQuery, setSpellQuery] = useState('');
  const [spellKind, setSpellKind] = useState<'all'|SpellEntry['kind']>('all');
  const [spellTier, setSpellTier] = useState<'all'|SpellEntry['tier']>('all');

  const filteredSpells = useMemo(() => {
    let list = spellsDb;
    if (spellKind !== 'all') list = list.filter(s => s.kind === spellKind);
    if (spellTier !== 'all') list = list.filter(s => s.tier === spellTier);
    const q = spellQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.text?.toLowerCase() ?? '').includes(q) ||
        (s.school?.toLowerCase() ?? '').includes(q)
      );
    }
    return list;
  }, [spellsDb, spellKind, spellTier, spellQuery]);

  const sugHP = useMemo(() => derivedHP(data.ident.level || 1, data.attrs.COS || 0), [data.ident.level, data.attrs.COS]);
  const equippedArmor = data.armors.find(a => a.equipped);
  const effArmorD6 = useMemo(() => {
    if (!equippedArmor) return 0;
    return equippedArmor.useOverride
      ? Math.max(0, equippedArmor.bonusD6 || 0)
      : armorEffectiveD6Auto(equippedArmor.tipo, equippedArmor.qualita);
  }, [equippedArmor?.useOverride, equippedArmor?.bonusD6, equippedArmor?.tipo, equippedArmor?.qualita]);
  const difCalc = useMemo(() => calcDIF(data.attrs.DES||0, effArmorD6), [data.attrs.DES, effArmorD6]);
  const difFinal = (difCalc || 10) + (data.current.difMod||0);
  const difDice = defenseDiceFromDIF(difFinal);

  useEffect(() => {
    if (initialData) setData(EMPTY_NORMALIZED(initialData));
  }, [initialData]);

  async function save() {
    const payload: PCData = {
      ...data,
      ap: { total: clamp(data.ap.total, 0, 999), spent: clamp(data.ap.spent, 0, 999) },
      attrs: {
        FOR: clamp(data.attrs.FOR,0,15), DES: clamp(data.attrs.DES,0,15), COS: clamp(data.attrs.COS,0,15),
        INT: clamp(data.attrs.INT,0,15), SAP: clamp(data.attrs.SAP,0,15), CAR: clamp(data.attrs.CAR,0,15),
      },
      current: { hp: clamp(data.current.hp, 0, 999), difMod: clamp(data.current.difMod||0, -20, 50) },
      weapons: data.weapons.map(w => ({
        ...w,
        attackBase: (w.attackBase || (w.usesDES ? 'DES' : 'FOR')) as AttackBase,
        bonusReal: clamp(w.bonusReal ?? 0, 0, 50),
        bonusTheo: clamp(w.bonusTheo ?? 0, 0, 50),
        damageSeg: clamp(w.damageSeg ?? QUALITA_DANNO_SEG[w.qualita], 0, 9),
        durMax: clamp(w.durMax ?? 4, 1, 24),
        durVal: clamp(w.durVal ?? 0, 0, w.durMax ?? 24),
      })),
      armors: data.armors.map(a => ({
        ...a,
        bonusD6: clamp(a.bonusD6, 0, 10),
        durMax: clamp(a.durMax, 1, 24),
        durVal: clamp(a.durVal, 0, a.durMax),
        useOverride: !!a.useOverride,
      })),
      abilities: data.abilities.map(ab => ({ ...ab, rank: clamp(ab.rank, 0, 4) as typeof ab.rank })),
      spells: Array.isArray(data.spells) ? data.spells.map(s => ({ id: s.id || uid(), refId: s.refId, notes: s.notes || '' })) : [],
    };

    try {
      setSaving(true);
      if (onSave) await onSave(payload);
      else {
        // fallback: salvataggio semplice su API se esiste
        await fetch('/api/player/sheet', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      }
      alert('Scheda salvata ✅');
    } catch {
      alert('Errore salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-4" id="sheet-print">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap border border-zinc-800 rounded-xl p-3">
        <div className="text-lg font-semibold">Scheda Personaggio</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>setData(EMPTY_PC)}>+ Nuova</button>
          <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>{
            if (!confirm('Resettare la scheda ai valori iniziali?')) return;
            const kept = data.ident.name;
            setData({ ...EMPTY_PC, ident: { ...EMPTY_PC.ident, name: kept || '' } });
          }}>↺ Reset</button>
          <button className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50" onClick={save} disabled={saving}>
            {saving?'Salvo…':'💾 Salva'}
          </button>
        </div>
      </div>

      {/* Identità */}
      <section className="rounded-xl border border-zinc-800 p-3">
        <details open>
          <summary className="font-semibold cursor-pointer select-none">Identità & Risorse</summary>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {(['name','race','clazz'] as const).map((k)=>(
              <div key={k}>
                <div className="text-xs text-zinc-400">{k==='name'?'Nome':k==='race'?'Razza':'Classe'}</div>
                <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
                       value={(data.ident as any)[k]}
                       onChange={e=>setData(d=>({...d, ident:{...d.ident, [k]:e.target.value}}))}/>
              </div>
            ))}
            <div>
              <div className="text-xs text-zinc-400">Livello</div>
              <input type="number" className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
                     min={1} value={data.ident.level}
                     onChange={e=>setData(d=>({...d, ident:{...d.ident, level:parseInt(e.target.value||'1')}}))}/>
              {data.ident.level >= 7 ? (
                <div className="mt-1 text-green-400 text-sm font-semibold">Evoluzione raggiunta!</div>
              ) : data.ident.level >= 4 ? (
                <div className="mt-1 text-amber-400 text-sm font-semibold">Sottoclasse sbloccata!</div>
              ) : null}
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-xs text-zinc-400">Ritratto (URL)</div>
              <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
                     placeholder="https://…" value={data.ident.portraitUrl||''}
                     onChange={e=>setData(d=>({...d, ident:{...d.ident, portraitUrl:e.target.value}}))}/>
              {data.ident.portraitUrl?.trim() && (
                <div className="mt-2 w-full h-40 rounded-xl overflow-hidden border border-zinc-800">
                  <img src={data.ident.portraitUrl!} alt="" className="w-full h-full object-cover"/>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-zinc-400">AP Ottenuti</div>
              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
                     type="number" value={data.ap.total}
                     onChange={e=>setData(d=>({...d, ap:{...d.ap, total:parseInt(e.target.value||'0')}}))}/>
            </div>
            <div>
              <div className="text-xs text-zinc-400">AP Spesi</div>
              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
                     type="number" value={data.ap.spent}
                     onChange={e=>setData(d=>({...d, ap:{...d.ap, spent:parseInt(e.target.value||'0')}}))}/>
            </div>
            <div className="sm:col-span-2 lg:col-span-2 flex items-end text-sm text-zinc-400">
              Disponibili: <span className="ml-1 text-zinc-200 font-semibold">{Math.max(0, (data.ap.total||0) - (data.ap.spent||0))}</span>
            </div>
          </div>
        </details>
      </section>

      {/* Colonne */}
      <section className="grid lg:grid-cols-[360px_1fr] gap-4">
        {/* Colonna sinistra: Abilità */}
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-800 p-3">
            <details open>
              <summary className="font-semibold cursor-pointer select-none">Abilità</summary>
              <div className="text-xs text-zinc-400 mb-2 mt-2">Ogni abilità può essere migliorata fino a <b>4</b> volte.</div>
              <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>setData(d=>({...d, abilities:[...d.abilities, { id:uid(), name:'', rank:0, desc:'' }]}))}>
                + Aggiungi abilità
              </button>
              <div className="space-y-2 mt-2">
                {data.abilities.length===0 && <div className="text-sm text-zinc-500">Nessuna abilità aggiunta.</div>}
                {data.abilities.map(ab=>(
                  <details key={ab.id} className="rounded-xl border border-zinc-800 p-2" open>
                    <summary className="font-semibold cursor-pointer select-none">
                      {ab.name || 'Abilità senza nome'}{ab.rank ? ` — Grado ${ab.rank}` : ''}
                    </summary>
                    <div className="grid md:grid-cols-3 gap-2 mt-2">
                      <div className="md:col-span-2">
                        <div className="text-xs text-zinc-400">Nome</div>
                        <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={ab.name}
                          onChange={e=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, name:e.target.value}:x)}))}/>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">Grado</div>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, rank: clamp((x.rank-1) as any, 0,4) as any}:x)}))}>−</button>
                          <div className="w-10 text-center">{ab.rank}</div>
                          <button className="px-3 py-1.5 rounded bg-emerald-600" onClick={()=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, rank: clamp((x.rank+1) as any, 0,4) as any}:x)}))}>+</button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-zinc-400">Descrizione</div>
                      <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 min-h-20"
                        value={ab.desc||''}
                        onChange={e=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, desc:e.target.value}:x)}))}/>
                    </div>
                    <div className="mt-2 text-right">
                      <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>setData(d=>({...d, abilities:d.abilities.filter(x=>x.id!==ab.id)}))}>Elimina</button>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          </section>
        </div>

        {/* Colonna destra: Attributi, Derivati, Armi, Armature, Spell opzionali */}
        <div className="space-y-4">
          {/* Attributi */}
          <section className="rounded-xl border border-zinc-800 p-3">
            <details open>
              <summary className="font-semibold cursor-pointer select-none">Attributi</summary>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                {(['FOR','DES','COS','INT','SAP','CAR'] as (keyof Attrs)[]).map(k=>(
                  <div key={k}>
                    <div className="text-xs text-zinc-400">{k}</div>
                    <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number" value={data.attrs[k]}
                      onChange={e=>setData(d=>({...d, attrs:{...d.attrs, [k]: parseInt(e.target.value||'0')}}))}/>
                  </div>
                ))}
              </div>
            </details>
          </section>

          {/* Valori derivati */}
          <section className="rounded-xl border border-zinc-800 p-3">
            <details open>
              <summary className="font-semibold cursor-pointer select-none">Valori derivati</summary>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-xs text-zinc-400">HP (suggerito)</div>
                  <div className="text-xl">{sugHP}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">DIF (calcolata)</div>
                  <div className="text-xl">{difCalc}</div>
                  <div className="text-xs text-zinc-500 mt-1">= 10 + DES ({data.attrs.DES||0}) + Armatura eff. ({effArmorD6}d6)</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Mod. DIF manuale</div>
                  <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number"
                    value={data.current.difMod||0}
                    onChange={e=>setData(d=>({...d, current:{...d.current, difMod: parseInt(e.target.value||'0')}}))}/>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 p-2 mt-2">
                <div className="text-sm text-zinc-400">Pool totale difesa: <span className="font-semibold text-zinc-200">{difDice.tot}d6</span></div>
                <div className="text-xs text-zinc-500">(split: {difDice.reali} reali / {difDice.teorici} teorici • DIF finale {difFinal})</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <div className="text-xs text-zinc-400">HP (attuali)</div>
                  <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number" value={data.current.hp}
                    onChange={e=>setData(d=>({...d, current:{...d.current, hp: parseInt(e.target.value||'0')}}))}/>
                </div>
              </div>
            </details>
          </section>

          {/* Armi */}
          <section className="rounded-xl border border-zinc-800 p-3">
            <details open>
              <summary className="font-semibold cursor-pointer select-none">Attacco — Armi</summary>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-zinc-400">Base dall’attributo scelto; la qualità aggiunge solo dadi <b>teorici</b>.</div>
                <button className="px-3 py-1.5 rounded bg-emerald-600" onClick={()=>setData(d=>({...d, weapons:[...d.weapons, {
                  id:uid(), name:'', qualita:'Comune', damageSeg:QUALITA_DANNO_SEG['Comune'], attackBase:'FOR',
                  bonusReal:0, bonusTheo:0, usesDES:false, effettoMeccanico:'', effettoNarrativo:'',
                  durMax:4, durVal:0, notes:'', equipped:false, collapsed:false
                }]}))}>+ Aggiungi arma</button>
              </div>

              <div className="space-y-2 mt-3">
                {data.weapons.length===0 && <div className="text-sm text-zinc-500">Nessuna arma inserita.</div>}
                {data.weapons.map(w=>{
                  const p = buildAttackPool({
                    attackBase: (w.attackBase || (w.usesDES ? 'DES' : 'FOR')) as AttackBase,
                    attrs: data.attrs,
                    hasSkillMelee: data.skills.melee,
                    hasSkillRanged: data.skills.ranged,
                    hasSkillArcana: data.skills.arcana,
                    armaBonusTeorico: QUALITA_BONUS_TEO_WEAPON[w.qualita],
                    bonusReal: w.bonusReal || 0, bonusTheo: w.bonusTheo || 0,
                  });

                  return (
                    <div key={w.id} className="rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between p-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {w.name || 'Arma senza nome'} — {w.qualita}
                            {w.collapsed && (
                              <span className="text-xs text-zinc-400 ml-2">• Pool: {p.real}/{p.theo} • Danno: {w.damageSeg ?? QUALITA_DANNO_SEG[w.qualita]} seg</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-400 flex items-center gap-2">
                            <input type="checkbox" checked={!!w.equipped}
                              onChange={e=>setData(d=>{
                                const next = d.weapons.map(x=> x.id===w.id ? { ...x, equipped:e.target.checked } : x);
                                const eq = next.filter(x=>x.equipped);
                                if (eq.length > 3) return { ...d, weapons: d.weapons.map(x=> x.id===w.id ? { ...x, equipped:false } : x) };
                                return { ...d, weapons: next };
                              })}/>
                            Equip. (max 3)
                          </label>
                          <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>setData(d=>({...d, weapons:d.weapons.filter(x=>x.id!==w.id)}))}>✕</button>
                          <button className="px-3 py-1.5 rounded bg-emerald-600" onClick={()=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, collapsed:!x.collapsed}:x)}))}>
                            {w.collapsed ? '▼' : '▲'}
                          </button>
                        </div>
                      </div>

                      {!w.collapsed && (
                        <div className="p-3 border-t border-zinc-800 space-y-2">
                          <div className="grid md:grid-cols-6 gap-2">
                            <div className="md:col-span-2">
                              <div className="text-xs text-zinc-400">Nome arma</div>
                              <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={w.name}
                                onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, name:e.target.value}:x)}))}/>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Base (caratt.)</div>
                              <select className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={w.attackBase || (w.usesDES ? 'DES' : 'FOR')}
                                onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, attackBase: e.target.value as AttackBase}:x)}))}>
                                {(['FOR','DES','ARCANO'] as AttackBase[]).map(b=> <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Qualità</div>
                              <select className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={w.qualita}
                                onChange={e=>{
                                  const q = e.target.value as QualitaCategoria;
                                  setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{ ...x, qualita:q, damageSeg: x.damageSeg ?? QUALITA_DANNO_SEG[q] }:x)}));
                                }}>
                                {(['Comune','Buona','Eccellente','Maestrale','Magica','Artefatto'] as QualitaCategoria[]).map(q=><option key={q} value={q}>{q}</option>)}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Danno (segmenti)</div>
                              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number"
                                value={w.damageSeg ?? QUALITA_DANNO_SEG[w.qualita]}
                                onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, damageSeg:parseInt(e.target.value||'1')}:x)}))}/>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Bonus (reali)</div>
                              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number" value={w.bonusReal ?? 0}
                                onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, bonusReal:parseInt(e.target.value||'0')}:x)}))}/>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Bonus (teorici)</div>
                              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number" value={w.bonusTheo ?? 0}
                                onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, bonusTheo:parseInt(e.target.value||'0')}:x)}))}/>
                            </div>
                          </div>

                          <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" placeholder="Note"
                            value={w.notes||''}
                            onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, notes:e.target.value}:x)}))}/>

                          <div className="rounded-lg border border-zinc-800 p-2">
                            <div className="text-sm text-zinc-400">Pool attacco</div>
                            <div className="font-semibold">{p.real} reali / {p.theo} teorici — soglia {p.threshold}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Abilità globali */}
              <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3 mt-3">
                <label className="text-xs text-zinc-400 flex items-center gap-2">
                  <input type="checkbox" checked={data.skills.melee} onChange={e=>setData(d=>({...d, skills:{...d.skills, melee:e.target.checked}}))}/>
                  Mischia
                </label>
                <label className="text-xs text-zinc-400 flex items-center gap-2">
                  <input type="checkbox" checked={data.skills.ranged} onChange={e=>setData(d=>({...d, skills:{...d.skills, ranged:e.target.checked}}))}/>
                  Distanza
                </label>
                <label className="text-xs text-zinc-400 flex items-center gap-2">
                  <input type="checkbox" checked={data.skills.arcana} onChange={e=>setData(d=>({...d, skills:{...d.skills, arcana:e.target.checked}}))}/>
                  Arcanismo
                </label>
              </div>
            </details>
          </section>

          {/* Armature */}
          <section className="rounded-xl border border-zinc-800 p-3">
            <details open>
              <summary className="font-semibold cursor-pointer select-none">Difesa — Armature</summary>
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-zinc-400">Seleziona l'armatura indossata (max 1). Puoi attivare l’override manuale.</div>
                <button className="px-3 py-1.5 rounded bg-emerald-600" onClick={()=>setData(d=>({...d, armors:[...d.armors, {
                  id:uid(), name:'', tipo:'Leggera', qualita:'Comune',
                  ...defaultsForArmorType('Leggera'), durVal:0, effettoMagico:'', notes:defaultsForArmorType('Leggera').note,
                  equipped:false, collapsed:false, useOverride:false
                }]}))}>+ Aggiungi armatura</button>
              </div>

              <div className="space-y-2 mt-3">
                {data.armors.length===0 && <div className="text-sm text-zinc-500">Nessuna armatura inserita.</div>}
                {data.armors.map(a=>{
                  const autoD6 = armorEffectiveD6Auto(a.tipo, a.qualita);
                  const effD6 = a.useOverride ? (a.bonusD6||0) : autoD6;

                  return (
                    <div key={a.id} className="rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between p-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {a.name || 'Armatura senza nome'} — {a.tipo} — {a.qualita}
                            {a.collapsed && <span className="text-xs text-zinc-400 ml-2">• Durabilità: {a.durVal}/{a.durMax}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-400 flex items-center gap-2">
                            <input type="checkbox" checked={!!a.equipped}
                              onChange={e=>setData(d=>{
                                const next = d.armors.map(x => x.id===a.id ? { ...x, equipped:e.target.checked } : { ...x, equipped:false });
                                if (!e.target.checked) return { ...d, armors: d.armors.map(x=> x.id===a.id ? { ...x, equipped:false } : x) };
                                return { ...d, armors: next };
                              })}/>
                            Equip. (max 1)
                          </label>
                          <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>setData(d=>({...d, armors:d.armors.filter(x=>x.id!==a.id)}))}>✕</button>
                          <button className="px-3 py-1.5 rounded bg-emerald-600" onClick={()=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, collapsed:!x.collapsed}:x)}))}>
                            {a.collapsed ? '▼' : '▲'}
                          </button>
                        </div>
                      </div>

                      {!a.collapsed && (
                        <div className="p-3 border-t border-zinc-800 space-y-2">
                          <div className="grid md:grid-cols-4 gap-2">
                            <div>
                              <div className="text-xs text-zinc-400">Nome</div>
                              <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={a.name}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, name:e.target.value}:x)}))}/>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Tipo</div>
                              <select className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={a.tipo}
                                onChange={e=>{
                                  const t = e.target.value as ArmorTipo;
                                  const def = defaultsForArmorType(t);
                                  setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{
                                    ...x, tipo:t,
                                    bonusD6: x.bonusD6 || def.bonusD6,
                                    durMax: x.durMax || def.durMax,
                                    penalita: x.penalita || def.penalita,
                                    notes: x.notes || def.note
                                  }:x)}));
                                }}>
                                {(['Leggera','Media','Pesante','Magica'] as ArmorTipo[]).map(t=><option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Qualità</div>
                              <select className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={a.qualita}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, qualita: e.target.value as QualitaCategoria}:x)}))}>
                                {(['Comune','Buona','Eccellente','Maestrale','Magica','Artefatto'] as QualitaCategoria[]).map(q=><option key={q} value={q}>{q}</option>)}
                              </select>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Bonus DIF (d6) — effettivo</div>
                              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={effD6} readOnly />
                              <div className="text-xs text-zinc-500 mt-1">
                                {a.useOverride ? 'Override manuale' : `Auto: ${autoD6}d6 (Tipo+Qualità)`}
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-3 gap-2">
                            <div>
                              <div className="text-xs text-zinc-400">Durabilità (max)</div>
                              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number" value={a.durMax}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, durMax: parseInt(e.target.value||'4')}:x)}))}/>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Durabilità (valore)</div>
                              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number" value={a.durVal}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, durVal: parseInt(e.target.value||'0')}:x)}))}/>
                            </div>
                            <div className="flex items-end">
                              <label className="text-xs text-zinc-400 flex items-center gap-2">
                                <input type="checkbox" checked={!!a.useOverride}
                                  onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, useOverride:e.target.checked}:x)}))}/>
                                Usa override manuale
                              </label>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-zinc-400">Bonus DIF (d6) — manuale</div>
                              <input className="w-full text-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2" type="number" value={a.bonusD6}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, bonusD6: parseInt(e.target.value||'0')}:x)}))}
                                disabled={!a.useOverride}/>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Penalità</div>
                              <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={a.penalita||''}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, penalita:e.target.value}:x)}))}/>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-zinc-400">Effetto magico (opz.)</div>
                              <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={a.effettoMagico||''}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, effettoMagico:e.target.value}:x)}))}/>
                            </div>
                            <div>
                              <div className="text-xs text-zinc-400">Note</div>
                              <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={a.notes||''}
                                onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, notes:e.target.value}:x)}))}/>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          </section>

          {/* Incantesimi opzionali (mostra solo se passi spellsDb) */}
          {spellsDb.length > 0 && (
            <section className="rounded-xl border border-zinc-800 p-3">
              <details open>
                <summary className="font-semibold cursor-pointer select-none">Incantesimi & Preghiere</summary>
                <div className="text-sm text-zinc-400 mt-2">Cerca e aggiungi rapidamente i tuoi incantesimi.</div>

                <div className="grid md:grid-cols-4 gap-2 mt-3">
                  <div className="md:col-span-2">
                    <div className="text-xs text-zinc-400">Cerca</div>
                    <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
                      placeholder="es. Dardo, Benedizione…" value={spellQuery}
                      onChange={e=>setSpellQuery(e.target.value)}/>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Tipo</div>
                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={spellKind} onChange={e=>setSpellKind(e.target.value as any)}>
                      <option value="all">Tutti</option>
                      <option value="Incantesimo">Incantesimi</option>
                      <option value="Preghiera">Preghiere</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Tier</div>
                    <select className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2" value={spellTier} onChange={e=>setSpellTier(e.target.value as any)}>
                      <option value="all">Tutti</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-zinc-400 mb-1">Risultati</div>
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {filteredSpells.length===0 && <div className="text-sm text-zinc-500">Nessun risultato.</div>}
                    {filteredSpells.map(s=>{
                      const already = (data.spells||[]).some(ls => ls.refId === s.id);
                      return (
                        <div key={s.id} className="rounded-lg border border-zinc-800 p-2">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{s.name}</div>
                              <div className="text-xs text-zinc-400">
                                {s.kind} • Tier {s.tier}{s.school ? ` • ${s.school}` : ''}{s.foc ? ` • ${s.foc}` : ''}{s.action ? ` • ${s.action}` : ''}{s.range ? ` • ${s.range}` : ''}{s.duration ? ` • ${s.duration}` : ''}
                              </div>
                            </div>
                            <button
                              className={`px-3 py-1.5 rounded ${already?'bg-zinc-800 cursor-not-allowed':'bg-emerald-600'}`}
                              disabled={already}
                              onClick={()=>setData(d=>({ ...d, spells:[...(d.spells||[]), { id: uid(), refId: s.id, notes:'' }] }))}>
                              {already ? '✓ Aggiunto' : '+ Aggiungi'}
                            </button>
                          </div>
                          <div className="text-sm mt-1">{s.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-800 mt-3 pt-3">
                  <div className="text-xs text-zinc-400 mb-1">Selezionati</div>
                  {(data.spells||[]).length===0 && <div className="text-sm text-zinc-500">Nessun incantesimo o preghiera selezionato.</div>}
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {(data.spells||[]).map(s=>{
                      const ref = spellsDb.find(x => x.id === s.refId);
                      if (!ref) return null;
                      return (
                        <div key={s.id} className="rounded-lg border border-zinc-800 p-2">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{ref.name}</div>
                              <div className="text-xs text-zinc-400">
                                {ref.kind} • Tier {ref.tier}{ref.school ? ` • ${ref.school}` : ''}{ref.foc ? ` • ${ref.foc}` : ''}
                              </div>
                            </div>
                            <button className="px-3 py-1.5 rounded bg-zinc-800" onClick={()=>setData(d=>({ ...d, spells:(d.spells||[]).filter(x=>x.id!==s.id) }))}>
                              Rimuovi
                            </button>
                          </div>
                          <div className="text-xs text-zinc-400 mt-2">Note</div>
                          <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
                            placeholder="Annotazioni rapide"
                            value={s.notes||''}
                            onChange={e=>setData(d=>({ ...d, spells:(d.spells||[]).map(x=>x.id===s.id?{...x, notes:e.target.value}:x) }))}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            </section>
          )}

          {/* Background & Note */}
          <section className="rounded-xl border border-zinc-800 p-3">
            <details>
              <summary className="font-semibold cursor-pointer select-none">Background</summary>
              <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 min-h-24 mt-2"
                value={data.ident.background || ''} onChange={e=>setData(d=>({...d, ident:{...d.ident, background:e.target.value}}))}
                placeholder="Origini, storia, motivazioni…"/>
            </details>
          </section>

          <section className="rounded-xl border border-zinc-800 p-3">
            <details>
              <summary className="font-semibold cursor-pointer select-none">Note del personaggio</summary>
              <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 min-h-28 mt-2"
                value={data.notes||''} onChange={e=>setData(d=>({...d, notes:e.target.value}))}
                placeholder="Appunti, legami, clock personali, ecc."/>
            </details>
          </section>
        </div>
      </section>
    </main>
  );
}