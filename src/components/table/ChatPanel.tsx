"use client";

import { useEffect, useRef, useState } from "react";
import { useChatBus } from "@/lib/chat/bus";
import { Button } from "../ui/button";

export default function ChatPanel() {
  const { messages, sendChat, wsReady, me } = useChatBus();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  // autoscroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    const ok = sendChat(txt);
    if (ok) setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-zinc-500 mb-2">
        WS: {wsReady ? "online" : "offline"} {me?.name ? `· ${me.name}` : ""}
      </div>

      <div ref={listRef} className="flex-1 overflow-auto space-y-2">
        {messages.map((m, i) => {
          if (m.type === "system") {
            return (
              <div key={i} className="text-xs text-zinc-500 text-center">
                {m.text}
              </div>
            );
          }
          if (m.type === "chat") {
            return (
              <div key={i} className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700">
                <div className="text-xs text-zinc-400 mb-0.5">{m.from?.name || "User"}</div>
                <div className="text-sm">{m.text}</div>
              </div>
            );
          }
          if (m.type === "dice") {
            return (
              <div key={i} className="px-3 py-1.5 rounded bg-zinc-850 border border-zinc-700">
                <div className="text-xs text-zinc-400 mb-0.5">
                  {m.from?.name || "User"} ha tirato <span className="font-mono">{m.expr}</span>
                </div>
                <div className="text-sm">
                  Totale: <span className="font-semibold">{m.total}</span>
                  {m.detail ? <span className="ml-2 text-xs text-zinc-400">({m.detail})</span> : null}
                </div>
              </div>
            );
          }
          // fallback per messaggi custom
          return (
            <div key={i} className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
              {JSON.stringify(m)}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Scrivi un messaggio…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <Button variant="primary" onClick={send}>Invia</Button>
      </div>
    </div>
  );
}