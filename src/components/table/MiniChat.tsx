// src/components/table/MiniChat.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import { useChatBus } from "@/lib/chat/bus";

/**
 * Widget chat flottante:
 * - Toggle apri/chiudi (salvato per-stanza)
 * - Badge non letti quando chiusa (conta solo msg non miei)
 * - ESC per chiudere
 * - Dimensioni responsive
 */
export default function MiniChat({ roomCode }: { roomCode: string }) {
  const storageKeyOpen = useMemo(() => `minichat-open:${roomCode}`, [roomCode]);
  const storageKeyCount = useMemo(() => `minichat-unread:${roomCode}`, [roomCode]);

  const { messages, wsReady, me } = useChatBus();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // ripristina stato
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKeyOpen);
      if (v === "1") setOpen(true);
      const u = parseInt(localStorage.getItem(storageKeyCount) || "0", 10);
      if (!isNaN(u)) setUnread(u);
    } catch {}
  }, [storageKeyOpen, storageKeyCount]);

  // salva aperto/chiuso
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyOpen, open ? "1" : "0");
    } catch {}
    if (open) {
      setUnread(0);
      try {
        localStorage.setItem(storageKeyCount, "0");
      } catch {}
    }
  }, [open, storageKeyOpen, storageKeyCount]);

  // ESC per chiudere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // calcolo non letti: quando è chiusa, conta i messaggi nuovi non miei
  const prevLenRef = useRef(0);
  useEffect(() => {
    const len = messages.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;

    if (!open && len > prev) {
      const mineId = me?.id ? String(me.id) : undefined;
      const newlyArrived = messages.slice(prev);
      const increment = newlyArrived.reduce((acc, m) => {
        // consideriamo chat/dice/system come “notificabili”
        const isNotifiable =
          m.type === "chat" || m.type === "dice" || m.type === "system";
        const fromId = (m as any)?.from?.id
          ? String((m as any).from.id)
          : undefined;

        // conta solo se non è un mio messaggio
        if (isNotifiable && (!mineId || fromId !== mineId)) return acc + 1;
        return acc;
      }, 0);

      if (increment > 0) {
        const next = unread + increment;
        setUnread(next);
        try {
          localStorage.setItem(storageKeyCount, String(next));
        } catch {}
      }
    }
  }, [messages, open, me?.id, unread, storageKeyCount]);

  return (
    <div className="fixed bottom-3 right-3 z-40">
      {/* pulsante toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-sm hover:bg-zinc-700"
        aria-label={open ? "Chiudi chat" : "Apri chat"}
      >
        {open ? "Chiudi chat" : "Apri chat"}
        {/* badge non letti */}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {unread}
          </span>
        )}
        <span
          className={`ml-2 text-[10px] ${
            wsReady ? "text-emerald-400" : "text-zinc-400"
          }`}
        >
          {wsReady ? "WS on" : "WS off"}
        </span>
      </button>

      {/* pannello chat (responsive) */}
      <div
        className={`mt-2 border border-zinc-700 rounded-xl p-3 shadow-xl bg-zinc-900/90 transition-all
          ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}
          w-[92vw] h-[45vh] sm:w-96 sm:h-80
        `}
      >
        <ChatPanel />
      </div>
    </div>
  );
}