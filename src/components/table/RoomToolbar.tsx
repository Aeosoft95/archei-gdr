"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DiceRoller from "../tools/DiceRoller";
import { Button } from "../ui/button";

type Props = {
  roomCode: string;     // es. ABC123
  isGM?: boolean;       // se il current user è il GM
};

type TabKey = "chat" | "dice" | "sheet" | "inventory" | "notes";

type ChatMsg =
  | { type: "system"; text: string; ts: number }
  | { type: "chat"; from?: { id?: string; name?: string }; text: string; ts: number }
  | { type: "dice"; from?: { id?: string; name?: string }; expr: string; total: number; detail?: string; ts: number };

export default function RoomToolbar({ roomCode, isGM }: Props) {
  const storageKeyOpen = useMemo(() => `toolbar-open:${roomCode}`, [roomCode]);
  const storageKeyTab  = useMemo(() => `toolbar-tab:${roomCode}`, [roomCode]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("chat");

  // --- WS state ---
  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [meName, setMeName] = useState<string | undefined>(undefined);

  // ripristina stato per-stanza
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKeyOpen);
      if (v === "1") setOpen(true);
      const t = localStorage.getItem(storageKeyTab) as TabKey | null;
      if (t) setTab(t);
    } catch {}
  }, [storageKeyOpen, storageKeyTab]);

  // persisti
  useEffect(() => {
    try { localStorage.setItem(storageKeyOpen, open ? "1" : "0"); } catch {}
  }, [open, storageKeyOpen]);

  useEffect(() => {
    try { localStorage.setItem(storageKeyTab, tab); } catch {}
  }, [tab, storageKeyTab]);

  // --- Helpers token/URL ---
  const getWsBase = () =>
    (process.env.NEXT_PUBLIC_WS_URL || "wss://ws.archei-gdr.org").replace(/\/+$/,"");

  const fetchToken = async (): Promise<string | undefined> => {
    // 1) localStorage
    try {
      const t = localStorage.getItem("wsToken");
      if (t) return t;
    } catch {}
    // 2) global injection
    if (typeof window !== "undefined" && (window as any).__WS_TOKEN__) {
      return (window as any).__WS_TOKEN__;
    }
    // 3) endpoint opzionale
    try {
      const r = await fetch("/api/ws/token");
      if (r.ok) {
        const j = await r.json();
        if (typeof j?.token === "string") return j.token;
      }
    } catch {}
    return undefined;
  };

  // --- Connessione WS ---
  useEffect(() => {
    let closed = false;

    (async () => {
      const token = await fetchToken();
      const qs = new URLSearchParams({ code: roomCode });
      if (token) qs.set("token", token);
      const url = `${getWsBase()}/?${qs.toString()}`;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (closed) return;
          setWsReady(true);
        };

        ws.onmessage = (ev) => {
          if (closed) return;
          try {
            const msg = JSON.parse(ev.data);
            // messaggi dal nostro ws server: welcome, system, chat, dice, broadcast
            if (msg?.type === "welcome") {
              setMeName(msg?.user?.name);
              setChat((curr) => [
                ...curr,
                { type: "system", text: "Connesso alla stanza.", ts: Date.now() },
              ]);
              return;
            }
            if (msg?.type === "system" && typeof msg?.text === "string") {
              setChat((curr) => [...curr, { type: "system", text: msg.text, ts: msg.ts || Date.now() }]);
              return;
            }
            if (msg?.type === "chat" && typeof msg?.text === "string") {
              setChat((curr) => [
                ...curr,
                {
                  type: "chat",
                  from: msg.from,
                  text: msg.text,
                  ts: msg.ts || Date.now(),
                },
              ]);
              return;
            }
            if (msg?.type === "dice" && typeof msg?.expr === "string") {
              setChat((curr) => [
                ...curr,
                {
                  type: "dice",
                  from: msg.from,
                  expr: msg.expr,
                  total: Number(msg.total),
                  detail: msg.detail,
                  ts: msg.ts || Date.now(),
                },
              ]);
              return;
            }
          } catch {
            /* ignore */
          }
        };

        ws.onclose = () => {
          setWsReady(false);
        };
      } catch {
        // ignoriamo: il pannello rimane senza realtime
      }
    })();

    return () => {
      closed = true;
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
      setWsReady(false);
    };
  }, [roomCode]);

  // invia chat
  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return false;
    ws.send(JSON.stringify({ type: "chat", text }));
    return true;
  }, []);

  // inoltra tiri del DiceRoller al WS
  const handleRoll = useCallback((roll: { expr: string; total: number; detail?: string }) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: "dice", expr: roll.expr, total: roll.total, detail: roll.detail }));
  }, []);

  return (
    <>
      {/* Toggle flottante */}
      <button
        aria-label="Apri/chiudi tool"
        onClick={() => setOpen(o => !o)}
        className="fixed right-3 top-1/2 -translate-y-1/2 z-40 rounded-full border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 px-3 py-2 shadow-lg"
      >
        {open ? "⟩" : "⟨"}
      </button>

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md z-30 bg-zinc-900/95 border-l border-zinc-700 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
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
                {!isGM && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase align-middle">
                    Player
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500">WS: {wsReady ? "online" : "offline"} {meName ? `· ${meName}` : ""}</div>
            </div>
            <Button variant="secondary" onClick={() => setOpen(false)}>Chiudi</Button>
          </div>

          {/* tabs */}
          <div className="px-3 pt-3 flex gap-2">
            <TabButton active={tab==="chat"}  onClick={() => setTab("chat")}>💬 Chat</TabButton>
            <TabButton active={tab==="dice"}  onClick={() => setTab("dice")}>🎲 Dadi</TabButton>
            <TabButton active={tab==="sheet"} onClick={() => setTab("sheet")}>📄 Scheda</TabButton>
            <TabButton active={tab==="inventory"} onClick={() => setTab("inventory")}>🎒 Inventario</TabButton>
            <TabButton active={tab==="notes"} onClick={() => setTab("notes")}>📝 Note</TabButton>
          </div>

          {/* content */}
          <div className="flex-1 overflow-auto p-3">
            {tab === "chat" && (
              <ChatPanel
                messages={chat}
                onSend={sendChat}
              />
            )}

            {tab === "dice" && (
              <DiceRoller onRoll={handleRoll} />
            )}

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
      </aside>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-1.