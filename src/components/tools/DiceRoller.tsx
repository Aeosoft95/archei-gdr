"use client";

import { useState } from "react";
import { Button } from "../ui/button";

type Precision = 1 | 3 | 4 | 5 | 6;

export default function DiceRoller() {
  const [mode, setMode] = useState<"single" | "opposed">("single");

  // single
  const [theor, setTheor] = useState<number>(5);
  const [real, setReal] = useState<number | "">("");
  const [precision, setPrecision] = useState<Precision | "">("");
  const [target, setTarget] = useState<number | "">("");

  // opposed
  const [atk, setAtk] = useState({ theor: 7, real: "", precision: "" as Precision | "" });
  const [def, setDef] = useState({ theor: 6, real: "", precision: "" as Precision | "" });

  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function roll() {
    setLoading(true);
    setOut(null);
    try {
      let payload: any;
      if (mode === "single") {
        payload = {
          mode,
          theor: Number(theor),
          real: real === "" ? undefined : Number(real),
          precision: precision === "" ? undefined : Number(precision),
          target: target === "" ? undefined : Number(target),
        };
      } else {
        payload = {
          mode,
          attacker: {
            theor: Number(atk.theor),
            real: atk.real === "" ? undefined : Number(atk.real),
            precision: atk.precision === "" ? undefined : Number(atk.precision),
          },
          defender: {
            theor: Number(def.theor),
            real: def.real === "" ? undefined : Number(def.real),
            precision: def.precision === "" ? undefined : Number(def.precision),
          },
        };
      }

      const res = await fetch("/api/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setOut(j);
    } catch (e: any) {
      setOut({ error: e?.message || "Errore" });
    } finally {
      setLoading(false);
    }
  }

  const precisionOptions = [1, 3, 4, 5, 6] as const;

  return (
    <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === "single" ? "primary" : "secondary"} onClick={() => setMode("single")}>
          Tiro Singolo
        </Button>
        <Button variant={mode === "opposed" ? "primary" : "secondary"} onClick={() => setMode("opposed")}>
          Tiro Contrapposto
        </Button>
      </div>

      {mode === "single" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Dadi teorici</label>
            <input className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
              type="number" min={1} value={theor} onChange={e => setTheor(Number(e.target.value))}/>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Dadi reali (max 5)</label>
            <input className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
              type="number" min={1} max={5} value={real} onChange={e => setReal(e.target.value === "" ? "" : Number(e.target.value))}/>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Precisione</label>
            <select className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
              value={precision} onChange={e => setPrecision(e.target.value === "" ? "" : (Number(e.target.value) as Precision))}>
              <option value="">—</option>
              {precisionOptions.map(p => <option key={p} value={p}>{p}+</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Successi richiesti (opz.)</label>
            <input className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
              type="number" min={1} value={target} onChange={e => setTarget(e.target.value === "" ? "" : Number(e.target.value))}/>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attaccante */}
          <div className="p-3 bg-zinc-900/40 rounded border border-zinc-700">
            <div className="text-sm font-medium mb-2">Attaccante</div>
            <div className="grid grid-cols-3 gap-2">
              <input className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                type="number" min={1} placeholder="Teorici" value={atk.theor}
                onChange={e => setAtk({ ...atk, theor: Number(e.target.value) })}/>
              <input className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                type="number" min={1} max={5} placeholder="Reali"
                value={atk.real} onChange={e => setAtk({ ...atk, real: e.target.value === "" ? "" : Number(e.target.value) })}/>
              <select className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                value={atk.precision} onChange={e => setAtk({ ...atk, precision: e.target.value === "" ? "" : (Number(e.target.value) as Precision) })}>
                <option value="">Precisione</option>
                {precisionOptions.map(p => <option key={p} value={p}>{p}+</option>)}
              </select>
            </div>
          </div>
          {/* Difensore */}
          <div className="p-3 bg-zinc-900/40 rounded border border-zinc-700">
            <div className="text-sm font-medium mb-2">Difensore</div>
            <div className="grid grid-cols-3 gap-2">
              <input className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                type="number" min={1} placeholder="Teorici" value={def.theor}
                onChange={e => setDef({ ...def, theor: Number(e.target.value) })}/>
              <input className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                type="number" min={1} max={5} placeholder="Reali"
                value={def.real} onChange={e => setDef({ ...def, real: e.target.value === "" ? "" : Number(e.target.value) })}/>
              <select className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                value={def.precision} onChange={e => setDef({ ...def, precision: e.target.value === "" ? "" : (Number(e.target.value) as Precision) })}>
                <option value="">Precisione</option>
                {precisionOptions.map(p => <option key={p} value={p}>{p}+</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="primary" onClick={roll} disabled={loading}>
          {loading ? "Tiro..." : "Lancia i dadi"}
        </Button>
        <Button variant="secondary" onClick={() => setOut(null)} disabled={loading}>
          Pulisci
        </Button>
      </div>

      {out && (
        <pre className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs overflow-auto">
{JSON.stringify(out, null, 2)}
        </pre>
      )}
    </div>
  );
}