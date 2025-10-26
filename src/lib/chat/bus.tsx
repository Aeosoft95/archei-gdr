"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** Messaggi standardizzati che la chat sa visualizzare */
export type ChatMessage =
  | { type: "system"; text: string; ts: number }
  | { type: "chat"; from?: { id?: string; name?: string }; text: string; ts: number }
  | { type: "dice"; from?: { id?: string; name?: string }; expr: string; total: number; detail?: string; ts: number }
  | { type: string; [k: string]: any }; // estendibile

/** Eventi inviati dai tool → bus → WS */
export type ChatEvent =
  | { type: "chat"; text: string }
  | { type: "dice"; expr: string; total: number; detail?: string }
  | { type: "system"; text: string }
  | { type: "join" | "leave" | "gmAction" | string; [k: string]: any };

type ChatContextValue = {
  messages: ChatMessage[];
  wsReady: boolean;
  me?: { id?: string; name?: string };
  sendChat: (text: string) => boolean;
  emit: (evt: ChatEvent) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function getWsBase() {
  return (process.env.NEXT_PUBLIC_WS_URL || "wss://ws.archei-gdr.org").replace(/\/+$/, "");
}

async function getWsToken(): Promise<string | undefined> {
  try { const t = localStorage.getItem("wsToken"); if (t) return t; } catch {}
  if (typeof window !== "undefined" && (window as any).__WS_TOKEN__) return (window as any).__WS_TOKEN__;
  try {
    const r = await fetch("/api/ws/token");
    if (r.ok) {
      const j = await r.json();
      if (typeof j?.token === "string") return j.token;
    }
  } catch {}
  return undefined;
}

export function ChatProvider({
  roomCode,
  children,
}: {
  roomCode: string;
  children: React.ReactNode;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wsReady, setWsReady] = useState(false);
  const [me, setMe] = useState<{ id?: string; name?: string } | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);

  // Connessione WS unica
  useEffect(() => {
    let closed = false;
    (async () => {
      const token = await getWsToken();
      const qs = new URLSearchParams({ code: roomCode });
      if (token) qs.set("token", token);
      const url = `${getWsBase()}/?${qs.toString()}`;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => { if (!closed) setWsReady(true); };

        ws.onmessage = (ev) => {
          if (closed) return;
          let raw: any = null;
          try { raw = JSON.parse(ev.data); } catch { return; }

          // Normalizza: wrapper broadcast { type:"broadcast", payload:{...}, from, ts }
          const now = Date.now();
          let msg = raw;
          if (raw?.type === "broadcast" && raw?.payload) {
            msg = {
              ...raw.payload,
              from: raw.from ?? raw.payload?.from,
              ts: raw.ts ?? raw.payload?.ts ?? now,
            };
          }

          // Routing tipizzato
          if (msg?.type === "welcome") {
            setMe(msg?.from || msg?.user);
            setMessages((curr) => [...curr, { type: "system", text: "Connesso alla stanza.", ts: now }]);
            return;
          }

          if (msg?.type === "system" && msg.text) {
            setMessages((curr) => [...curr, { type: "system", text: msg.text, ts: msg.ts || now }]);
            return;
          }

          if (msg?.type === "chat" && msg.text) {
            setMessages((curr) => [
              ...curr,
              { type: "chat", from: msg.from, text: msg.text, ts: msg.ts || now },
            ]);
            return;
          }

          if (msg?.type === "dice" && (msg.expr || msg.formula)) {
            setMessages((curr) => [
              ...curr,
              {
                type: "dice",
                from: msg.from,
                expr: msg.expr || msg.formula,
                total: Number(msg.total),
                detail: msg.detail || msg.text,
                ts: msg.ts || now,
              },
            ]);
            return;
          }

          // NIENTE fallback (evitiamo duplicati/spam)
        };

        ws.onclose = () => { setWsReady(false); };
      } catch {
        // nessun realtime
      }
    })();

    return () => {
      closed = true;
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
      setWsReady(false);
    };
  }, [roomCode]);

  // API: chat testuale — niente eco locale, lasciamo al broadcast
  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return false;
    ws.send(JSON.stringify({ type: "chat", text }));
    return true;
  }, []);

  // API: eventi dai tool → WS (niente eco locale per chat/dice)
  const emit = useCallback((evt: ChatEvent) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(evt));
    }
    // opzionale: eco locale solo per system
    if (evt.type === "system" && (evt as any).text) {
      setMessages((curr) => [...curr, { type: "system", text: (evt as any).text, ts: Date.now() }]);
    }
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({ messages, wsReady, me, sendChat, emit }),
    [messages, wsReady, me, sendChat, emit]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatBus() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatBus must be used inside <ChatProvider>");
  return ctx;
}