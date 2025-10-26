// src/components/table/ChatPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChatBus } from "@/lib/chat/bus";
import { Button } from "../ui/button";

export default function ChatPanel() {
  const { messages, sendChat, wsReady, me } = useChatBus();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll alla fine quando arrivano nuovi messaggi
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const canSend = useMemo(
    () => wsReady && input.trim().length > 0,
    [wsReady, input]
  );

  const handleSend = () => {
    const txt = input.trim();
    if (!txt) return;
    const ok = sendChat(txt);
    if (ok) setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stato connessione */}
      <div className="text-xs text-zinc-500 mb-2">
        WS: {wsReady ? "online" : "offline"}
        {me?.name ? ` · ${me.name}` : ""}
      </div>

      {/* Lista messaggi */}
      <div
        ref={listRef}
        className="flex-1 overflow-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-700"
      >
        {messages.map((m, i) => {
          // chiave stabile se disponibile
          const key = (m as any)?.ts ?? i;

          if (m && m.type === "system") {
            return (
              <div key={key} className="text-xs text-zinc-500 text-center">
                {m.text}
              </div>
            );
          }

          if (m && m.type === "chat") {
            return (
              <div
                key={key}
                className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700"
              >
                <div className="text-xs text-zinc-400 mb-0.5">
                  {m.from?.name || "User"}
                </div>
                <div className="text-sm break-words">{m.text}</div>
              </div>
            );
          }

          if (m && m.type === "dice") {
            return (
              <div
                key={key}
                className="px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700"
              >
                <div className="text-xs text-zinc-400 mb-0.5">
                  {m.from?.name || "User"} ha tirato{" "}
                  <span className="font-mono">{m.expr}</span>
                </div>
                <div className="text-sm">
                  Totale:{" "}
                  <span className="font-semibold">{m.total}</span>
                  {m.detail ? (
                    <span className="ml-2 text-xs text-zinc-400">
                      ({m.detail})
                    </span>
                  ) : null}
                </div>
              </div>
            );
          }

          // fallback per messaggi sconosciuti/null
          return (
            <div
              key={key}
              className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400"
            >
              {m ? JSON.stringify(m) : "Messaggio non disponibile"}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={wsReady ? "Scrivi un messaggio…" : "Connessione WS non attiva"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) handleSend();
          }}
          disabled={!wsReady}
        />
        <Button variant="primary" onClick={handleSend} disabled={!canSend}>
          Invia
        </Button>
      </div>
    </div>
  );
}