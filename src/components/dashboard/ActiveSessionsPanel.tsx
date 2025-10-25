// src/components/dashboard/ActiveSessionsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type SessionItem = {
  id: string;
  title: string;
  description?: string;
  inviteCode?: string;
  code?: string; // compat vecchio indice
  ownerId: string;
  participants?: string[];
  maxPlayers?: number;
};

export default function ActiveSessionsPanel() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sessions/mine", { cache: "no-store" });
        const j = await res.json();
        if (res.ok) setItems(j.sessions || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Card className="p-4 bg-zinc-800 border border-zinc-700">
        Caricamento sessioni…
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card className="p-4 bg-zinc-800 border border-zinc-700">
        <div className="text-sm text-zinc-300">Nessuna sessione attiva.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((s) => {
        const code = (s.inviteCode || s.code || "").toUpperCase();
        const href = `/table/${code}`;
        const players = s.participants?.length ?? 1;
        const max = s.maxPlayers ?? 5;

        return (
          <Card
            key={s.id}
            className="p-4 bg-zinc-800 border border-zinc-700 flex items-start justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="font-medium">{s.title}</div>
                {/* se sei GM metti un badge (il backend può anche arricchire la risposta,
                    qui teniamo semplice: il GM è l'owner) */}
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  GM
                </span>
              </div>
              {s.description ? (
                <div className="text-sm text-zinc-400">{s.description}</div>
              ) : null}
              <div className="text-xs text-zinc-400">
                Giocatori: {players}/{max} · Invito: <span className="font-mono">{code}</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link href={href}>
                <Button variant="primary">Entra</Button>
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}