// src/components/sheet/SheetPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

/* ===== Tipi ===== */
type Attrs = { FOR:number; DES:number; COS:number; INT:number; SAP:number; CAR:number };
type PCData = {
  ident:{ name:string; race:string; clazz:string; level:number; portraitUrl?:string };
  attrs: Attrs;
  quick:{ hp:number; foc:number; difMod:number };
  notes?: string;
};

/* ===== Util ===== */
const nnum = (v:any, d=0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const nstr = (v:any, d="") => (typeof v==="string" ? v : (v==null?d:String(v)));
const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

const EMPTY: PCData = {
  ident:{ name:"", race:"", clazz:"", level:1, portraitUrl:"" },
  attrs:{ FOR:0, DES:0, COS:0, INT:0, SAP:0, CAR:0 },
  quick:{ hp:10, foc:3, difMod:0 },
  notes:""
};

function normalize(raw:any): PCData{
  const r = raw || {};
  const quick = r?.quick ?? {};
  // shim legacy: mods.difMod → quick.difMod
  const dif = Number.isFinite(Number(quick?.difMod)) ? Number(quick?.difMod)
            : Number.isFinite(Number(r?.mods?.difMod)) ? Number(r?.mods?.difMod) : 0;
  return {
    ident:{
      name: nstr(r?.ident?.name), race:nstr(r?.ident?.race), clazz:nstr(r?.ident?.clazz),
      level: nnum(r?.ident?.level,1) || 1, portraitUrl:nstr(r?.ident?.portraitUrl,"")
    },
    attrs:{
      FOR:nnum(r?.attrs?.FOR,0), DES:nnum(r?.attrs?.DES,0), COS:nnum(r?.attrs?.COS,0),
      INT:nnum(r?.attrs?.INT,0), SAP:nnum(r?.attrs?.SAP,0), CAR:nnum(r?.attrs?.CAR,0)
    },
    quick:{ hp:nnum(quick?.hp,10), foc:nnum(quick?.foc,3), difMod:dif },
    notes:nstr(r?.notes,"")
  };
}

const derivedHP = (lvl:number, COS:number)=>Math.max(1,8 + COS + Math.max(0,lvl-1)*2);
const calcDIF   = (DES:number, armor:number, mod:number)=>10 + Math.max(0,DES) + Math.max(0,armor) + (mod||0);

export default function SheetPanel({ onClose }: { onClose: () => void }){
  const [data,setData] = useState<PCData>(EMPTY);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving]   = useState(false);
  const [status,setStatus]   = useState("");

  // Carica SOLO da API
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{
        const r = await fetch("/api/player/sheet", { cache:"no-store", credentials:"include" });
        if(!r.ok) throw new Error(String(r.status));
        const j = await r.json().catch(()=> ({}));
        const incoming = j?.data ? normalize(j.data) : EMPTY;
        if(!alive) return;
        setData(incoming);
      }catch{
        setData(EMPTY);
        setStatus("Offline");
      }finally{
        if(alive) setLoading(false);
      }
    })();
    return ()=>{ alive=false; };
  },[]);

  // Calcoli rapidi (armatura non gestita qui → 0)
  const sugHP = useMemo(()=>derivedHP(data.ident.level, data.attrs.COS), [data.ident.level, data.attrs.COS]);
  const dif   = useMemo(()=>calcDIF(data.attrs.DES, 0, data.quick.difMod), [data.attrs.DES, data.quick.difMod]);

  async function save(){
    setSaving(true); setStatus("");
    try{
      const payload:PCData = normalize({
        ...data,
        ident:{ ...data.ident, level: clamp(nnum(data.ident.level,1),1,50) },
        attrs:{
          FOR:clamp(nnum(data.attrs.FOR,0),0,20),
          DES:clamp(nnum(data.attrs.DES,0),0,20),
          COS:clamp(nnum(data.attrs.COS,0),0,20),
          INT:clamp(nnum(data.attrs.INT,0),0,20),
          SAP:clamp(nnum(data.attrs.SAP,0),0,20),
          CAR:clamp(nnum(data.attrs.CAR,0),0,20),
        },
        quick:{
          hp: clamp(nnum(data.quick.hp,10),0,999),
          foc: clamp(nnum(data.quick.foc,3),0,99),
          difMod: clamp(nnum(data.quick.difMod,0),-20,50),
        }
      });

      const r = await fetch("/api/player/sheet", {
        method:"POST", credentials:"include",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ data: payload })
      });

      let ok = r.ok; let msg = "";
      try{
        const jr = await r.json();
        ok = ok && (jr?.ok !== false);
        if(jr?.message) msg = String(jr.message);
        if(jr?.data) setData(normalize(jr.data)); // se il server restituisce i dati, allineiamo
      }catch{/* risposta non-json: ok */}

      setStatus(ok ? "Salvato ✅" : (msg || "Non confermato ❗"));
    }catch{
      setStatus("Errore rete ❌");
    }finally{
      setSaving(false);
      setTimeout(()=>setStatus(""), 2500);
    }
  }

  const panel = (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* backdrop cliccabile */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />

      {/* pannello */}
      <div className="absolute right-4 bottom-4 w-[min(100vw-2rem,900px)] h-[min(90vh,720px)] pointer-events-auto
                      rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">Scheda Personaggio</span>
            {status && <span className="text-xs text-zinc-400">{status}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-md bg-zinc-200 text-zinc-900 text-sm font-medium disabled:opacity-60">
              {saving ? "Salvo…" : "Salva"}
            </button>
            <button onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-800">
              Chiudi
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-auto p-3 space-y-3 text-zinc-100">
          {loading ? (
            <div className="text-sm text-zinc-400">Caricamento…</div>
          ) : (
            <>
              {/* Identità */}
              <section className="rounded-lg border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Identità</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <Labeled label="Nome">
                    <input className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                      value={data.ident.name}
                      onChange={e=>setData(d=>({...d, ident:{...d.ident, name:e.target.value}}))}
                    />
                  </Labeled>
                  <Labeled label="Razza">
                    <input className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                      value={data.ident.race}
                      onChange={e=>setData(d=>({...d, ident:{...d.ident, race:e.target.value}}))}
                    />
                  </Labeled>
                  <Labeled label="Classe">
                    <input className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                      value={data.ident.clazz}
                      onChange={e=>setData(d=>({...d, ident:{...d.ident, clazz:e.target.value}}))}
                    />
                  </Labeled>
                  <Labeled label="Livello">
                    <input type="number" min={1}
                      className="w-full text-center px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                      value={data.ident.level}
                      onChange={e=>setData(d=>({...d, ident:{...d.ident, level:nnum(e.target.value,1)}}))}
                    />
                  </Labeled>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-zinc-400 mb-1">Ritratto (URL)</div>
                  <input className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                    placeholder="https://…"
                    value={data.ident.portraitUrl||""}
                    onChange={e=>setData(d=>({...d, ident:{...d.ident, portraitUrl:e.target.value}}))}
                  />
                </div>
              </section>

              {/* Quick */}
              <section className="grid md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">HP</div>
                  <div className="flex items-center gap-2">
                    <input type="number"
                      className="w-24 text-center px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                      value={data.quick.hp}
                      onChange={e=>setData(d=>({...d, quick:{...d.quick, hp:nnum(e.target.value,10)}}))}
                    />
                    <span className="text-xs text-zinc-400">Suggerito <b className="text-zinc-200">{sugHP}</b></span>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">DIF</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-xl font-semibold">{dif}</div>
                    <span className="text-xs text-zinc-400">10 + DES ({data.attrs.DES}) + Mod.</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Mod.</span>
                    <input type="number"
                      className="w-24 text-center px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                      value={data.quick.difMod}
                      onChange={e=>setData(d=>({...d, quick:{...d.quick, difMod:nnum(e.target.value,0)}}))}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">FOC</div>
                  <input type="number"
                    className="w-24 text-center px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                    value={data.quick.foc}
                    onChange={e=>setData(d=>({...d, quick:{...d.quick, foc:nnum(e.target.value,3)}}))}
                  />
                </div>
              </section>

              {/* Caratteristiche */}
              <section className="rounded-lg border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Caratteristiche</div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {(["FOR","DES","COS","INT","SAP","CAR"] as (keyof Attrs)[]).map(k=>(
                    <Labeled key={k} label={k}>
                      <input type="number"
                        className="w-full text-center px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                        value={data.attrs[k]}
                        onChange={e=>setData(d=>({...d, attrs:{...d.attrs, [k]:nnum(e.target.value,0)}}))}
                      />
                    </Labeled>
                  ))}
                </div>
              </section>

              {/* Note */}
              <section className="rounded-lg border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Note</div>
                <textarea
                  className="w-full min-h-24 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md"
                  placeholder="Annotazioni…"
                  value={data.notes||""}
                  onChange={e=>setData(d=>({...d, notes:e.target.value}))}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}

function Labeled({label, children}:{label:string; children:React.ReactNode}){
  return (
    <label className="block">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      {children}
    </label>
  );
}
