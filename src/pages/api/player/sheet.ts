// src/pages/sheet.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { SPELLS_DB } from "@/data/spells";

// --- Tipi minimi necessari solo per la sezione incantesimi ---
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

type LearnedSpell = { id: string; refId: string; notes?: string };

// Struttura parziale della scheda sul server (usata per merge save)
type PCData = {
  ident?: { name?: string };
  spells?: LearnedSpell[];
  // altre proprietà possono esistere: le manteniamo così come sono
  [k: string]: any;
};

const uid = () => Math.random().toString(36).slice(2, 9);

export default function SpellsOnlyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pc, setPc] = useState<PCData>({ spells: [] });

  // stato ricerca
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | SpellKind>("all");
  const [tier, setTier] = useState<"all" | SpellTier>("all");

  // carica scheda dal server
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/player/sheet", { cache: "no-store" });
        if (r.status === 401) {
          // se non autenticato, rimanda alla home/login
          router.push("/");
          return;
        }
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        const data: PCData = j?.data || { spells: [] };
        setPc({
          ...data,
          spells: Array.isArray(data.spells)
            ? data.spells.map((s) => ({ id: s.id || uid(), refId: s.refId, notes: s.notes || "" }))
            : [],
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // filtra risultati DB
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

  function addSpell(ref: SpellEntry) {
    if ((pc.spells || []).some((x) => x.refId === ref.id)) return;
    setPc((d) => ({ ...d, spells: [...(d.spells || []), { id: uid(), refId: ref.id, notes: "" }] }));
  }

  function removeSpell(id: string) {
    setPc((d) => ({ ...d, spells: (d.spells || []).filter((x) => x.id !== id) }));
  }

  async function save() {
    setSaving(true);
    try {
      // merge: manteniamo tutto il resto della scheda inviato dal server
      const payload: PCData = {
        ...pc,
        spells: (pc.spells || []).map((s) => ({ id: s.id || uid(), refId: s.refId, notes: s.notes || "" })),
      };
      const r = await fetch("/api/player/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("save error");
      alert("Incantesimi salvati ✅");
    } catch (e: any) {
      alert("Errore salvataggio: " + (e?.message || "sconosciuto"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6">Caricamento…</main>;
  }

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Testata semplice */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-2xl font-semibold">Incantesimi & Preghiere</div>
          <div className="text-sm text-zinc-400">
            {pc?.ident?.name ? `Scheda: ${pc.ident.name}` : "Scheda personaggio"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/table" className="btn !bg-zinc-800">
            ↩︎ Tavolo
          </a>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Salvo…" : "💾 Salva"}
          </button>
        </div>
      </div>

      {/* Barra ricerca/filtri */}
      <section className="rounded-xl border border-zinc-800 p-3">
        <div className="grid md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <div className="label">Cerca per nome o testo</div>
            <input
              className="input"
              placeholder="es. Dardo, Benedizione, Purificazione…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <div className="label">Tipo</div>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="all">Tutti</option>
              <option value="Incantesimo">Incantesimi</option>
              <option value="Preghiera">Preghiere</option>
            </select>
          </div>
          <div>
            <div className="label">Tier</div>
            <select className="input" value={tier} onChange={(e) => setTier(e.target.value as any)}>
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
      <section className="rounded-xl border border-zinc-800 p-3">
        <div className="label mb-2">Risultati</div>
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {results.length === 0 && <div className="text-sm text-zinc-500">Nessun risultato.</div>}
          {results.map((s) => {
            const already = (pc.spells || []).some((ls) => ls.refId === s.id);
            return (
              <div key={s.id} className="rounded-lg border border-zinc-800 p-2">
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
                  <button
                    className={`btn ${already ? "!bg-zinc-800 cursor-not-allowed" : ""}`}
                    disabled={already}
                    onClick={() => addSpell(s)}
                  >
                    {already ? "✓ Aggiunto" : "+ Aggiungi"}
                  </button>
                </div>
                <div className="text-sm mt-1">{s.text}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Selezionati */}
      <section className="rounded-xl border border-zinc-800 p-3">
        <div className="label mb-2">Selezionati</div>
        {(pc.spells || []).length === 0 && (
          <div className="text-sm text-zinc-500">Nessun incantesimo o preghiera selezionato.</div>
        )}
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {(pc.spells || []).map((s) => {
            const ref = (SPELLS_DB as SpellEntry[]).find((x) => x.id === s.refId);
            if (!ref) return null;
            return (
              <div key={s.id} className="rounded-lg border border-zinc-800 p-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{ref.name}</div>
                    <div className="text-xs text-zinc-400">
                      {ref.kind} • Tier {ref.tier}
                      {ref.school ? ` • ${ref.school}` : ""}
                      {ref.foc ? ` • ${ref.foc}` : ""}
                    </div>
                  </div>
                  <button className="btn !bg-zinc-800" onClick={() => removeSpell(s.id)}>
                    Rimuovi
                  </button>
                </div>
                <div className="label mt-2">Note</div>
                <input
                  className="input"
                  placeholder="Annotazioni rapide (variante, focus, dominio, ecc.)"
                  value={s.notes || ""}
                  onChange={(e) =>
                    setPc((d) => ({
                      ...d,
                      spells: (d.spells || []).map((x) => (x.id === s.id ? { ...x, notes: e.target.value } : x)),
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}