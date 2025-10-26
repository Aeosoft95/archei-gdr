// src/components/tools/DiceRoller.tsx
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useChatBus } from "@/lib/chat/bus";
import {
  parseD6Pool,
  rollD6Pool,
  fmtPoolResult,
  rollArithmeticExpression,
  type PartResult,
} from "@/lib/dice/roller-d6";

export default function DiceRoller() {
  const { emit } = useChatBus();

  const [input, setInput] = useState("5d6");  // es. "8d6"
  const [aimed, setAimed] = useState(false);
  const [target, setTarget] = useState(6);    // numero mirato 1..6
  const [aimedDice, setAimedDice] = useState(1); // quanti d6 tirare (1..5) in mirato
  const [last, setLast] = useState("");

  function partToString(p: PartResult): string {
    if (p.kind === "dice") {
      const rolls = `[${p.rolls.join(",")}]`;
      return p.sign < 0 ? `-${rolls}` : rolls;
    }
    if (p.kind === "mod") {
      return (p.sign < 0 ? "-" : "+") + String(p.value);
    }
    return "?";
  }

  const onRoll = () => {
    try {
      const maybePool = parseD6Pool(input);
      if (maybePool) {
        const r = rollD6Pool(maybePool, {
          aimed,
          target,
          aimedCount: aimed ? aimedDice : undefined,
        });
        const detail = fmtPoolResult(r);
        setLast(detail);

        emit({
          type: "dice",
          expr: `${maybePool}d6`,
          total: r.sum,
          successes: r.successes,
          threshold: r.aimed ? undefined : r.threshold,
          aimed: r.aimed,
          target: r.aimed ? r.target : undefined,
          thrown: r.thrown,
          detail,
          rolls: r.rolls,
        });
        return;
      }

      // fallback: aritmetico
      const a = rollArithmeticExpression(input);
      const text = `${input} ${a.parts.map(partToString).join(" ")} = ${a.total}`;
      setLast(text);
      emit({ type: "dice", expr: input, total: a.total, detail: text });
    } catch (e: any) {
      setLast(e?.message || "Formula non valida");
    }
  };

  return (
    <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl">
      <div className="text-sm text-zinc-300 mb-2">
        Modalità successi (soglie fisse) o Tiro mirato (risultato esatto).
        Esempi: <span className="ml-1 font-mono text-zinc-200">5d6</span>,{" "}
        <span className="font-mono text-zinc-200">8d6</span>,{" "}
        <span className="font-mono text-zinc-200">2d6+3</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="flex-1 min-w-[160px] bg-zinc-900 text-white px-3 py-2 rounded-md border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Es. 5d6"
          onKeyDown={(e) => { if (e.key === "Enter") onRoll(); }}
        />

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={aimed}
            onChange={(e) => setAimed(e.target.checked)}
          />
          Tiro mirato
        </label>

        {aimed && (
          <>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              Numero:
              <select
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                value={target}
                onChange={(e) =>
                  setTarget(Math.max(1, Math.min(6, parseInt(e.target.value || "6", 10))))
                }
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              Dadi:
              <select
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1"
                value={aimedDice}
                onChange={(e) =>
                  setAimedDice(Math.max(1, Math.min(5, parseInt(e.target.value || "1", 10))))
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}d6
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <Button variant="primary" onClick={onRoll}>
          Tira
        </Button>
      </div>

      <div className="text-xs text-zinc-400 mt-2">
        Soglie (normale): 1–5 → 6+, 6–10 → 5+, 11–20 → 4+, 21+ → 3+
      </div>

      {last && (
        <div className="mt-3 text-sm text-zinc-300 break-words">
          Ultimo: <span className="font-mono text-zinc-100">{last}</span>
        </div>
      )}
    </div>
  );
}