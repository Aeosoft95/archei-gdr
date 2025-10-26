// src/components/table/MiniChat.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import { useChatBus } from "@/lib/chat/bus";

type Pos = { x: number; y: number };

export default function MiniChat({ roomCode }: { roomCode: string }) {
  const storageKeyOpen = useMemo(() => `minichat-open:${roomCode}`, [roomCode]);
  const storageKeyCount = useMemo(() => `minichat-unread:${roomCode}`, [roomCode]);
  const storageKeyPos = useMemo(() => `minichat-pos:${roomCode}`, [roomCode]);

  const { messages, wsReady, me } = useChatBus();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // posizione fissata con left/top, trascinabile
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const draggingRef = useRef<{ dx: number; dy: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // ripristina stato
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKeyOpen);
      if (v === "1") setOpen(true);
      const u = parseInt(localStorage.getItem(storageKeyCount) || "0", 10);
      if (!isNaN(u)) setUnread(u);

      const saved = localStorage.getItem(storageKeyPos);
      if (saved) {
        const p = JSON.parse(saved) as Pos;
        setPos(p);
      } else {
        // default: in basso a destra con un piccolo margine
        const init = () => {
          const w = Math.min(window.innerWidth, 384); // ~w-96
          const h = Math.min(window.innerHeight, 320); // ~h-80
          const x = Math.max(12, window.innerWidth - w - 12);
          const y = Math.max(12, window.innerHeight - h - 12);
          setPos({ x, y });
        };
        init();
        window.setTimeout(init, 0);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // salva open/close
  useEffect(() => {
    try { localStorage.setItem(storageKeyOpen, open ? "1" : "0"); } catch {}
    if (open) {
      setUnread(0);
      try { localStorage.setItem(storageKeyCount, "0"); } catch {}
    }
  }, [open, storageKeyOpen, storageKeyCount]);

  // ESC per chiudere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // non letti (solo non miei)
  const prevLenRef = useRef(0);
  useEffect(() => {
    const len = messages.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;

    if (!open && len > prev) {
      const mineId = me?.id ? String(me.id) : undefined;
      const newly = messages.slice(prev);
      const inc = newly.reduce((acc, m: any) => {
        const notifiable = m.type === "chat" || m.type === "dice" || m.type === "system";
        const fromId = m?.from?.id ? String(m.from.id) : undefined;
        if (notifiable && (!mineId || fromId !== mineId)) return acc + 1;
        return acc;
      }, 0);
      if (inc > 0) {
        const next = unread + inc;
        setUnread(next);
        try { localStorage.setItem(storageKeyCount, String(next)); } catch {}
      }
    }
  }, [messages, open, me?.id, unread, storageKeyCount]);

  // drag helpers
  const clampPos = (x: number, y: number) => {
    const el = rootRef.current;
    const pad = 8;
    const w = el ? el.offsetWidth : 360;
    const h = el ? el.offsetHeight : 320;
    const maxX = Math.max(0, window.innerWidth - w - pad);
    const maxY = Math.max(0, window.innerHeight - h - pad);
    return { x: Math.min(Math.max(pad, x), maxX), y: Math.min(Math.max(pad, y), maxY) };
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    draggingRef.current = { dx: clientX - pos.x, dy: clientY - pos.y };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const mx = (ev as TouchEvent).touches ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const my = (ev as TouchEvent).touches ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const d = draggingRef.current!;
      const np = clampPos(mx - d.dx, my - d.dy);
      setPos(np);
    };

    const onUp = () => {
      draggingRef.current = null;
      window.removeEventListener("mousemove", onMove as any);
      window.removeEventListener("mouseup", onUp as any);
      window.removeEventListener("touchmove", onMove as any);
      window.removeEventListener("touchend", onUp as any);
      try { localStorage.setItem(storageKeyPos, JSON.stringify(pos)); } catch {}
    };

    window.addEventListener("mousemove", onMove as any);
    window.addEventListener("mouseup", onUp as any);
    window.addEventListener("touchmove", onMove as any, { passive: false });
    window.addEventListener("touchend", onUp as any);
  };

  return (
    <div
      ref={rootRef}
      className="fixed z-40"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* pulsante toggle (draggable quando chiusa) */}
      <button
        onMouseDown={!open ? startDrag : undefined}
        onTouchStart={!open ? startDrag : undefined}
        onClick={() => setOpen(v => !v)}
        className="relative px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-sm hover:bg-zinc-700"
        aria-label={open ? "Chiudi chat" : "Apri chat"}
      >
        {open ? "Chiudi chat" : "Apri chat"}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {unread}
          </span>
        )}
        <span className={`ml-2 text-[10px] ${wsReady ? "text-emerald-400" : "text-zinc-400"}`}>
          {wsReady ? "WS on" : "WS off"}
        </span>
      </button>

      {/* pannello */}
      <div
        className={`mt-2 border border-zinc-700 rounded-xl shadow-xl bg-zinc-900/90 transition-all
          ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}
          w-[92vw] h-[45vh] sm:w-96 sm:h-80
        `}
      >
        {/* barra superiore (draggable quando aperta) */}
        <div
          className="h-8 px-3 flex items-center justify-between border-b border-zinc-700 cursor-move select-none"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
        >
          <span className="text-xs text-zinc-400">Chat</span>
          <button
            className="text-xs text-zinc-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="p-3 h-[calc(100%-2rem)]">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}