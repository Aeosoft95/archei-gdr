// src/lib/chat/bus.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UserLite = { id?: string; name?: string };
type Incoming =
  | { type: "welcome"; user?: UserLite }
  | { type: "system"; msg?: string }
  | { type: "broadcast"; from?: string | UserLite; payload?: any }
  | { type: string; [k: string]: any };

export type ChatItem =
  | { type: "system"; text: string; ts?: number }
  | { type: "chat"; from?: UserLite; text: string; ts?: number }
  | { type: "dice"; from?: UserLite; expr: string; total: number; detail?: string; ts?: number }
  | { type: "custom"; payload: any; ts?: number };

function getRoomCodeFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/\/table\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export function useChatBus() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [wsReady, setWsReady] = useState(false);
  const [me, setMe] = useState<UserLite | null>(null);

  const roomCode = useMemo(getRoomCodeFromPath, []);
  const token = typeof window !== "undefined" ? localStorage.getItem("arch_token") : null;

  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_WS_URL || "";
    if (!base) return null;
    const qp = new URLSearchParams();
    if (roomCode) qp.set("room", roomCode);
    if (token) qp.set("token", token);
    return `${base}?${qp.toString()}`;
  }, [roomCode, token]);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsReady(true);
      // annuncia join stanza
      try { ws.send(JSON.stringify({ type: "join", code: roomCode })); } catch {}
    };

    ws.onmessage = (ev) => {
      let msg: Incoming | null = null;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const ts = Date.now();

      if (msg.type === "welcome") {
        const user = (msg.user && typeof msg.user === "object")
          ? msg.user as UserLite
          : { name: msg.user as string | undefined };
        setMe(user || null);
        setMessages((cur) => [...cur, { type: "system", text: "Connesso al server", ts }]);
        return;
      }

      if (msg.type === "system") {
        setMessages((cur) => [...cur, { type: "system", text: msg.msg || "Evento di sistema", ts }]);
        return;
      }

      if (msg.type === "broadcast") {
        const from: UserLite | undefined =
          typeof msg.from === "string" ? { name: msg.from } : msg.from;

        const p = msg.payload || {};
        // normalizza tipi noti
        if (p.type === "chat") {
          const text = p.text ?? "";
          setMessages((cur) => [...cur, { type: "chat", from, text, ts }]);
          return;
        }
        if (p.type === "dice") {
          const expr = String(p.expr ?? "");
          const total = Number(p.total ?? 0);
          const detail = typeof p.detail === "string" ? p.detail : undefined;
          setMessages((cur) => [...cur, { type: "dice", from, expr, total, detail, ts }]);
          return;
        }

        // fallback: messaggio personalizzato
        setMessages((cur) => [...cur, { type: "custom", payload: p, ts }]);
        return;
      }
    };

    ws.onclose = () => {
      setWsReady(false);
      wsRef.current = null;
      setMessages((cur) => [...cur, { type: "system", text: "Disconnesso", ts: Date.now() }]);
    };

    return () => {
      try { ws.close(); } catch {}
    };
  }, [wsUrl, roomCode]);

  function sendRaw(payload: any) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  // API: invia chat testuale
  function sendChat(text: string): boolean {
    return sendRaw({ type: "chat", text });
  }

  // API: invia esito dadi (da integrazione del DiceRoller)
  // expr: "2d6+3", total: 11, detail: "[4,2]+3"
  function sendDice(expr: string, total: number, detail?: string): boolean {
    return sendRaw({ type: "dice", expr, total, detail });
  }

  return { messages, sendChat, sendDice, wsReady, me };
}