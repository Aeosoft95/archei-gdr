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

// id client univoco per dedup
function newCid() {
  return Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
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

  // cids pendenti: eventi che abbiamo inviato e che rientreranno dal WS
  const pending = useRef<Set<string>>(new Set());

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
          let msg: any = null;
          try { msg = JSON.parse(ev.data); } catch { return; }

          // dedup: se rientra un nostro echo con cid noto → ignora
          if (msg?.cid && pending.current.has(msg.cid)) {
            pending.current.delete(msg.cid);
            return;
          }

          // Normalizzazioni
          if (msg?.type === "welcome") {
            setMe(msg?.from || msg?.user);
            setMessages((curr) => [...curr, { type: "system", text: "Connesso alla stanza.", ts: Date.now() }]);
            return;
          }

          if (msg?.type === "system" && msg.text) {
            setMessages((curr) => [...curr, { type: "system", text: msg.text, ts: msg.ts || Date.now() }]);
            return;
          }

          // Caso server che incapsula in payload
          const payload = msg?.payload && typeof msg.payload === "object" ? msg.payload : msg;

          if (payload?.type === "chat" && payload.text) {
            setMessages((curr) => [
              ...curr,
              { type: "chat", from: msg.from, text: payload.text, ts: payload.ts || msg.ts || Date.now() },
            ]);
            return;
          }

          if (payload?.type === "dice" && payload.expr) {
            setMessages((curr) => [
              ...curr,
              {
                type: "dice",
                from: msg.from,
                expr: payload.expr || payload.formula, // compat
                total: Number(payload.total),
                detail: payload.detail || payload.text,
                ts: payload.ts || msg.ts || Date.now(),
              },
            ]);
            return;
          }

          // fallback: append raw
          setMessages((curr) => [...curr, { ...(msg || {}), ts: msg?.ts || Date.now() }]);
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
      pending.current.clear();
    };
  }, [roomCode]);

  // API: chat testuale
  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return false;
    const cid = newCid();
    pending.current.add(cid);
    ws.send(JSON.stringify({ type: "chat", text, cid }));
    // eco locale immediato
    setMessages((curr) => [...curr, { type: "chat", from: me, text, ts: Date.now() }]);
    return true;
  }, [me]);

  // API: eventi dai tool → WS + eco locale (solo per alcuni tipi)
  const emit = useCallback((evt: ChatEvent) => {
    const ws = wsRef.current;
    const withCid = { ...evt, cid: newCid() };

    if (ws && ws.readyState === ws.OPEN) {
      pending.current.add(withCid.cid as string);
      ws.send(JSON.stringify(withCid));
    }

    // eco locale solo per chat/dice/system
    if (evt.type === "dice") {
      setMessages((curr) => [
        ...curr,
        {
          type: "dice",
          from: me,
          expr: evt.expr,
          total: evt.total,
          detail: evt.detail,
          ts: Date.now(),
        },
      ]);
    } else if (evt.type === "chat" && evt.text) {
      setMessages((curr) => [...curr, { type: "chat", from: me, text: evt.text, ts: Date.now() }]);
    } else if (evt.type === "system" && (evt as any).text) {
      setMessages((curr) => [...curr, { type: "system", text: (evt as any).text, ts: Date.now() }]);
    }
  }, [me]);

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