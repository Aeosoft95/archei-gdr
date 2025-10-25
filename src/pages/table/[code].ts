import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

type Room = {
  id: string;
  title: string;
  description: string;
  inviteCode: string;
  ownerId: string;
  participants: string[];
  me: { id: string; isGM: boolean };
};

export default function TableRoom() {
  const router = useRouter();
  const { code } = router.query as { code?: string };
  const { data: session, status } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("arch_token") : null;
  const wsRef = useRef<WebSocket | null>(null);

  // carica dati stanza
  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/by-code/${code}`, { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Errore ${res.status}`);
        }
        const j = await res.json();
        setRoom(j);
      } catch (e: any) {
        setError(e?.message || "Errore di caricamento");
      }
    })();
  }, [code]);

  // connessione WS
  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_WS_URL || "";
    if (!base) return null;
    const t = token ? `&token=${encodeURIComponent(token)}` : "";
    const c = code ? `?room=${encodeURIComponent(code)}${t}` : (token ? `?token=${encodeURIComponent(token)}` : "");
    return `${base}${c}`;
  }, [code, token]);

  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // esempio: annuncia JOIN
      ws.send(JSON.stringify({ type: "join", code }));
    };
    ws.onmessage = (ev) => {
      // in futuro: dispatch su store / stato locale
      // console.log("WS:", ev.data);
    };
    ws.onclose = () => { wsRef.current = null; };
    ws.onerror = () => {};

    return () => { try { ws.close(); } catch {} };
  }, [wsUrl, code]);

  if (status === "loading") return <div className="p-6">Caricamento sessione…</div>;
  if (!session) {
    return (
      <div className="p-6">
        Devi effettuare il login. <a className="underline" href="/">Vai al login</a>
      </div>
    );
  }
  if (error) return <div className="p-6 text-red-400">Errore: {error}</div>;
  if (!room) return <div className="p-6">Caricamento stanza…</div>;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {room.title} <span className="text-zinc-400">#{room.inviteCode}</span>
        </h1>
        <div className="flex items-center gap-2">
          {room.me.isGM && (
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs uppercase tracking-wide">
              GM
            </span>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(room.inviteCode)}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Copia invito
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          {/* QUI in futuro: chat/scene/turni/dadi/handouts */}
          <div className="p-4 rounded-xl bg-zinc-800">Area di gioco (in tempo reale)</div>
        </div>
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-zinc-800">
            <div className="text-sm text-zinc-400">Partecipanti</div>
            <div className="mt-2 text-sm">
              {room.participants.length} giocatori / max {room.maxPlayers ?? 5}
            </div>
          </div>

          {room.me.isGM && (
            <div className="p-4 rounded-xl bg-zinc-800 space-y-2">
              <div className="text-sm text-zinc-400 mb-1">Strumenti GM</div>
              <button className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm">
                Avvia scena (soon)
              </button>
              <button className="w-full px-3 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm">
                Impostazioni sessione (soon)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}