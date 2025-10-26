"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/** Messaggi standardizzati che la chat sa visualizzare */
export type ChatMessage =
  | { type: "system"; text: string; ts: number }
  | { type: "chat"; from?: { id?: string; name?: string }; text: string; ts: number }
  | { type: "dice"; from?: { id?: string; name?: string }; expr: string; total: number; detail?: string; ts: number }
  | { type: string; [k: string]: any }; // estendibile

/** Eventi che i tool sparano: il bus li inoltra a WS e li traduce in ChatMessage quando serve */
export type ChatEvent =
  | { type: "chat"; text: string }
  | { type: "dice"; expr: string; total: number; detail?: string }
  | { type: "join" | "leave" | "gmAction" | string; [k: string]: any };

type ChatContextValue = {
  messages: ChatMessage[];
  wsReady: boolean;
  me?: { id?: string; name?: string };
  sendChat: (text: string) => boolean;
  emit: (evt: ChatEvent) => void; // l’unica API che i tool devono conoscere
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
          try {
            const msg = JSON.parse(ev.data);
            // Normalizzazione minime dal tuo ws-server
            if (msg?.type === "welcome") {
              setMe(msg?.user);
              setMessages((curr) => [...curr, { type: "system", text: "Connesso alla stanza.", ts: Date.now() }]);
              return;
            }
            if (msg?.type === "system" && msg.text) {
              setMessages((curr) => [...curr, { type: "system", text: msg.text, ts: msg.ts || Date.now() }]);
              return;
            }
            if (msg?.type === "chat" && msg.text) {
              setMessages((curr) => [...curr, { type: "chat", from: msg.from, text: msg.text, ts: msg.ts || Date.now() }]);
              return;
            }
            if (msg?.type === "dice" && msg.expr) {
              setMessages((curr) => [
                ...curr,
                { type: "dice", from: msg.from, expr: msg.expr, total: Number(msg.total), detail: msg.detail, ts: msg.ts || Date.now() },
              ]);
              return;
            }
            // fallback: qualsiasi altro evento lo appendiamo “raw”
            setMessages((curr) => [...curr, { ...msg, ts: msg.ts || Date.now() }]);
          } catch {
            /* ignore */
          }
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

  // API: chat testuale
  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return false;
    ws.send(JSON.stringify({ type: "chat", text }));
    return true;
  }, []);

  // API: eventi dai tool → WS + (opzionale) append in chat
  const emit = useCallback((evt: ChatEvent) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(evt));
    }
    // comportamento di default: alcuni eventi appaiono anche in chat locale
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
      setMessages((curr) => [
        ...curr,
        { type: "chat", from: me, text: evt.text, ts: Date.now() },
      ]);
    } else if (evt.type === "system" && (evt as any).text) {
      setMessages((curr) => [
        ...curr,
        { type: "system", text: (evt as any).text, ts: Date.now() },
      ]);
    }
    // altri tipi rimangono solo lato server: arriveranno via WS già formattati
  }, [me]);

  const value = useMemo<ChatContextValue>(() => ({
    messages, wsReady, me, sendChat, emit,
  }), [messages, wsReady, me, sendChat, emit]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatBus() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatBus must be used inside <ChatProvider>");
  return ctx;
}