// src/components/tools/DiceRoller.tsx
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useChatBus } from "@/lib/chat/bus";
import { rollD6Expression, type PartResult } from "@/lib/dice/roller-d6";

function isDicePart(p: PartResult): p is PartResult & { rolls: number[]; sign: number } {
  // nei risultati dei dadi c'è sempre 'rolls'
  return typeof (p as any)?.rolls !== "undefined";
}

function isModPart(p: PartResult): p is PartResult & { value: number; sign: number } {
  return !isDicePart(p) && typeof (p as any)?.value !== "undefined";
}

export default function DiceRoller() {
  const { emit } = useChatBus();
  const [formula, setFormula] = useState("1d6");
  const [note, setNote] = useState("");
  const [last, setLast] = useState("");

  function partToString(p: PartResult): string {
    if (isDicePart(p)) {
      const rolls = `[${p.rolls.join(",")}]`;
      return p.sign < 0 ? `-${rolls}` : rolls;
    }
    if (isModPart(p)) {
      const v = Math.abs(p.value);
      return p.sign < 0 ? `-${v}` : `+${v}`;
    }
    // fallback prudente
    return "";
  }

  async function onRoll() {
    try {
      const r = rollD6Expression(formula);
      const partsStr = r.parts.map(partToString).filter(Boolean).join(" ");
      const textBase = `${formula} ${partsStr} = ${r.total}`;
      const text = note.trim() ? `${textBase} · ${note.trim()}` : textBase;

      setLast(text);

      // Pubblica in chat come evento standardizzato
      emit({
        type: "dice",
        expr: formula,
        total: r.total,
        detail: partsStr,
      });
    } catch (e: any) {
      setLast(e?.message || "Formula non valida");
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-400">
        Formule supportate (solo D6):{" "}
        <code className="font-mono">1d6</code>,{" "}
        <code className="font-mono">3d6+2</code>,{" "}
        <code className="font-mono">2d6-1</code>,{" "}
        <code className="font-mono">d6</code>…
      </div>

      <div className="flex flex-col gap-2">
        <input
          className="bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="Es: 3d6+1"
        />
        <input
          className="bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota opzionale (es. Attacco, Iniziativa...)"
        />
        <div>
          <Button variant="primary" onClick={onRoll}>Tira</Button>
        </div>
      </div>

      {last && (
        <div className="mt-2 p-3 rounded bg-zinc-800 border border-zinc-700 break-words">
          <div className="text-xs text-zinc-400 mb-1">Ultimo risultato</div>
          <div className="font-mono text-sm">{last}</div>
        </div>
      )}
    </div>
  );
}