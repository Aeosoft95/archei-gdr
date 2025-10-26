// src/pages/player/sheet.tsx
"use client";

import { useMemo, useState } from "react";
import { SPELLS_DB } from "@/data/spells";

// Tipi minimi
type SpellTier = "I" | "II" | "III" | "IV";
type SpellKind = "Incantesimo" | "Preghiera";
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

export default function PlayerSheetPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | SpellKind>("all");
  const [tier, setTier] = useState<"all" | SpellTier>("all");

  const results = useMemo(() => {
    let list = SPELLS_DB as SpellEntry[];
    if (kind !== "all") list = list.filter((s) => s.kind === kind);
    if (tier !== "all") list = list.filter((s) => s.tier === tier);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.text?.toLowerCase() ?? "").includes(q) ||
          (s.school?.toLowerCase() ?? "").includes(q)
      );
    }
    return list;
  }, [query, kind, tier]);

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Scheda Personaggio — Incantesimi</h1>
        <a
          href="/table"
          className="text-sm px-3 py-1.5 rounded border border-zinc-700 hover:bg-zinc-800"
        >
          ← Torna al tavolo
        </a>
      </header>

      {/* Filtri */}
      <section className="p-4 rounded-xl bg-zinc-800 border border-zinc-700">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-zinc-400 mb-1">Cerca (nome, testo, scuola)</div>
            <input
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 outline-none focus:border-zinc-500"
              placeholder="es. Dardo, Benedizione, Purificazione…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-zinc-400 mb-1">Tipo</div>
            <select
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
            >
              <option value="all">Tutti</option>
              <option value="Incantesimo">Incantesimi</option>
              <option value="Preghiera">Preghiere</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-zinc-400 mb-1">Tier</div>
            <select
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
              value={tier}
              onChange={(e) => setTier(e.target.value as any)}
            >
              <option value="all">Tutti</option>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </div>
        </div>
      </section>

      {/* Risultati */}
      <section className="p-4 rounded-xl bg-zinc-800 border border-zinc-700">
        <div className="text-sm text-zinc-400 mb-2">
          Risultati: <span className="text-zinc-200 font-semibold">{results.length}</span>
        </div>

        {results.length === 0 ? (
          <div className="text-sm text-zinc-500">Nessun risultato.</div>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
            {results.map((s) => (
              <div key={s.id} className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-xs text-zinc-400">
                      {s.kind} • Tier {s.tier}
                      {s.school ? ` • ${s.school}` : ""}
                      {s.foc ? ` • ${s.foc}` : ""}
                      {s.action ? ` • ${s.action}` : ""}
                      {s.range ? ` • ${s.range}` : ""}
                      {s.duration ? ` • ${s.duration}` : ""}
                    </div>
                  </div>
                  {/* Placeholder per “Aggiungi alla mia lista” se/quando servirà */}
                  <button
                    className="text-sm px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-800"
                    onClick={() => alert("In futuro: aggiunta alla lista personale")}
                  >
                    + Aggiungi
                  </button>
                </div>
                <div className="text-sm mt-2">{s.text}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}