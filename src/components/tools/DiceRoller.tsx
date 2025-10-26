// src/components/tools/DiceRoller.tsx
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useChatBus } from "@/lib/chat/bus";
import { rollDiceExpression } from "@/lib/dice/roller";
import type { PartResult } from "@/lib/dice/roller";

export default function DiceRoller() {
  const bus = useChatBus();
  const [expr, setExpr] = useState("1d20");
  const [note, setNote] = useState("");
  const [last, setLast] = useState<string>("");

  async function roll() {
    try {
      const res = rollDiceExpression(expr); // { total, parts, text }
      const payload: {
        type: "dice";
        formula: string;
        note?: string;
        total: number;
        parts: PartResult[];
        text: string;
        ts: number;
      } = {
        type: "dice",
        formula: expr,
        note: note || undefined,
        total: res.total,
        parts: res.parts,
        text: res.text,
        ts: Date.now(),
      };

      setLast(payload.text);
      // 👇 correzione: usare "type" (non "kind")
      bus.emit({ type: "dice", payload });
      setNote("");
    } catch (e: any) {
      const msg = e?.message || "Formula non valida";
      setLast(msg);
    }
  }

  return (
    <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl space-y-3">
      <div className="text-sm text-zinc-400">
        Formato: <code className="font-mono">NdX</code> con modificatori, es.{" "}
        <code className="font-mono">2d6+3</code>, <code className="font-mono">1d20+5</code>,{" "}
        <code className="font-mono">4d6-2</code>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="flex-1 min-w-[140px] bg-zinc-900 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="es. 1d20+3"
        />
        <input
          className="flex-1 min-w-[220px] bg-zinc-900 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="nota (opzionale, es. Attacco spada)"
        />
        <Button variant="primary" onClick={roll}>
          Tira
        </Button>
      </div>

      {last ? (
        <div className="text-sm text-zinc-300">
          Ultimo: <span className="font-mono">{last}</span>
        </div>
      ) : null}
    </div>
  );
}