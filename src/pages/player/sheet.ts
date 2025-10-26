// src/pages/player/sheet.tsx
"use client";

import { useMemo, useState } from "react";
import SpellsList from "@/components/sheet/SpellsList";
import type { PCData } from "@/types/character";
import { EMPTY_PC } from "@/types/character";

export default function PlayerSheetPage() {
  // per ora mock locale: agganciare poi a /api/player/sheet GET/POST
  const [pc] = useState<PCData>(EMPTY_PC);

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Scheda Personaggio</h1>
        <a
          href="/table"
          className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm"
        >
          ← Torna al tavolo
        </a>
      </header>

      {/* Dati essenziali (placeholder) */}
      <section className="rounded-xl border border-zinc-800 p-3 bg-zinc-900/60">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><div className="text-xs text-zinc-400">Nome</div><div className="text-lg">{pc.ident.name || "—"}</div></div>
          <div><div className="text-xs text-zinc-400">Razza</div><div>{pc.ident.race || "—"}</div></div>
          <div><div className="text-xs text-zinc-400">Classe</div><div>{pc.ident.clazz || "—"}</div></div>
          <div><div className="text-xs text-zinc-400">Livello</div><div>{pc.ident.level ?? 1}</div></div>
        </div>
      </section>

      {/* Solo la lista incantesimi (come richiesto) */}
      <section className="rounded-xl border border-zinc-800 p-3 bg-zinc-900/60">
        <h2 className="font-semibold mb-2">Incantesimi & Preghiere</h2>
        <SpellsList />
      </section>
    </main>
  );
}