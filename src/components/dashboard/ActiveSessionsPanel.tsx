"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Item = {
  id: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  ownerId: string;
  inviteCode: string;
  playersNow: number;
  playersMax: number;
  date: string | null;
  createdAt: string;
};

export default function ActiveSessionsPanel() {
  const { data: sess } = useSession();
  const me = (sess?.user as any)?.id || null;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/sessions/active", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message || "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // refresh ogni 20s
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Sessioni attive</h3>
        <button
          onClick={load}
          className="px-2 py-1 text-sm rounded border border-zinc-600 hover:bg-zinc-800"
        >
          Aggiorna
        </button>
      </div>

      {loading && <div className="text-sm text-zinc-400">Caricamento…</div>}
      {err && <div className="text-sm text-red-400">{err}</div>}
      {!loading && !err && items.length === 0 && (
        <div className="text-sm text-zinc-400">Nessuna sessione attiva.</div>
      )}

      <ul className="space-y-3">
        {items.map((s) => {
          const isGM = me && s.ownerId === me;
          return (
            <li key={s.id} className="p-3 rounded border border-zinc-700 hover:bg-zinc-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{s.title}</div>
                  {isGM && (
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-300 text-black">
                      GM
                    </span>
                  )}
                </div>
                <button
                  onClick={() => window.location.assign(`/sessions/${s.id}`)}
                  className="px-3 py-1 text-sm rounded bg-white text-black"
                >
                  Entra
                </button>
              </div>

              <div className="text-xs text-zinc-400 mt-1">
                Player {s.playersNow}/{s.playersMax} • {s.visibility}
              </div>

              {s.description && (
                <div className="text-sm text-zinc-200 mt-2 line-clamp-2">
                  {s.description}
                </div>
              )}

              <div className="text-xs text-zinc-400 mt-2">
                Codice invito: <span className="font-mono">{s.inviteCode}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
