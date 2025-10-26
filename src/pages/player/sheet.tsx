// src/pages/sheet.tsx
"use client";

import { useMemo, useState } from "react";
import { SPELLS_DB } from "@/data/spells";

// ===== Tipi minimi =====
type Attrs = { FOR:number; DES:number; COS:number; INT:number; SAP:number; CAR:number };

type Ability = { id:string; name:string; rank:0|1|2|3|4; desc?:string };

type Weapon = {
  id: string;
  name: string;
  notes?: string;
  damageSeg?: number; // facoltativo
  equipped?: boolean;
};

type Armor = {
  id: string;
  name: string;
  bonusD6: number;  // incide su DIF
  notes?: string;
  equipped?: boolean;
};

type SpellTier = "I"|"II"|"III"|"IV";
type SpellKind = "Incantesimo"|"Preghiera";
type SpellEntry = {
  id: string;
  name: string;
  kind: SpellKind;
  tier: SpellTier;
  school?: string;
  action?: string;
  range?: string;
  duration?: string;
  foc?: string;
  text: string;
};
type LearnedSpell = { id:string; refId:string; notes?:string };

type PCData = {
  ident: {
    name: string;
    race: string;
    clazz: string;
    level: number;
    portraitUrl?: string;
  };
  attrs: Attrs;
  quick: { hp:number; foc:number; difMod?:number };
  abilities: Ability[];
  weapons: Weapon[];
  armors: Armor[];
  spells: LearnedSpell[];
  notes?: string;
};

const uid = () => Math.random().toString(36).slice(2,9);

const EMPTY_PC: PCData = {
  ident: { name:"", race:"", clazz:"", level:1, portraitUrl:"" },
  attrs: { FOR:0, DES:0, COS:0, INT:0, SAP:0, CAR:0 },
  quick: { hp: 10, foc: 3, difMod: 0 },
  abilities: [],
  weapons: [],
  armors: [],
  spells: [],
  notes: ""
};

// ===== Helpers rapidi =====
function derivedHP(level:number, COS:number) {
  const base = 8 + COS + Math.max(0, level-1)*2;
  return Math.max(1, base);
}
function calcDIF(des:number, armorBonusD6:number, mod:number=0) {
  return 10 + Math.max(0, des) + Math.max(0, armorBonusD6) + (mod||0);
}

