// src/components/sheet/SpellsList.tsx
"use client";
import { useMemo, useState } from "react";
import { SPELLS_DB } from "@/data/spells";

export default function SpellsList() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "Incantesimo" | "Preghiera">("all");
  const [tier, setTier] = useState<"all" | "I" | "II" | "III" | "IV">("all");

  const results = useMemo(() => {
    let list = SPELLS_DB;
    if (kind !== "all") list = list.filter(s => s.kind === kind);
    if (tier !== "all") list = list.filter(s => s.tier === tier);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.text?.toLowerCase() ?? "").includes(q) ||
      (s.school?.toLowerCase() ?? "").includes(q)
    );
    return list;
  }, [query, kind, tier]);

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-4 gap-2">
        <input
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
          placeholder="Cerca…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
          value={kind}
          onChange={e => setKind(e.target.value as any)}
        >
          <option value="all">Tutti</option>
          <option value="Incantesimo">Incantesimi</option>
          <option value="Preghiera">Preghiere</option>
        </select>
        <select
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
          value={tier}
          onChange={e => setTier(e.target.value as any)}
        >
          <option value="all">Tutti</option>
          <option value="I">I</option>
          <option value="II">II</option>
          <option value="III">III</option>
          <option value="IV">IV</option>
        </select>
      </div>

      <div className="space-y-2 max-h-96 overflow-auto pr-1">
        {results.length === 0 && (
          <div className="text-sm text-zinc-500">Nessun risultato.</div>
        )}
        {results.map(s => (
          <div key={s.id} className="rounded-lg border border-zinc-800 p-2">
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-zinc-400">
              {s.kind} • Tier {s.tier}{s.school ? ` • ${s.school}` : ""}{s.foc ? ` • ${s.foc}` : ""}{s.action ? ` • ${s.action}` : ""}{s.range ? ` • ${s.range}` : ""}{s.duration ? ` • ${s.duration}` : ""}
            </div>
            <div className="text-sm mt-1">{s.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}