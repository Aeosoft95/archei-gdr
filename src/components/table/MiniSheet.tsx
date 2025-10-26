// src/components/sheet/MiniCharacterCard.tsx
"use client";

import React from "react";
import type { PCData } from "@/types/character";

type Props = {
  data: PCData;
  loading?: boolean;
};

export default function MiniCharacterCard({ data, loading = false }: Props) {
  // fallback sicuri
  const name = data?.ident?.name || "—";
  const clazz = data?.ident?.clazz || "—";
  const race = data?.ident?.race || "—";
  const lvl = data?.ident?.level ?? 1;
  const hp = data?.current?.hp ?? 0;
  const des = data?.attrs?.DES ?? 0;
  const cos = data?.attrs?.COS ?? 0;

  const equippedWeapons = Array.isArray(data?.weapons)
    ? data.weapons.filter((w: any) => w?.equipped)
    : [];

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/70 p-3">
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-zinc-400">PG</div>
          {loading ? (
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-700/60" />
          ) : (
            <div className="font-semibold truncate">{name}</div>
          )}
        </div>
        <div className="text-xs text-zinc-400">
          {loading ? (
            <span className="inline-block h-4 w-10 animate-pulse rounded bg-zinc-700/60" />
          ) : (
            <>Lv {lvl}</>
          )}
        </div>
      </div>

      {/* ident */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-zinc-400">Razza</div>
          {loading ? (
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-700/60" />
          ) : (
            <div className="truncate">{race}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-zinc-400">Classe</div>
          {loading ? (
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-700/60" />
          ) : (
            <div className="truncate">{clazz}</div>
          )}
        </div>
      </div>

      {/* stats rapide */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <StatBox label="HP" value={loading ? "…" : String(hp)} />
        <StatBox label="DES" value={loading ? "…" : String(des)} />
        <StatBox label="COS" value={loading ? "…" : String(cos)} />
      </div>

      {/* armi equipaggiate */}
      <div className="mt-3">
        <div className="text-xs text-zinc-400 mb-1">Armi equipaggiate</div>
        {loading ? (
          <div className="space-y-1">
            <div className="h-4 w-44 animate-pulse rounded bg-zinc-700/60" />
            <div className="h-4 w-36 animate-pulse rounded bg-zinc-700/60" />
          </div>
        ) : equippedWeapons.length === 0 ? (
          <div className="text-xs text-zinc-500">Nessuna</div>
        ) : (
          <ul className="list-disc pl-5 text-sm space-y-0.5">
            {equippedWeapons.map((w: any) => (
              <li key={w.id} className="truncate">
                {w.name || "Arma"}{w.qualita ? ` — ${w.qualita}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-center">
      <div className="text-[10px] text-zinc-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}