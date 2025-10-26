// src/pages/table/[code].tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { ChatProvider } from "@/lib/chat/bus";
import ChatPanel from "@/components/table/ChatPanel";
import RoomToolbar from "@/components/table/RoomToolbar";

type Room = {
  id: string;
  title: string;
  description: string;
  date: string | null;
  maxPlayers?: number;
  tags: string[];
  visibility: "public" | "private";
  inviteCode: string;
  ownerId: string;
  participants: string[];
  path: string;
  me: { id: string; isGM: boolean };
};

export default function TableRoom() {
  const router = useRouter();
  const { code } = router.query as { code?: string };
  const { data: session, status } = useSession();

  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  // carica dati stanza
  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/by-code/${code}`, {
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || `Errore ${res.status}`);
        setRoom(j);
      } catch (e: any) {
        setError(e?.message || "Errore di caricamento");
      }
    })();
  }, [code]);

  if (status === "loading") return <div className="p-6">Caricamento sessione…</div>;

  if (!session)
    return (
      <div className="p-6">
        Devi effettuare il login.{" "}
        <a className="underline" href="/">
          Vai al login
        </a>
      </div>
    );

  if (error) return <div className="p-6 text-red-400">Errore: {error}</div>;
  if (!room || !code) return <div className="p-6">Caricamento stanza…</div>;

  const max = room.maxPlayers ?? 5;

  return (
    <ChatProvider roomCode={String(code)}>
      {/* Toolbar laterale a scomparsa, uguale per ogni stanza */}
      <RoomToolbar roomCode={String(code)} isGM={room.me.isGM} />

      {/* Contenuto principale stanza */}
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
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(room.inviteCode);
                } catch {}
              }}
              className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              Copia invito
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="p-4 rounded-xl bg-zinc-800">
              Area di gioco (realtime)
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-zinc-800">
              <div className="text-sm text-zinc-400">Partecipanti</div>
              <div className="mt-2 text-sm">
                {room.participants.length} giocatori / max {max}
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

      {/* Chat flottante */}
      <div className="fixed bottom-3 right-3 w-96 h-80 bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 z-40">
        <ChatPanel />
      </div>
    </ChatProvider>
  );
}