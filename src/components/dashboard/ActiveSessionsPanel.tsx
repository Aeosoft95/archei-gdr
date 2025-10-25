"use client";
import { useEffect, useState } from "react";

type SessionItem = {
  id: string;
  title: string;
  visibility: "public" | "private";
  ownerId: string;
  date: string | null;
  createdAt: string;
};

export default function ActiveSessionsPanel() {
  const [items, setItems] = useState<SessionItem[]>([]);
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
    // refresh periodico di sicurezza (30s)
    const t = setInterval(load, 30000);
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

      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="p-3 rounded border border-zinc-700 hover:bg-zinc-800">
            <div className="flex items-center justify-between">
              <div className="font-medium">{s.title}</div>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                {s.visibility}
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {s.date ? new Date(s.date).toLocaleString() : "Senza data"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
