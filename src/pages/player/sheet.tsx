// src/pages/sheet.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SPELLS_DB } from "@/data/spells";

type Attrs = { FOR:number; DES:number; COS:number; INT:number; SAP:number; CAR:number };
type Ability = { id:string; name:string; rank:0|1|2|3|4; desc?:string };
type Weapon = { id:string; name:string; notes?:string; damageSeg?:number; equipped?:boolean };
type Armor  = { id:string; name:string; bonusD6:number; notes?:string; equipped?:boolean };
type SpellTier="I"|"II"|"III"|"IV"; type SpellKind="Incantesimo"|"Preghiera";
type SpellEntry = { id:string; name:string; kind:SpellKind; tier:SpellTier; school?:string; action?:string; range?:string; duration?:string; foc?:string; text:string };
type LearnedSpell = { id:string; refId:string; notes?:string };
type PCData = {
  ident:{ name:string; race:string; clazz:string; level:number; portraitUrl?:string };
  attrs: Attrs;
  quick:{ hp:number; foc:number; difMod?:number };
  abilities: Ability[]; weapons: Weapon[]; armors: Armor[]; spells: LearnedSpell[];
  notes?: string;
};

const uid = () => Math.random().toString(36).slice(2,9);
const EMPTY_PC:PCData = {
  ident:{ name:"", race:"", clazz:"", level:1, portraitUrl:"" },
  attrs:{ FOR:0, DES:0, COS:0, INT:0, SAP:0, CAR:0 },
  quick:{ hp:10, foc:3, difMod:0 },
  abilities:[], weapons:[], armors:[], spells:[], notes:""
};

// ===== Helpers =====
function normalizePC(inData:any): PCData {
  const b = EMPTY_PC;
  return {
    ident:  { ...b.ident,  ...(inData?.ident  || {}) },
    attrs:  { ...b.attrs,  ...(inData?.attrs  || {}) },
    quick:  { ...b.quick,  ...(inData?.quick  || {}) },
    abilities: Array.isArray(inData?.abilities) ? inData.abilities : [],
    weapons:   Array.isArray(inData?.weapons)   ? inData.weapons   : [],
    armors:    Array.isArray(inData?.armors)    ? inData.armors    : [],
    spells:    Array.isArray(inData?.spells)    ? inData.spells    : [],
    notes: typeof inData?.notes === "string" ? inData.notes : "",
  };
}
function derivedHP(level:number, COS:number){ return Math.max(1, 8 + COS + Math.max(0,level-1)*2); }
function calcDIF(des:number, armor:number, mod:number=0){ return 10 + Math.max(0,des) + Math.max(0,armor) + (mod||0); }
const clamp = (n:number, a:number, b:number) => Math.max(a, Math.min(b, n));

