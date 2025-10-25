// src/components/dashboard/ActiveSessionsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";

type SessionItem = {
  id: string;
  title: string;
  description?: string;
  inviteCode?: string;
  code?: string;
  ownerId: string;
  participants?: string[];
  maxPlayers?: number;
  isGM?: boolean;
};

export default function ActiveSessionsPanel() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions/mine", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Errore caricamento");
      setItems(j.sessions || []);
    } catch (e: any) {
      setError(e?.message || "Errore");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Eliminare la sessione "${title}"?`)) return;
    setDeletingId(id);
    setError("");

    // update ottimistico
    const prev = items;
    setItems((curr) => curr.filter((s) => s.id !== id));

    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Errore ${res.status}`);
    } catch (e: any) {
      // rollback in caso di errore
      setItems(prev);
      setError(e?.message || "Eliminazione fallita");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl">
        Caricamento sessioni…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-red-400">
        {error}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl">
        <div className="text-sm text-zinc-300">Nessuna sessione attiva.</div>
      </div>
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
          <div
            key={s.id}
            className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl flex items-start justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="font-medium">{s.title}</div>
                {s.isGM && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                    GM
                  </span>
                )}
              </div>

              {s.description ? (
                <div className="text-sm text-zinc-400">{s.description}</div>
              ) : null}

              <div className="text-xs text-zinc-400">
                Giocatori: {players}/{max} · Invito:{" "}
                <span className="font-mono">{code}</span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link href={href}>
                <Button variant="primary">Entra</Button>
              </Link>

              {s.isGM && (
                <Button
                  variant="secondary"
                  className="bg-red-600 hover:bg-red-700 text-white border-red-700"
                  disabled={deletingId === s.id}
                  onClick={() => handleDelete(s.id, s.title)}
                >
                  {deletingId === s.id ? "Elimino…" : "Elimina"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}