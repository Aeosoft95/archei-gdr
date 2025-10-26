"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useChatBus } from "@/lib/chat/bus";
import { rollD6Expression, PartResult } from "@/lib/dice/roller-d6"; // usa solo D6

export default function DiceRoller() {
  const { emit } = useChatBus();
  const [formula, setFormula] = useState("1d6");
  const [note, setNote] = useState("");
  const [last, setLast] = useState<string>("");

  async function handleRoll() {
    try {
      const { total, parts, text } = rollD6Expression(formula);
      setLast(text);

      // INVIO PIATTO (nessun payload annidato)
      emit({
        type: "dice",
        expr: formula,
        total,
        detail: note || partsToDetail(parts),
      });
    } catch (e: any) {
      const msg = e?.message || "Formula non valida";
      setLast(msg);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 w-44"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="es. 2d6+1"
        />
        <input
          className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="nota (facoltativa)"
        />
        <Button variant="primary" onClick={handleRoll}>
          Tira
        </Button>
      </div>

      {last && (
        <div className="text-xs text-zinc-400">
          Ultimo: <span className="font-mono">{last}</span>
        </div>
      )}
    </div>
  );
}

function partsToDetail(parts: PartResult[]) {
  // es. "[4,2]=6; +1"
  return parts
    .map((p) => {
      if (p.type === "dice") return `[${p.rolls.join(",")}]${p.mod ? ` ${p.mod >= 0 ? "+" : ""}${p.mod}` : ""}=${p.sum}`;
      if (p.type === "mod") return `${p.value >= 0 ? "+" : ""}${p.value}`;
      return "";
    })
    .filter(Boolean)
    .join("; ");
}