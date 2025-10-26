// src/components/table/MiniChat.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import { useChatBus } from "@/lib/chat/bus";

/**
 * Widget chat flottante:
 * - Drag entro viewport con persistenza posizione
 * - Toggle apri/chiudi (salvato per stanza)
 * - Badge non letti quando chiusa
 * - Apertura automatica sopra/sotto e sinistra/destra in base allo spazio
 */

type Pos = { x: number; y: number };

export default function MiniChat({ roomCode }: { roomCode: string }) {
  const storageKeyOpen = useMemo(() => `minichat-open:${roomCode}`, [roomCode]);
  const storageKeyCount = useMemo(() => `minichat-unread:${roomCode}`, [roomCode]);
  const storageKeyPos = useMemo(() => `minichat-pos:${roomCode}`, [roomCode]);

  const { messages, wsReady } = useChatBus();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // posizione pulsante (ancora per panel)
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });

  // refs
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });

  // ripristina stato
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKeyOpen);
      if (v === "1") setOpen(true);
      const u = parseInt(localStorage.getItem(storageKeyCount) || "0", 10);
      if (!isNaN(u)) setUnread(u);

      const p = localStorage.getItem(storageKeyPos);
      if (p) {
        const parsed = JSON.parse(p);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos({ x: parsed.x, y: parsed.y });
        }
      } else {
        // default bottom-right con margine
        const m = 12;
        const btnW = 120; // stima iniziale (aggiorneremo al primo render/drag)
        const btnH = 36;
        setPos({
          x: Math.max(m, window.innerWidth - btnW - m),
          y: Math.max(m, window.innerHeight - btnH - m),
        });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // salva aperto/chiuso
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyOpen, open ? "1" : "0");
    } catch {}
  }, [open, storageKeyOpen]);

  // salva posizione
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyPos, JSON.stringify(pos));
    } catch {}
  }, [pos, storageKeyPos]);

  // non letti: se arriva un messaggio mentre è chiusa → +1
  const prevLenRef = useRef(0);
  useEffect(() => {
    const len = messages.length;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!open && len > prev) {
      const delta = len - prev;
      const next = unread + delta;
      setUnread(next);
      try {
        localStorage.setItem(storageKeyCount, String(next));
      } catch {}
    }
  }, [messages.length, open, unread, storageKeyCount]);

  // reset non letti quando apro
  useEffect(() => {
    if (open) {
      setUnread(0);
      try {
        localStorage.setItem(storageKeyCount, "0");
      } catch {}
    }
  }, [open, storageKeyCount]);

  // drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragOffsetRef.current.dx;
      const dy = e.clientY - dragOffsetRef.current.dy;

      const btn = btnRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const bw = btn?.offsetWidth ?? 120;
      const bh = btn?.offsetHeight ?? 36;
      const margin = 4;

      const nx = Math.min(w - bw - margin, Math.max(margin, dx));
      const ny = Math.min(h - bh - margin, Math.max(margin, dy));
      setPos({ x: nx, y: ny });

      e.preventDefault();
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // calcola apertura auto: sopra/sotto e sinistra/destra
  const placement = useAutoPlacement(pos, btnRef, panelRef);

  return (
    <div className="fixed z-40" style={{ left: pos.x, top: pos.y }}>
      {/* pulsante toggle/drag */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        onMouseDown={(e) => {
          draggingRef.current = true;
          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
          dragOffsetRef.current.dx = e.clientX - rect.left;
          dragOffsetRef.current.dy = e.clientY - rect.top;
          document.body.style.userSelect = "none";
          document.body.style.cursor = "grabbing";
        }}
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
        <span className={`ml-2 text-[10px] ${wsReady ? "text-emerald-400" : "text-zinc-400"}`}>
          {wsReady ? "WS on" : "WS off"}
        </span>
      </button>

      {/* pannello chat ancorato al bottone, posizionato in base al placement */}
      <div
        ref={panelRef}
        className={`absolute w-96 h-80 bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 shadow-xl transition-all
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        style={{
          // offset rispetto al bottone
          top: placement.vertical === "below" ? "calc(100% + 8px)" : undefined,
          bottom: placement.vertical === "above" ? "calc(100% + 8px)" : undefined,
          left: placement.horizontal === "right" ? 0 : undefined,
          right: placement.horizontal === "left" ? 0 : undefined,
          transform: open ? "translateY(0)" : "translateY(4px)",
        }}
      >
        <ChatPanel />
      </div>
    </div>
  );
}

/**
 * Decide se aprire sopra/sotto e a sx/dx, in base allo spazio disponibile
 */
function useAutoPlacement(
  pos: Pos,
  btnRef: React.RefObject<HTMLButtonElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>
): { vertical: "above" | "below"; horizontal: "left" | "right" } {
  const [state, setState] = useState<{ vertical: "above" | "below"; horizontal: "left" | "right" }>({
    vertical: "below",
    horizontal: "right",
  });

  useEffect(() => {
    const btn = btnRef.current;
    const panel = panelRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const bw = btn?.offsetWidth ?? 120;
    const bh = btn?.offsetHeight ?? 36;
    const pw = panel?.offsetWidth ?? 384; // w-96
    const ph = panel?.offsetHeight ?? 320; // h-80

    const spaceBelow = vh - (pos.y + bh);
    const spaceAbove = pos.y;
    const spaceRight = vw - pos.x - bw;
    const spaceLeft = pos.x;

    const vertical: "above" | "below" = spaceBelow >= ph || spaceBelow >= spaceAbove ? "below" : "above";
    const horizontal: "left" | "right" = spaceRight >= pw || spaceRight >= spaceLeft ? "right" : "left";

    setState({ vertical, horizontal });
  }, [pos.x, pos.y, btnRef, panelRef]);

  // ✅ ritorna sempre uno stato valido
  return state;
}