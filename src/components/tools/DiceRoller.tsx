// src/components/tools/DiceRoller.tsx
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useChatBus } from "@/lib/chat/bus";

/**
 * Supporta formule stile: 1d20+5, 4d6kh3, 2d20kl1, 3d8-2, d12, 2d6+1d4+2
 * Modificatori: + / - ; keep highest/lowest: khN / klN
 */
export default function DiceRoller() {
  const bus = useChatBus();
  const [expr, setExpr] = useState("1d20");
  const [note, setNote] = useState("");
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<string>("");

  async function roll() {
    const formula = expr.trim();
    if (!formula) return;
    setRolling(true);
    try {
      const result = evaluateFormula(formula);
      const payload = {
        type: "dice",
        formula,
        note: note.trim() || undefined,
        total: result.total,
        parts: result.parts, // dettagli dei singoli termini
        text: renderHuman(result), // riassunto leggibile
        ts: Date.now(),
      };
      setLast(payload.text);
      // Pubblica in chat: apparirà come messaggio "system" con stile dadi
      bus.emit({ kind: "dice", payload });
    } catch (e: any) {
      const msg = e?.message || "Formula non valida";
      setLast(msg);
      bus.emit({ kind: "system", payload: { text: `🎲 Errore formula: ${msg}` } });
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl space-y-3">
      <div className="font-medium">Tiradadi</div>

      <div className="flex gap-2">
        <input
          className="bg-zinc-900 text-white px-3 py-2 rounded-md border border-zinc-700 w-48"
          placeholder="es. 1d20+5, 4d6kh3"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && roll()}
        />
        <input
          className="bg-zinc-900 text-white px-3 py-2 rounded-md border border-zinc-700 flex-1"
          placeholder="Nota (opzionale)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && roll()}
        />
        <Button variant="primary" onClick={roll} disabled={rolling}>
          {rolling ? "Lancio…" : "Lancia 🎲"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {["1d20", "2d20kh1", "2d20kl1", "2d6+3", "4d6kh3", "3d8", "1d12+2"].map(
          (p) => (
            <button
              key={p}
              onClick={() => setExpr(p)}
              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 hover:bg-zinc-700"
            >
              {p}
            </button>
          )
        )}
      </div>

      {last && (
        <div className="text-sm text-zinc-300 border-t border-zinc-700 pt-3">
          Ultimo: {last}
        </div>
      )}
    </div>
  );
}

/* -------------------------- Parser & evaluator --------------------------- */

type PartResult = {
  kind: "dice" | "flat";
  term: string;
  rolls?: number[]; // risultati dei dadi lanciati (prima del keep)
  kept?: number[];  // risultati tenuti dopo kh/kl
  sides?: number;
  count?: number;
  modifier?: number; // +N o -N per i flat
  subtotal: number;
};

type EvalResult = {
  total: number;
  parts: PartResult[];
};

const TERM_RE =
  /\s*([+-]?\d*d\d+(?:k[hl]\d+)?)|\s*([+-]?\d+)\s*/gi; // match "XdY[kh/klN]" o "+/-N"

function evaluateFormula(input: string): EvalResult {
  const parts: PartResult[] = [];
  let m: RegExpExecArray | null;
  let consumed = 0;

  while ((m = TERM_RE.exec(input)) !== null) {
    const [full, diceTerm, flatTerm] = m;
    consumed += full.length;

    if (diceTerm) {
      parts.push(evalDiceTerm(normalizeSign(diceTerm)));
    } else if (flatTerm) {
      const v = parseInt(flatTerm, 10);
      parts.push({ kind: "flat", term: flatTerm.trim(), modifier: v, subtotal: v });
    }
  }

  if (consumed < input.length) {
    // c'è spazzatura non parse-ata
    throw new Error("Impossibile interpretare tutta la formula");
  }

  if (!parts.length) throw new Error("Formula vuota");

  const total = parts.reduce((sum, p) => sum + p.subtotal, 0);
  return { total, parts };
}

function evalDiceTerm(termRaw: string): PartResult {
  // es. "-2d20kh1" / "+1d6" / "d12" (implica 1d12)
  const sign = termRaw.startsWith("-") ? -1 : 1;
  const term = termRaw.replace(/^[+]/, ""); // togli + iniziale
  const core = term.replace(/^[+-]/, "");

  const m = /^(\d*)d(\d+)(?:k([hl])(\d+))?$/i.exec(core);
  if (!m) throw new Error(`Termine non valido: ${termRaw}`);

  const count = parseInt(m[1] || "1", 10);
  const sides = parseInt(m[2], 10);
  const keepDir = m[3]?.toLowerCase() as "h" | "l" | undefined;
  const keepN = m[4] ? parseInt(m[4], 10) : undefined;

  if (count < 1 || sides < 2) throw new Error(`Dado non valido: ${termRaw}`);

  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  let kept = [...rolls];

  if (keepDir && keepN) {
    if (keepN < 1 || keepN > count) throw new Error(`keep fuori intervallo in ${termRaw}`);
    kept.sort((a, b) => (keepDir === "h" ? b - a : a - b));
    kept = kept.slice(0, keepN);
  }

  const subtotal = sign * kept.reduce((s, v) => s + v, 0);

  return {
    kind: "dice",
    term: termRaw.trim(),
    rolls,
    kept,
    sides,
    count,
    subtotal,
  };
}

function normalizeSign(s: string) {
  // trasforma "d20" -> "+1d20"
  if (/^[+-]/.test(s)) return s;
  return s.replace(/^d/i, "+1d");
}

function renderHuman(res: EvalResult) {
  const parts = res.parts
    .map((p) => {
      if (p.kind === "flat") return `${p.modifier! >= 0 ? "+" : ""}${p.modifier}`;
      const keptStr =
        p.kept && p.kept.length !== p.rolls?.length
          ? ` → kept [${p.kept.join(", ")}]`
          : "";
      const sign = p.subtotal >= 0 ? "+" : "−";
      return `${p.term}: [${p.rolls!.join(", ")}]${keptStr} ${sign} ${Math.abs(p.subtotal)}`;
    })
    .join(" | ");
  return `🎲 ${parts} = **${res.total}**`;
}