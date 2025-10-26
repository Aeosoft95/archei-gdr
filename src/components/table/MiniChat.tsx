// src/components/table/MiniChat.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import { useChatBus } from "@/lib/chat/bus";

/**
 * MiniChat trascinabile con apertura auto:
 * - Posizione (x,y) salvata per-stanza
 * - Badge non letti quando chiusa
 * - Apertura sopra/sotto e destra/sinistra in base allo spazio
 */
export default function MiniChat({ roomCode }: { roomCode: string }) {
  const { messages, wsReady } = useChatBus();

  const storagePos = useMemo(() => `minichat-pos:${roomCode}`, [roomCode]);
  const storageOpen = useMemo(() => `minichat-open:${roomCode}`, [roomCode]);
  const storageUnread = useMemo(() => `minichat-unread:${roomCode}`, [roomCode]);

  // posizione assoluta del bottone (top-left del bottone)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // refs per misura
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // posizione di default: in basso a destra con margini
  useEffect(() => {
    const M = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    let defX = vw - 280;
    let defY = vh - 80;
    try {
      const saved = localStorage.getItem(storagePos);
      if (saved) {
        const obj = JSON.parse(saved);
        if (typeof obj?.x === "number" && typeof obj?.y === "number") {
          defX = obj.x; defY = obj.y;
        }
      }
    } catch {}
    setPos(clampToViewport({ x: defX, y: defY }, M));
  }, [storagePos]);

  // ripristina open/unread
  useEffect(() => {
    try {
      if (localStorage.getItem(storageOpen) === "1") setOpen(true);
      const u = parseInt(localStorage.getItem(storageUnread) || "0", 10);
      if (!isNaN(u)) setUnread(u);
    } catch {}
  }, [storageOpen, storageUnread]);

  // salva stato open
  useEffect(() => {
    try { localStorage.setItem(storageOpen, open ? "1" : "0"); } catch {}
    if (open) {
      setUnread(0);
      try { localStorage.setItem(storageUnread, "0"); } catch {}
    }
  }, [open, storageOpen, storageUnread]);

  // conteggio non letti quando chiusa
  const prevLenRef = useRef(0);
  useEffect(() => {
    const len = messages.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!open && len > prev) {
      const delta = len - prev;
      const next = unread + delta;
      setUnread(next);
      try { localStorage.setItem(storageUnread, String(next)); } catch {}
    }
  }, [messages.length, open, unread, storageUnread]);

  // drag
  const draggingRef = useRef<{ dx: number; dy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    draggingRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const M = 8;
    const { dx, dy } = draggingRef.current;
    const x = e.clientX - dx;
    const y = e.clientY - dy;
    const clamped = clampToViewport({ x, y }, M);
    setPos(clamped);
    try { localStorage.setItem(storagePos, JSON.stringify(clamped)); } catch {}
  };
  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // ricalcola clamp su resize
  useEffect(() => {
    const onResize = () => {
      const M = 8;
      setPos(p => clampToViewport(p, M));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // apertura auto: sopra/sotto e destra/sinistra
  const { vertical, horizontal } = useAutoPlacement(pos, btnRef, panelRef);

  return (
    <div
      className="fixed z-40"
      style={{ left: Math.round(pos.x), top: Math.round(pos.y) }}
    >
      {/* Pulsante toggle (draggable) */}
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => setOpen(v => !v)}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="relative px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-sm hover:bg-zinc-700 select-none cursor-grab active:cursor-grabbing"
        aria-label={open ? "Chiudi chat" : "Apri chat"}
      >
        {open ? "Chiudi chat" : "Apri chat"}
        {/* badge non letti */}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {unread}
          </span>
        )}
        <span className={`ml-2 text-[10px] ${wsReady ? "text-emerald-400" : "text-zinc-400"}`}>
          {wsReady ? "WS on" : "WS off"}
        </span>
      </button>

      {/* Pannello (assoluto relativo al bottone) */}
      <div
        ref={panelRef}
        className={`absolute w-96 h-80 bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 shadow-xl transition-all
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        style={{
          ...(vertical === "above"
            ? { bottom: (btnRef.current?.offsetHeight || 40) + 8 }
            : { top: (btnRef.current?.offsetHeight || 40) + 8 }),
          ...(horizontal === "right"
            ? { left: 0 }
            : { right: 0 }),
        }}
      >
        <ChatPanel />
      </div>
    </div>
  );
}

/** Tiene il bottone dentro la viewport, con margine M */
function clampToViewport(p: { x: number; y: number }, M: number): { x: number; y: number } {
  const vw = window.innerWidth, vh = window.innerHeight;
  // dimensione stimata del bottone (fallback)
  const BW = 140, BH = 40;
  let x = p.x, y = p.y;
  if (x < M) x = M;
  if (y < M) y = M;
  if (x > vw - BW - M) x = vw - BW - M;
  if (y > vh - BH - M) y = vh - BH - M;
  return { x, y };
}

/** Decide sopra/sotto e destra/sinistra secondo lo spazio */
function useAutoPlacement(
  pos: { x: number; y: number },
  btnRef: React.RefObject<HTMLButtonElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>
): { vertical: "above" | "below"; horizontal: "left" | "right" } {
  const [state, setState] = useState<{ vertical: "above" | "below"; horizontal: "left" | "right" }>({
    vertical: "below",
    horizontal: "right",
  });

  useEffect(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const btnW = btnRef.current?.offsetWidth