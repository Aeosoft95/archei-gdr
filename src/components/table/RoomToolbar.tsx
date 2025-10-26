// src/components/table/RoomToolbar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DiceRoller from "../tools/DiceRoller";
import ChatPanel from "./ChatPanel";
import { Button } from "../ui/button";

type Props = {
  roomCode: string; // es. ABC123
  isGM?: boolean;
};

type TabKey = "chat" | "dice" | "sheet" | "inventory" | "notes";

export default function RoomToolbar({ roomCode, isGM }: Props) {
  const storageKeyOpen = useMemo(() => `toolbar-open:${roomCode}`, [roomCode]);
  const storageKeyTab = useMemo(() => `toolbar-tab:${roomCode}`, [roomCode]);
  const storageKeyWidth = useMemo(() => `toolbar-width:${roomCode}`, [roomCode]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("chat");
  const [width, setWidth] = useState<number | null>(null);

  const asideRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);

  // ripristina stato
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

  // persisti open/tab/width
  useEffect(() => {
    try { localStorage.setItem(storageKeyOpen, open ? "1" : "0"); } catch {}
  }, [open, storageKeyOpen]);
  useEffect(() => {
    try { localStorage.setItem(storageKeyTab, tab); } catch {}
  }, [tab, storageKeyTab]);
  useEffect(() => {
    if (width) {
      try { localStorage.setItem(storageKeyWidth, String(width)); } catch {}
    }
  }, [width, storageKeyWidth]);

  // larghezza responsive di base (se utente non l'ha impostata)
  // clamp: min 280px, prefer 32vw, max 440px
  const cssWidth = width ? `${width}px` : "clamp(280px, 32vw, 440px)";

  // drag per ridimensionare
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const aside = asideRef.current;
      if (!aside) return;
      const screenW = window.innerWidth;
      const x = e.clientX;
      // la maniglia è sul bordo sinistro della sidebar
      const newW = Math.min(560, Math.max(260, screenW - x));
      setWidth(newW);
    };
    const onUp = () => { draggingRef.current = false; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

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
        <div className="h-full flex flex-col">
          {/* header */}
          <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-400">Stanza</div>
              <div className="font-semibold">
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
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
              💬 Chat
            </TabButton>
            <TabButton active={tab === "dice"} onClick={() => setTab("dice")}>
              🎲 Dadi
            </TabButton>
            <TabButton active={tab === "sheet"} onClick={() => setTab("sheet")}>
              📄 Scheda
            </TabButton>
            <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
              🎒 Inventario
            </TabButton>
            <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
              📝 Note
            </TabButton>
          </div>

          {/* content */}
          <div className="flex-1 overflow-auto p-3">
            {tab === "chat" && <ChatPanel />}
            {tab === "dice" && <DiceRoller />}

            {tab === "sheet" && (
              <PlaceholderCard
                title="Scheda PG (rapida)"
                text="Qui mostreremo una scheda sintetica collegata alla Scheda PG principale."
              />
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
          title="Trascina per cambiare larghezza"
          className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize"
          onMouseDown={() => (draggingRef.current = true)}
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