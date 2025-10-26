// src/components/tools/DiceRoller.tsx
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useChatBus } from "@/lib/chat/bus";
import { rollD6Expression, PartResult } from "@/lib/dice/roller-d6";

export default function DiceRoller() {
  const { emit } = useChatBus();
  const [formula, setFormula] = useState("1d6");
  const [note, setNote] = useState("");
  const [last, setLast] = useState<string>("");

  async function roll() {
    try {
      const r = rollD6Expression(formula);
      const payload = {
        type: "dice",
        formula,
        note: note || undefined,
        total: r.total,
        parts: r.parts as PartResult[],
        text: `${formula} [${r.parts.map(p => p.rolls.join(",")).join("; ")}] = ${r.total}`,
        ts: Date.now(),
      };
      setLast(payload.text);
      emit({ type: "dice", expr: formula, total: r.total, detail: payload.text });
    } catch (e: any) {
      setLast(e?.message || "Formula non valida");
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[140px] bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="es. 3d6+2"
        />
        <input
          className="flex-1 min-w-[160px] bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (facoltativa)"
        />
        <Button variant="primary" onClick={roll}>Tira</Button>
      </div>

      {last ? (
        <div className="mt-3 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm break-words">
          {last}
        </div>
      ) : null}
    </div>
  );
}