export default function SheetPage() {
  const [data, setData] = useState<PCData>(EMPTY_PC);

  // Armor equipaggiata (una sola considerata)
  const equippedArmor = useMemo(()=> data.armors.find(a=>a.equipped), [data.armors]);
  const armorBonus = equippedArmor?.bonusD6 ?? 0;

  const sugHP = useMemo(
    ()=> derivedHP(data.ident.level||1, data.attrs.COS||0),
    [data.ident.level, data.attrs.COS]
  );
  const dif = useMemo(
    ()=> calcDIF(data.attrs.DES||0, armorBonus, data.quick.difMod||0),
    [data.attrs.DES, armorBonus, data.quick.difMod]
  );

  // ===== Spells: filtri & selezione =====
  const [spellQuery, setSpellQuery] = useState("");
  const [spellKind, setSpellKind] = useState<"all"|SpellKind>("all");
  const [spellTier, setSpellTier] = useState<"all"|SpellTier>("all");

  const filteredSpells = useMemo(()=>{
    let list = SPELLS_DB as SpellEntry[];
    if (spellKind !== "all") list = list.filter(s=>s.kind===spellKind);
    if (spellTier !== "all") list = list.filter(s=>s.tier===spellTier);
    const q = spellQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.text?.toLowerCase() ?? "").includes(q) ||
        (s.school?.toLowerCase() ?? "").includes(q)
      );
    }
    return list;
  }, [spellKind, spellTier, spellQuery]);

  function addSpell(ref: SpellEntry) {
    if (data.spells.some(s=>s.refId===ref.id)) return;
    setData(d=>({...d, spells: [...d.spells, { id: uid(), refId: ref.id, notes:"" }] }));
  }
  function removeSpell(id:string) {
    setData(d=>({...d, spells: d.spells.filter(s=>s.id!==id)}));
  }

  // ===== UI =====
  return (
    <main className="min-h-screen bg-zinc-900 text-white p-4 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Scheda Personaggio</h1>
        <a
          href="/table"
          className="text-sm px-3 py-1.5 rounded border border-zinc-700 hover:bg-zinc-800"
        >
          ← Torna al tavolo
        </a>
      </header>

      {/* Identità + ritratto */}
      <section className="rounded-xl bg-zinc-800 border border-zinc-700 p-4">
        <div className="grid md:grid-cols-[1fr_240px] gap-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Nome">
              <input className="input" value={data.ident.name}
                onChange={e=>setData(d=>({...d, ident:{...d.ident, name:e.target.value}}))}/>
            </Field>
            <Field label="Razza">
              <input className="input" value={data.ident.race}
                onChange={e=>setData(d=>({...d, ident:{...d.ident, race:e.target.value}}))}/>
            </Field>
            <Field label="Classe">
              <input className="input" value={data.ident.clazz}
                onChange={e=>setData(d=>({...d, ident:{...d.ident, clazz:e.target.value}}))}/>
            </Field>
            <Field label="Livello">
              <input type="number" min={1} className="input text-center" value={data.ident.level}
                onChange={e=>setData(d=>({...d, ident:{...d.ident, level: parseInt(e.target.value||"1")}}))}/>
            </Field>

            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-xs text-zinc-400 mb-1">Ritratto (URL)</div>
              <input className="input" placeholder="https://…" value={data.ident.portraitUrl||""}
                onChange={e=>setData(d=>({...d, ident:{...d.ident, portraitUrl:e.target.value}}))}/>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-700 overflow-hidden bg-zinc-900/50 h-48">
            {data.ident.portraitUrl ? (
              <img
                src={data.ident.portraitUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-zinc-500 text-sm">
                Nessuna immagine
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Box rapidi: HP / DIF / FOC */}
      <section className="grid md:grid-cols-3 gap-3">
        <QuickCard title="HP">
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input text-center w-28"
              value={data.quick.hp}
              onChange={e=>setData(d=>({...d, quick:{...d.quick, hp: parseInt(e.target.value||"0")}}))}
            />
            <div className="text-xs text-zinc-400">
              Suggerito: <span className="text-zinc-200">{sugHP}</span>
            </div>
          </div>
        </QuickCard>

        <QuickCard title="DIF">
          <div className="flex items-center gap-2">
            <div className="text-xl font-semibold">{dif}</div>
            <div className="text-xs text-zinc-400">
              = 10 + DES ({data.attrs.DES||0}) + Armatura ({armorBonus}d6) + Mod.
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xs text-zinc-400 mb-1">Mod. manuale</div>
            <input
              type="number"
              className="input text-center w-28"
              value={data.quick.difMod||0}
              onChange={e=>setData(d=>({...d, quick:{...d.quick, difMod: parseInt(e.target.value||"0")}}))}
            />
          </div>
        </QuickCard>

        <QuickCard title="FOC">
          <input
            type="number"
            className="input text-center w-28"
            value={data.quick.foc}
            onChange={e=>setData(d=>({...d, quick:{...d.quick, foc: parseInt(e.target.value||"0")}}))}
          />
        </QuickCard>
      </section>

      {/* Caratteristiche */}
      <section className="card">
        <h2 className="card-title">Caratteristiche</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
          {(["FOR","DES","COS","INT","SAP","CAR"] as (keyof Attrs)[]).map(k=>(
            <Field key={k} label={k}>
              <input
                type="number"
                className="input text-center"
                value={data.attrs[k]}
                onChange={e=>setData(d=>({...d, attrs:{...d.attrs, [k]: parseInt(e.target.value||"0")}}))}
              />
            </Field>
          ))}
        </div>
      </section>

      {/* Abilità */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Abilità</h2>
          <button
            className="btn"
            onClick={()=>setData(d=>({...d, abilities:[...d.abilities, { id: uid(), name:"", rank:0, desc:""}]}))}
          >
            + Aggiungi abilità
          </button>
        </div>

        <div className="space-y-2 mt-2">
          {data.abilities.length===0 && <div className="text-sm text-zinc-500">Nessuna abilità.</div>}
          {data.abilities.map(ab=>(
            <div key={ab.id} className="rounded-lg border border-zinc-700 p-2">
              <div className="grid md:grid-cols-3 gap-2">
                <Field label="Nome">
                  <input className="input" value={ab.name}
                    onChange={e=>setData(d=>({...d, abilities: d.abilities.map(x=>x.id===ab.id?{...x, name:e.target.value}:x)}))}/>
                </Field>
                <Field label="Grado">
                  <div className="flex items-center gap-2">
                    <button className="btn !bg-zinc-800"
                      onClick={()=>setData(d=>({...d, abilities: d.abilities.map(x=>x.id===ab.id?{...x, rank: Math.max(0, x.rank-1) as any}:x)}))}
                    >−</button>
                    <div className="w-10 text-center">{ab.rank}</div>
                    <button className="btn"
                      onClick={()=>setData(d=>({...d, abilities: d.abilities.map(x=>x.id===ab.id?{...x, rank: Math.min(4, x.rank+1) as any}:x)}))}
                    >+</button>
                  </div>
                </Field>
                <div className="flex items-end justify-end">
                  <button className="btn !bg-zinc-800"
                    onClick={()=>setData(d=>({...d, abilities: d.abilities.filter(x=>x.id!==ab.id)}))}
                  >Elimina</button>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-zinc-400 mb-1">Descrizione</div>
                <textarea className="input min-h-20"
                  value={ab.desc||""}
                  onChange={e=>setData(d=>({...d, abilities: d.abilities.map(x=>x.id===ab.id?{...x, desc:e.target.value}:x)}))}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Incantesimi / Preghiere */}
      <section className="card">
        <h2 className="card-title">Incantesimi & Preghiere</h2>

        {/* Barra filtri */}
        <div className="grid md:grid-cols-4 gap-2 mt-2">
          <Field label="Cerca (nome, testo, scuola)" className="md:col-span-2">
            <input className="input" placeholder="es. Dardo, Benedizione…"
              value={spellQuery} onChange={e=>setSpellQuery(e.target.value)}/>
          </Field>
          <Field label="Tipo">
            <select className="input" value={spellKind} onChange={e=>setSpellKind(e.target.value as any)}>
              <option value="all">Tutti</option>
              <option value="Incantesimo">Incantesimi</option>
              <option value="Preghiera">Preghiere</option>
            </select>
          </Field>
          <Field label="Tier">
            <select className="input" value={spellTier} onChange={e=>setSpellTier(e.target.value as any)}>
              <option value="all">Tutti</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </Field>
        </div>

        {/* Risultati (aggiunta) */}
        <div className="mt-3">
          <div className="text-sm text-zinc-400 mb-1">Risultati</div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {filteredSpells.length===0 && <div className="text-sm text-zinc-500">Nessun risultato.</div>}
            {filteredSpells.map(s=>{
              const already = data.spells.some(ls => ls.refId === s.id);
              return (
                <div key={s.id} className="rounded-lg border border-zinc-700 p-2 bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-xs text-zinc-400">
                        {s.kind} • Tier {s.tier}{s.school ? ` • ${s.school}` : ''}{s.foc ? ` • ${s.foc}` : ''}{s.action ? ` • ${s.action}` : ''}{s.range ? ` • ${s.range}` : ''}{s.duration ? ` • ${s.duration}` : ''}
                      </div>
                    </div>
                    <button
                      className={`btn ${already?'!bg-zinc-800 cursor-not-allowed':''}`}
                      disabled={already}
                      onClick={()=>addSpell(s)}
                    >
                      {already ? '✓ Aggiunto' : '+ Aggiungi'}
                    </button>
                  </div>
                  <div className="text-sm mt-1">{s.text}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selezionati */}
        <div className="border-t border-zinc-800 mt-3 pt-3">
          <div className="text-sm text-zinc-400 mb-1">Selezionati</div>
          {data.spells.length===0 && <div className="text-sm text-zinc-500">Nessun incantesimo o preghiera selezionato.</div>}
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {data.spells.map(s=>{
              const ref = (SPELLS_DB as SpellEntry[]).find(x=>x.id===s.refId);
              if (!ref) return null;
              return (
                <div key={s.id} className="rounded-lg border border-zinc-700 p-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{ref.name}</div>
                      <div className="text-xs text-zinc-400">{ref.kind} • Tier {ref.tier}{ref.foc ? ` • ${ref.foc}` : ''}</div>
                    </div>
                    <button className="btn !bg-zinc-800" onClick={()=>removeSpell(s.id)}>Rimuovi</button>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">Note</div>
                  <input
                    className="input"
                    placeholder="Annotazioni (variante, focus, dominio, ecc.)"
                    value={s.notes||""}
                    onChange={e=>setData(d=>({...d, spells: d.spells.map(x=>x.id===s.id?{...x, notes:e.target.value}:x)}))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Equip */}
      <section className="card">
        <h2 className="card-title">Equip</h2>

        <div className="grid md:grid-cols-2 gap-3">
          {/* Armi */}
          <div className="rounded-lg border border-zinc-700 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Armi</div>
              <button className="btn" onClick={()=>setData(d=>({...d, weapons:[...d.weapons, { id:uid(), name:"", notes:"", damageSeg:1, equipped:false }]}))}>
                + Aggiungi arma
              </button>
            </div>
            <div className="space-y-2 mt-2">
              {data.weapons.length===0 && <div className="text-sm text-zinc-500">Nessuna arma.</div>}
              {data.weapons.map(w=>(
                <div key={w.id} className="rounded border border-zinc-700 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Nome">
                      <input className="input" value={w.name}
                        onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, name:e.target.value}:x)}))}/>
                    </Field>
                    <Field label="Danno (segmenti)">
                      <input type="number" className="input text-center" value={w.damageSeg ?? 1}
                        onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, damageSeg: parseInt(e.target.value||"1")}:x)}))}/>
                    </Field>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-zinc-400 mb-1">Note</div>
                    <input className="input" value={w.notes||""}
                      onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, notes:e.target.value}:x)}))}/>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="text-xs text-zinc-400 flex items-center gap-2">
                      <input type="checkbox" checked={!!w.equipped}
                        onChange={e=>setData(d=>({...d, weapons: d.weapons.map(x=>x.id===w.id?{...x, equipped:e.target.checked}:x)}))}/>
                      Equipaggiata
                    </label>
                    <button className="btn !bg-zinc-800" onClick={()=>setData(d=>({...d, weapons:d.weapons.filter(x=>x.id!==w.id)}))}>
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Armature */}
          <div className="rounded-lg border border-zinc-700 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Armature</div>
              <button className="btn" onClick={()=>setData(d=>({...d, armors:[...d.armors, { id:uid(), name:"", bonusD6:1, notes:"", equipped:false }]}))}>
                + Aggiungi armatura
              </button>
            </div>
            <div className="space-y-2 mt-2">
              {data.armors.length===0 && <div className="text-sm text-zinc-500">Nessuna armatura.</div>}
              {data.armors.map(a=>(
                <div key={a.id} className="rounded border border-zinc-700 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Nome">
                      <input className="input" value={a.name}
                        onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, name:e.target.value}:x)}))}/>
                    </Field>
                    <Field label="Bonus DIF (d6)">
                      <input type="number" className="input text-center" value={a.bonusD6}
                        onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, bonusD6: parseInt(e.target.value||"0")}:x)}))}/>
                    </Field>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-zinc-400 mb-1">Note</div>
                    <input className="input" value={a.notes||""}
                      onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, notes:e.target.value}:x)}))}/>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="text-xs text-zinc-400 flex items-center gap-2">
                      <input type="checkbox" checked={!!a.equipped}
                        onChange={e=>setData(d=>{
                          // equipparne al massimo una: se attivo questo, disattivo le altre
                          const on = e.target.checked;
                          return {...d, armors: d.armors.map(x => x.id===a.id ? {...x, equipped:on} : {...x, equipped:false})};
                        })}/>
                      Equipaggiata
                    </label>
                    <button className="btn !bg-zinc-800" onClick={()=>setData(d=>({...d, armors:d.armors.filter(x=>x.id!==a.id)}))}>
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Descrizione PG */}
      <section className="card">
        <h2 className="card-title">Descrizione PG</h2>
        <textarea
          className="input min-h-28 mt-2"
          placeholder="Origini, tratti, legami, obiettivi, note…"
          value={data.notes||""}
          onChange={e=>setData(d=>({...d, notes: e.target.value}))}
        />
      </section>
    </main>
  );
}

/* ========== UI helpers (stili minimi tailwind riusabili) ========== */
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      {children}
    </div>
  );
}
function QuickCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4">
      <div className="text-sm text-zinc-400 mb-1">{title}</div>
      {children}
    </div>
  );
}

/* Piccole utility CSS via classi generiche */
declare module "react" {
  interface HTMLAttributes<T> {
    // nessun extra
  }
}

// classi comuni
// .card
// .card-title
// .input
// .btn
// Aggiungile nel globals.css o usa tailwind classi inline qui: