"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type Session = {
  id: string;
  name: string;
  description: string;
  maxPlayers: number;
  playersCount: number;
  code: string;
};

export function ActiveSessionsPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔄 Carica le sessioni attive dal server
  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/sessions/list");
      const data = await r.json();
      if (r.ok && Array.isArray(data.sessions)) setSessions(data.sessions);
    } catch (err) {
      console.error("Errore caricamento sessioni:", err);
    } finally {
      setLoading(false);
    }
  }

  // Effettua polling ogni 5 secondi per aggiornare la lista
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  function handleJoin(sessionId: string) {
    // In futuro: router.push(`/session/${sessionId}`)
    alert(`Entrando nella sessione: ${sessionId}`);
  }

  return (
    <Card title="Sessioni Attive">
      {/* Stato di caricamento */}
      {loading && <p className="text-white/70 text-sm">Caricamento…</p>}

      {/* Nessuna sessione attiva */}
      {!loading && sessions.length === 0 && (
        <p className="text-white/70 text-sm">Nessuna sessione attiva al momento.</p>
      )}

      {/* Lista sessioni */}
      <ul className="space-y-3">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between bg-white/5 px-4 py-2 rounded-md border border-white/10 hover:bg-white/10 transition"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{s.name}</p>
              <p className="text-xs text-white/60 truncate">
                {s.playersCount}/{s.maxPlayers} giocatori · codice:{" "}
                <span className="font-mono">{s.code}</span>
              </p>
              {s.description && (
                <p className="text-xs text-white/60 mt-1 line-clamp-2">
                  {s.description}
                </p>
              )}
            </div>

            {/* Pulsante "Entra" */}
            <Button
              variant="secondary"
              onClick={() => handleJoin(s.id)}
              className="text-sm py-1.5"
            >
              🎲 Entra
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