// ===== Local backup =====
const STORAGE_KEY = "pc:last";
function readLocal(): PCData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizePC(JSON.parse(raw));
  } catch { return null; }
}
function writeLocal(data: PCData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function SheetPage(){
  const [data,setData] = useState<PCData>(EMPTY_PC);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [status,setStatus] = useState<string>("");
  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load: API → fallback localStorage
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/player/sheet", { cache:"no-store", credentials:"include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json().catch(()=> ({}));
        const incoming = j?.data ? normalizePC(j.data) : null;
        if (!alive) return;

        if (incoming) {
          setData(incoming);
          writeLocal(incoming); // aggiorna cache locale allineata al server
        } else {
          // fallback locale se il server non ha (ancora) persistenza
          const local = readLocal();
          setData(local ?? EMPTY_PC);
        }
      } catch {
        const local = readLocal();
        setData(local ?? EMPTY_PC);
        setStatus("Offline: caricata copia locale.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Auto-backup locale (debounced 500ms) ad ogni modifica
  useEffect(() => {
    if (loading) return; // evita il primo paint
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => writeLocal(data), 500);
    return () => { if (debTimer.current) clearTimeout(debTimer.current); };
  }, [data, loading]);

  // Calcoli rapidi
  const equippedArmor = useMemo(()=> (data?.armors || []).find(a=>a.equipped), [data?.armors]);
  const armorBonus = equippedArmor?.bonusD6 ?? 0;
  const sugHP = useMemo(()=> derivedHP(data?.ident?.level ?? 1, data?.attrs?.COS ?? 0), [data?.ident?.level, data?.attrs?.COS]);
  const dif   = useMemo(()=> calcDIF(data?.attrs?.DES ?? 0, armorBonus, data?.quick?.difMod ?? 0), [data?.attrs?.DES, armorBonus, data?.quick?.difMod]);

  // Spells
  const [spellQuery,setSpellQuery] = useState("");
  const [spellKind,setSpellKind]   = useState<"all"|SpellKind>("all");
  const [spellTier,setSpellTier]   = useState<"all"|SpellTier>("all");
  const filteredSpells = useMemo(()=>{
    let list = SPELLS_DB as SpellEntry[];
    if(spellKind!=="all") list = list.filter(s=>s.kind===spellKind);
    if(spellTier!=="all") list = list.filter(s=>s.tier===spellTier);
    const q = spellQuery.trim().toLowerCase();
    if(q){
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.text?.toLowerCase() ?? "").includes(q) ||
        (s.school?.toLowerCase() ?? "").includes(q)
      );
    }
    return list;
  },[spellKind,spellTier,spellQuery]);

  function addSpell(ref:SpellEntry){
    if(data.spells.some(s=>s.refId===ref.id)) return;
    setData(d=>({...d, spells:[...d.spells, { id:uid(), refId:ref.id, notes:"" }]}));
  }
  function removeSpell(id:string){ setData(d=>({...d, spells:d.spells.filter(s=>s.id!==id)})); }

  // Save: prova server, comunque aggiorna backup locale
  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const payload = normalizePC({
        ...data,
        ident: { ...data.ident, level: clamp(data.ident.level ?? 1, 1, 50) },
        attrs: {
          FOR: clamp(data.attrs.FOR ?? 0, 0, 20),
          DES: clamp(data.attrs.DES ?? 0, 0, 20),
          COS: clamp(data.attrs.COS ?? 0, 0, 20),
          INT: clamp(data.attrs.INT ?? 0, 0, 20),
          SAP: clamp(data.attrs.SAP ?? 0, 0, 20),
          CAR: clamp(data.attrs.CAR ?? 0, 0, 20),
        },
        quick: {
          hp: clamp(data.quick?.hp ?? 0, 0, 999),
          foc: clamp(data.quick?.foc ?? 0, 0, 99),
          difMod: clamp(data.quick?.difMod ?? 0, -20, 50),
        },
      });

      // Aggiorna subito backup locale (per sicurezza)
      writeLocal(payload);

      const r = await fetch("/api/player/sheet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ data: payload }), // se il tuo endpoint vuole data “raw”, sostituisci con: JSON.stringify(payload)
      });

      let ok = r.ok;
      let msg = "";
      try {
        const jr = await r.json();
        ok = ok && (jr?.ok !== false); // accettiamo sia true/undefined che assenza
        if (jr?.message) msg = String(jr.message);
      } catch { /* ignore */ }

      setStatus(ok ? "Salvato ✅" : (msg || "Salvato in locale (server non ha confermato)"));
    } catch {
      setStatus("Offline: salvato in locale 💾");
    } finally {
      setSaving(false);
      setTimeout(()=> setStatus(""), 2500);
    }
  }

  function resetLocal() {
    if (!confirm("Sicuro di resettare la scheda corrente?")) return;
    setData(EMPTY_PC);
    writeLocal(EMPTY_PC);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-6xl mx-auto px-4 py-6">Caricamento…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-zinc-950/85 backdrop-blur border-b border-zinc-800 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <span className="text-sm text-zinc-300 font-medium">Scheda Personaggio</span>
          <div className="flex items-center gap-2">
            {status && <span className="text-xs text-zinc-400">{status}</span>}
            <button className="btn-subtle" onClick={resetLocal}>Reset</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving? "Salvo…" : "Salva"}</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
        {/* IDENTITÀ + RITRATTO */}
        <section className="card p-3">
          <SectionTitle icon="👤" title="Identità" />
          <div className="grid md:grid-cols-[1fr_220px] gap-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Field label="Nome"><input className="input" value={data.ident.name} onChange={e=>setData(d=>({...d,ident:{...d.ident,name:e.target.value}}))}/></Field>
              <Field label="Razza"><input className="input" value={data.ident.race} onChange={e=>setData(d=>({...d,ident:{...d.ident,race:e.target.value}}))}/></Field>
              <Field label="Classe"><input className="input" value={data.ident.clazz} onChange={e=>setData(d=>({...d,ident:{...d.ident,clazz:e.target.value}}))}/></Field>
              <Field label="Livello"><input type="number" min={1} className="input text-center" value={data.ident.level} onChange={e=>setData(d=>({...d,ident:{...d.ident,level:parseInt(e.target.value||"1")}}))}/></Field>
              <div className="sm:col-span-2 lg:col-span-4">
                <div className="label">Ritratto (URL)</div>
                <input className="input" placeholder="https://…" value={data.ident.portraitUrl||""} onChange={e=>setData(d=>({...d, ident:{...d.ident, portraitUrl:e.target.value}}))}/>
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/40 h-[150px]">
              {data.ident.portraitUrl
                ? <img src={data.ident.portraitUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center text-xs text-zinc-500">Nessuna immagine</div>}
            </div>
          </div>
        </section>

        {/* QUICK BOX */}
        <section className="grid md:grid-cols-3 gap-3">
          <QuickCard title="HP" icon="❤️">
            <div className="flex items-center gap-2">
              <input type="number" className="input text-center w-24" value={data.quick?.hp ?? 0} onChange={e=>setData(d=>({...d, quick:{...d.quick, hp:parseInt(e.target.value||"0")}}))}/>
              <span className="hint">Suggerito <b className="text-zinc-200">{sugHP}</b></span>
            </div>
          </QuickCard>
          <QuickCard title="DIF" icon="🛡️">
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-semibold">{dif}</div>
              <span className="hint">10 + DES ({data.attrs?.DES ?? 0}) + Arm. ({armorBonus}d6) + Mod.</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="label">Mod.</span>
              <input type="number" className="input text-center w-24" value={data.quick?.difMod ?? 0} onChange={e=>setData(d=>({...d, quick:{...d.quick, difMod:parseInt(e.target.value||"0")}}))}/>
            </div>
          </QuickCard>
          <QuickCard title="FOC" icon="✨">
            <input type="number" className="input text-center w-24" value={data.quick?.foc ?? 0} onChange={e=>setData(d=>({...d, quick:{...d.quick, foc:parseInt(e.target.value||"0")}}))}/>
          </QuickCard>
        </section>

        {/* ATTRIBUTI */}
        <section className="card p-3">
          <SectionTitle icon="📊" title="Caratteristiche" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-1">
            {(["FOR","DES","COS","INT","SAP","CAR"] as (keyof Attrs)[]).map(k=>(
              <Field key={k} label={k}>
                <input type="number" className="input text-center" value={data.attrs?.[k] ?? 0} onChange={e=>setData(d=>({...d, attrs:{...d.attrs, [k]:parseInt(e.target.value||"0")}}))}/>
              </Field>
            ))}
          </div>
        </section>

        {/* ABILITÀ */}
        <section className="card p-3">
          <div className="flex items-center justify-between">
            <SectionTitle icon="🧩" title="Abilità" />
            <button className="btn-primary" onClick={()=>setData(d=>({...d, abilities:[...d.abilities, { id:uid(), name:"", rank:0, desc:""}]}))}>+ Aggiungi</button>
          </div>
          <div className="space-y-2 mt-2">
            {data.abilities.length===0 && <Empty text="Nessuna abilità."/>}
            {data.abilities.map(ab=>(
              <div key={ab.id} className="row">
                <div className="grid md:grid-cols-3 gap-2 w-full">
                  <Field label="Nome"><input className="input" value={ab.name} onChange={e=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, name:e.target.value}:x)}))}/></Field>
                  <Field label="Grado">
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost" onClick={()=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, rank:Math.max(0,x.rank-1) as any}:x)}))}>−</button>
                      <div className="chip">{ab.rank}</div>
                      <button className="btn-ghost" onClick={()=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, rank:Math.min(4,x.rank+1) as any}:x)}))}>+</button>
                    </div>
                  </Field>
                  <div className="flex items-end justify-end">
                    <button className="btn-subtle" onClick={()=>setData(d=>({...d, abilities:d.abilities.filter(x=>x.id!==ab.id)}))}>Elimina</button>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="label">Descrizione</div>
                  <textarea className="input min-h-18" value={ab.desc||""} onChange={e=>setData(d=>({...d, abilities:d.abilities.map(x=>x.id===ab.id?{...x, desc:e.target.value}:x)}))}/>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INCANTESIMI */}
        <section className="card p-3">
          <SectionTitle icon="📜" title="Incantesimi & Preghiere" />
          <div className="grid md:grid-cols-4 gap-2 mt-1">
            <Field label="Cerca (nome, testo, scuola)" className="md:col-span-2">
              <input className="input" placeholder="es. Dardo, Benedizione…" value={spellQuery} onChange={e=>setSpellQuery(e.target.value)}/>
            </Field>
            <Field label="Tipo">
              <select className="input" value={spellKind} onChange={e=>setSpellKind(e.target.value as any)}>
                <option value="all">Tutti</option><option value="Incantesimo">Incantesimi</option><option value="Preghiera">Preghiere</option>
              </select>
            </Field>
            <Field label="Tier">
              <select className="input" value={spellTier} onChange={e=>setSpellTier(e.target.value as any)}>
                <option value="all">Tutti</option><option value="I">I</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option>
              </select>
            </Field>
          </div>

          <div className="mt-2">
            <div className="label mb-1">Risultati</div>
            <div className="space-y-1.5 max-h-60 overflow-auto pr-1">
              {filteredSpells.length===0 && <Empty text="Nessun risultato."/>}
              {filteredSpells.map(s=>{
                const already = data.spells.some(ls=>ls.refId===s.id);
                return (
                  <div key={s.id} className="row">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="meta">
                          {s.kind} • Tier {s.tier}{s.school?` • ${s.school}`:""}{s.foc?` • ${s.foc}`:""}{s.action?` • ${s.action}`:""}{s.range?` • ${s.range}`:""}{s.duration?` • ${s.duration}`:""}
                        </div>
                      </div>
                      <button className={already?"btn-disabled":"btn-primary"} disabled={already} onClick={()=>addSpell(s)}>
                        {already?"✓ Aggiunto":"+ Aggiungi"}
                      </button>
                    </div>
                    <div className="text-sm text-zinc-300 mt-1">{s.text}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-800 mt-2 pt-2">
            <div className="label mb-1">Selezionati</div>
            {data.spells.length===0 && <Empty text="Nessun incantesimo o preghiera selezionato."/>}
            <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
              {data.spells.map(s=>{
                const ref = (SPELLS_DB as SpellEntry[]).find(x=>x.id===s.refId);
                if(!ref) return null;
                return (
                  <div key={s.id} className="row">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{ref.name}</div>
                        <div className="meta">{ref.kind} • Tier {ref.tier}{ref.foc?` • ${ref.foc}`:""}</div>
                      </div>
                      <button className="btn-subtle" onClick={()=>removeSpell(s.id)}>Rimuovi</button>
                    </div>
                    <div className="label mt-1">Note</div>
                    <input className="input" placeholder="Annotazioni (variante, focus, dominio, ecc.)"
                      value={s.notes||""} onChange={e=>setData(d=>({...d, spells:d.spells.map(x=>x.id===s.id?{...x, notes:e.target.value}:x)}))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* EQUIP */}
        <section className="card p-3">
          <SectionTitle icon="🗡️" title="Equip" />
          <div className="grid md:grid-cols-2 gap-3">
            {/* Armi */}
            <div className="subcard">
              <div className="flex items-center justify-between">
                <div className="font-medium">Armi</div>
                <button className="btn-primary" onClick={()=>setData(d=>({...d, weapons:[...d.weapons, { id:uid(), name:"", notes:"", damageSeg:1, equipped:false }]}))}>+ Aggiungi</button>
              </div>
              <div className="space-y-1.5 mt-2">
                {data.weapons.length===0 && <Empty text="Nessuna arma."/>}
                {data.weapons.map(w=>(
                  <div key={w.id} className="row">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Nome"><input className="input" value={w.name} onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, name:e.target.value}:x)}))}/></Field>
                      <Field label="Danno (seg)">
                        <input type="number" className="input text-center" value={w.damageSeg ?? 1}
                          onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, damageSeg:parseInt(e.target.value||"1")}:x)}))}/>
                      </Field>
                    </div>
                    <div className="label mt-1">Note</div>
                    <input className="input" value={w.notes||""} onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, notes:e.target.value}:x)}))}/>
                    <div className="mt-1 flex items-center justify-between">
                      <label className="meta flex items-center gap-2">
                        <input type="checkbox" checked={!!w.equipped} onChange={e=>setData(d=>({...d, weapons:d.weapons.map(x=>x.id===w.id?{...x, equipped:e.target.checked}:x)}))}/>
                        Equipaggiata
                      </label>
                      <button className="btn-subtle" onClick={()=>setData(d=>({...d, weapons:d.weapons.filter(x=>x.id!==w.id)}))}>Elimina</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Armature */}
            <div className="subcard">
              <div className="flex items-center justify-between">
                <div className="font-medium">Armature</div>
                <button className="btn-primary" onClick={()=>setData(d=>({...d, armors:[...d.armors, { id:uid(), name:"", bonusD6:1, notes:"", equipped:false }]}))}>+ Aggiungi</button>
              </div>
              <div className="space-y-1.5 mt-2">
                {data.armors.length===0 && <Empty text="Nessuna armatura."/>}
                {data.armors.map(a=>(
                  <div key={a.id} className="row">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Nome"><input className="input" value={a.name} onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, name:e.target.value}:x)}))}/></Field>
                      <Field label="Bonus DIF (d6)">
                        <input type="number" className="input text-center" value={a.bonusD6}
                          onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, bonusD6:parseInt(e.target.value||"0")}:x)}))}/>
                      </Field>
                    </div>
                    <div className="label mt-1">Note</div>
                    <input className="input" value={a.notes||""} onChange={e=>setData(d=>({...d, armors:d.armors.map(x=>x.id===a.id?{...x, notes:e.target.value}:x)}))}/>
                    <div className="mt-1 flex items-center justify-between">
                      <label className="meta flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!a.equipped}
                          onChange={e=>setData(d=>{
                            const on = e.target.checked;
                            return {...d, armors:d.armors.map(x => x.id===a.id ? {...x, equipped:on} : {...x, equipped:false})};
                          })}
                        />
                        Indossata (calcolata in DIF)
                      </label>
                      <button className="btn-subtle" onClick={()=>setData(d=>({...d, armors:d.armors.filter(x=>x.id!==a.id)}))}>Elimina</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* DESCRIZIONE */}
        <section className="card p-3">
          <SectionTitle icon="📝" title="Descrizione PG" />
          <textarea className="input min-h-24 mt-1" placeholder="Origini, tratti, legami, obiettivi, note…"
            value={data.notes||""} onChange={e=>setData(d=>({...d, notes:e.target.value}))}/>
        </section>
      </div>
    </main>
  );
}

/* ===== UI helpers ===== */
function SectionTitle({icon,title}:{icon:string; title:string}){
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-base">{icon}</span>
      <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-300">{title}</h2>
    </div>
  );
}
function Field({label,children,className=""}:{label:string; children:React.ReactNode; className?:string}){
  return (
    <div className={className}>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}
function QuickCard({title,icon,children}:{title:string;icon:string;children:React.ReactNode}){
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <div className="text-xs text-zinc-400">{title}</div>
      </div>
      {children}
    </div>
  );
}
function Empty({text}:{text:string}){ return <div className="text-sm text-zinc-500">{text}</div>; }