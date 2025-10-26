// src/components/table/RoomToolbar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DiceRoller from "../tools/DiceRoller";
import ChatPanel from "./ChatPanel";
import { Button } from "../ui/button";

// Mini scheda
import MiniCharacterCard from "@/components/sheet/MiniCharacterCard";
import type { PCData } from "@/types/character"; // se il tipo ha un nome diverso, adegua qui
import { EMPTY_PC } from "@/types/character";

type Props = {
  roomCode: string; // es. ABC123
  isGM?: boolean;
};

type TabKey = "chat" | "dice" | "sheet" | "inventory" | "notes";

export default function RoomToolbar({ roomCode, isGM }: Props) {
  const storageKeyOpen  = useMemo(() => `toolbar-open:${roomCode}`,  [roomCode]);
  const storageKeyTab   = useMemo(() => `toolbar-tab:${roomCode}`,   [roomCode]);
  const storageKeyWidth = useMemo(() => `toolbar-width:${roomCode}`, [roomCode]);

  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<TabKey>("chat");
  const [width, setWidth] = useState<number | null>(null);

  const asideRef    = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  // ---- Mini-scheda: fetch lazy quando serve ----
  const [pc, setPc] = useState<PCData | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcError, setPcError] = useState<string | null>(null);

  async function loadPc() {
    setPcLoading(true);
    setPcError(null);
    try {
      const r = await fetch("/api/player/sheet", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json().catch(() => ({}));
      setPc(j?.data ?? null);
    } catch (e: any) {
      setPc(null);
      setPcError(e?.message || "Errore caricamento scheda");
    } finally {
      setPcLoading(false);
    }
  }

  // avvia il fetch quando entri nel tab "sheet" la prima volta
  useEffect(() => {
    if (tab === "sheet" && pc === null && !pcLoading) {
      loadPc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ---- ripristina stato ----
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKeyOpen);
      if (v === "1") setOpen(true);

      const t = localStorage.getItem(storageKeyTab) as TabKey | null;
      if (t) setTab(t);

      const w = localStorage.getItem(storageKeyWidth);
      if (w) setWidth(parseInt(w, 10));
    } catch {}
  }, [storageKeyOpen, storageKeyTab, storageKeyWidth]);

  // ---- persisti open/tab ----
  useEffect(() => {
    try { localStorage.setItem(storageKeyOpen, open ? "1" : "0"); } catch {}
  }, [open, storageKeyOpen]);

  useEffect(() => {
    try { localStorage.setItem(storageKeyTab, tab); } catch {}
  }, [tab, storageKeyTab]);

  // ---- persisti width solo se definita ----
  useEffect(() => {
    if (width != null && Number.isFinite(width)) {
      try { localStorage.setItem(storageKeyWidth, String(width)); } catch {}
    }
  }, [width, storageKeyWidth]);

  // ---- larghezza responsive di base (se non impostata) ----
  // clamp: min 280px, prefer 32vw, max 480px (leggermente aumentato per dare aria ai tool)
  const cssWidth = width ? `${width}px` : "clamp(280px, 32vw, 480px)";

  // ---- drag per ridimensionare ----
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const screenW = window.innerWidth;
      const x = e.clientX;
      // maniglia sul bordo sinistro della sidebar: calcolo width da destra
      const newW = Math.min(600, Math.max(260, screenW - x));
      setWidth((prev) => (prev !== newW ? newW : prev));
      e.preventDefault();
    };
    const onUp = () => {
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

  // reset rapido della larghezza salvata (doppio click sulla maniglia)
  const resetWidth = () => {
    try { localStorage.removeItem(storageKeyWidth); } catch {}
    setWidth(null);
  };

  return (
    <>
      {/* Toggle flottante */}
      <button
        aria-label="Apri/chiudi tool"
        onClick={() => setOpen((o) => !o)}
        className="fixed right-3 top-1/2 -translate-y-1/2 z-40 rounded-full border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 px-3 py-2 shadow-lg"
      >
        {open ? "⟩" : "⟨"}
      </button>

      {/* Drawer */}
      <aside
        ref={asideRef}
        className={`fixed top-0 right-0 h-full z-30 bg-zinc-900/95 border-l border-zinc-700 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: cssWidth, maxWidth: "92vw" }} // responsive + limite mobile
      >
        <div className="h-full flex flex-col min-w-0">
          {/* header */}
          <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm text-zinc-400">Stanza</div>
              <div className="font-semibold truncate">
                {roomCode}{" "}
                {isGM && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase align-middle">
                    GM
                  </span>
                )}
              </div>
            </div>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Chiudi
            </Button>
          </div>

          {/* tabs */}
          <div className="px-3 pt-3 flex gap-2 flex-wrap">
            <TabButton active={tab === "chat"}  onClick={() => setTab("chat")}>💬 Chat</TabButton>
            <TabButton active={tab === "dice"}  onClick={() => setTab("dice")}>🎲 Dadi</TabButton>
            <TabButton active={tab === "sheet"} onClick={() => setTab("sheet")}>📄 Scheda</TabButton>
            <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>🎒 Inventario</TabButton>
            <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>📝 Note</TabButton>
          </div>

          {/* content: min-w-0 per evitare overflow e rendere i tool fluidi */}
          <div className="flex-1 overflow-auto p-3 min-w-0">
            {tab === "chat" && <ChatPanel />}
            {tab === "dice" && <DiceRoller />}

            {tab === "sheet" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">Scheda rapida</div>
                  <div className="flex items-center gap-2">
                    <a
                      className="text-sm px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-800"
                      href="/sheet"
                    >
                      Apri scheda completa
                    </a>
                    <Button variant="secondary" onClick={loadPc} disabled={pcLoading}>
                      {pcLoading ? "Aggiorno…" : "Aggiorna"}
                    </Button>
                  </div>
                </div>

                {pcError && (
                  <div className="text-sm text-red-400 border border-red-900/50 rounded-lg p-2">
                    {pcError}
                  </div>
                )}

                <MiniCharacterCard data={pc ?? EMPTY_PC} />
              </div>
            )}

            {tab === "inventory" && (
              <PlaceholderCard
                title="Inventario (rapido)"
                text="Qui mostreremo un estratto dell'inventario legato al personaggio."
              />
            )}

            {tab === "notes" && (
              <PlaceholderCard
                title="Note (rapide)"
                text="Spazio note/notepad collegato alle note principali della sessione/PG."
              />
            )}
          </div>
        </div>

        {/* maniglia di resize (bordo sinistro) */}
        <div
          title="Trascina per cambiare larghezza (doppio clic per reset)"
          className="absolute left-0 top-0 h-full w-2 cursor-col-resize"
          onMouseDown={(e) => {
            draggingRef.current = true;
            document.body.style.userSelect = "none";
            document.body.style.cursor = "col-resize";
            e.preventDefault();
          }}
          onDoubleClick={resetWidth}
        />
      </aside>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded border ${
        active
          ? "bg-zinc-800 border-zinc-700 text-white"
          : "bg-transparent border-zinc-800 text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PlaceholderCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl">
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-zinc-400">{text}</div>
    </div>
  );
}