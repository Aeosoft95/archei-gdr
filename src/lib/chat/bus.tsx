// src/lib/chat/bus.tsx
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

/** Messaggi visualizzabili in chat */
export type ChatMessage =
  | { type: "system"; text: string; ts: number }
  | {
      type: "chat";
      from?: { id?: string; name?: string };
      text: string;
      ts: number;
      cid?: string;
    }
  | {
      type: "dice";
      from?: { id?: string; name?: string };
      expr: string;
      total: number;
      detail?: string;
      ts: number;
      cid?: string;
    }
  | { type: string; [k: string]: any };

/** Eventi pubblicati dai tool e inviati al WS */
export type ChatEvent =
  | { type: "chat"; text: string; cid?: string }
  | { type: "dice"; expr: string; total: number; detail?: string; cid?: string }
  | { type: "join" | "leave" | "gmAction" | string; [k: string]: any; cid?: string };

type ChatContextValue = {
  messages: ChatMessage[];
  wsReady: boolean;
  me?: { id?: string; name?: string };
  sendChat: (text: string) => boolean;
  emit: (evt: ChatEvent) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function getWsBase() {
  return (process.env.NEXT_PUBLIC_WS_URL || "wss://ws.archei-gdr.org").replace(
    /\/+$/,
    ""
  );
}

async function getWsToken(): Promise<string | undefined> {
  try {
    const cached = localStorage.getItem("wsToken");
    if (cached) return cached;
  } catch {}
  try {
    const r = await fetch("/api/auth/ws-token", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      if (typeof j?.token === "string") {
        try {
          localStorage.setItem("wsToken", j.token);
        } catch {}
        return j.token;
      }
    }
  } catch {}
  return undefined;
}

// semplice generatore client-id per deduplicare gli echo dal server
function makeCid() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
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
  const [me, setMe] = useState<{ id?: string; name?: string } | undefined>(
    undefined
  );

  const wsRef = useRef<WebSocket | null>(null);
  const seenCidRef = useRef<Set<string>>(new Set()); // per dedup

  // Connessione WS unica per stanza
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

        ws.onopen = () => {
          if (!closed) setWsReady(true);
        };

        ws.onmessage = (ev) => {
          if (closed) return;
          let msg: any = null;
          try {
            msg = JSON.parse(ev.data);
          } catch {
            return;
          }

          // dedup sugli echo se presente cid
          const cid: string | undefined = msg?.cid;
          if (cid) {
            if (seenCidRef.current.has(cid)) return;
            seenCidRef.current.add(cid);
          }

          // Normalizzazione base
          if (msg?.type === "welcome") {
            setMe(msg?.user);
            setMessages((curr) => [
              ...curr,
              { type: "system", text: "Connesso alla stanza.", ts: Date.now() },
            ]);
            return;
          }
          if (msg?.type === "system" && msg.text) {
            setMessages((curr) => [
              ...curr,
              { type: "system", text: msg.text, ts: msg.ts || Date.now() },
            ]);
            return;
          }
          if (msg?.type === "chat" && msg.text) {
            setMessages((curr) => [
              ...curr,
              {
                type: "chat",
                from: msg.from,
                text: msg.text,
                ts: msg.ts || Date.now(),
                cid,
              },
            ]);
            return;
          }
          if (msg?.type === "dice" && msg.expr) {
            setMessages((curr) => [
              ...curr,
              {
                type: "dice",
                from: msg.from,
                expr: msg.expr,
                total: Number(msg.total),
                detail: msg.detail,
                ts: msg.ts || Date.now(),
                cid,
              },
            ]);
            return;
          }

          // fallback generico
          setMessages((curr) => [
            ...curr,
            { ...(msg || {}), ts: msg?.ts || Date.now(), cid },
          ]);
        };

        ws.onclose = () => {
          setWsReady(false);
          wsRef.current = null;
        };
      } catch {
        setWsReady(false);
      }
    })();

    // cleanup alla disconnessione / cambio stanza
    return () => {
      closed = true;
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
      setWsReady(false);
      // non svuoto i messaggi: resta il log della stanza
    };
  }, [roomCode]);

  // API: chat testuale
  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return false;

    const cid = makeCid();
    const evt: ChatEvent = { type: "chat", text, cid };
    try {
      ws.send(JSON.stringify(evt));
    } catch {
      return false;
    }

    // echo ottimistico (non duplica: il server restituirà lo stesso cid)
    seenCidRef.current.add(cid);
    setMessages((curr) => [
      ...curr,
      { type: "chat", from: me, text, ts: Date.now(), cid },
    ]);
    return true;
  }, [me]);

  // API: eventi dai tool → WS + echo opzionale coerente
  const emit = useCallback(
    (evt: ChatEvent) => {
      const ws = wsRef.current;
      const cid = evt.cid || makeCid();
      const out: ChatEvent = { ...evt, cid };

      if (ws && ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify(out));
        } catch {}
      }

      // echo ottimistico locale per i tipi più comuni (dedup attivo)
      if (out.type === "dice") {
        seenCidRef.current.add(cid);
        setMessages((curr) => [
          ...curr,
          {
            type: "dice",
            from: me,
            expr: (out as any).expr,
            total: (out as any).total,
            detail: (out as any).detail,
            ts: Date.now(),
            cid,
          },
        ]);
      } else if (out.type === "chat" && (out as any).text) {
        seenCidRef.current.add(cid);
        setMessages((curr) => [
          ...curr,
          {
            type: "chat",
            from: me,
            text: (out as any).text,
            ts: Date.now(),
            cid,
          },
        ]);
      } else if ((out as any).type === "system" && (out as any).text) {
        seenCidRef.current.add(cid);
        setMessages((curr) => [
          ...curr,
          { type: "system", text: (out as any).text, ts: Date.now(), cid },
        ]);
      }
    },
    [me]
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      wsReady,
      me,
      sendChat,
      emit,
    }),
    [messages, wsReady, me, sendChat, emit]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatBus() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatBus must be used inside <ChatProvider>");
  return ctx;
}