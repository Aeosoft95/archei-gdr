"use client";

import { useEffect, useState } from "react";

type MiniPC = {
  ident?: { name?: string; clazz?: string; level?: number; portraitUrl?: string };
  attrs?: { FOR:number; DES:number; COS:number; INT:number; SAP:number; CAR:number };
  current?: { hp?: number; difMod?: number };
  armors?: { name?: string; equipped?: boolean }[];
  weapons?: { name?: string; equipped?: boolean }[];
};

export default function MiniSheet() {
  const [data, setData] = useState<MiniPC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/player/sheet", { cache: "no-store" });
        const js = await r.json().catch(() => ({}));
        if (!alive) return;
        setData(js?.data ?? null);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="text-sm text-zinc-400">Caricamento…</div>;
  if (!data) return (
    <div className="text-sm text-zinc-400">
      Nessuna scheda trovata. <a className="underline" href="/sheet">Crea/Apri scheda</a>
    </div>
  );

  const eqArmor = (data.armors||[]).find(a => a.equipped)?.name || "—";
  const eqWeapons = (data.weapons||[]).filter(w => w.equipped).map(w => w.name || "—").join(", ") || "—";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {data.ident?.portraitUrl ? (
          <img src={data.ident.portraitUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-zinc-700"/>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 grid place-items-center">🧙</div>
        )}
        <div className="min-w-0">
          <div className="font-semibold truncate">{data.ident?.name || "Senza nome"}</div>
          <div className="text-xs text-zinc-400 truncate">
            {data.ident?.clazz || "—"} • Lv {data.ident?.level ?? 1}
          </div>
        </div>
        <a href="/sheet" className="ml-auto text-sm px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-800">Apri scheda</a>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {(["FOR","DES","COS","INT","SAP","CAR"] as const).map(k=>(
          <div key={k} className="rounded-lg border border-zinc-700 p-2">
            <div className="text-[10px] text-zinc-400">{k}</div>
            <div className="font-semibold">{(data.attrs as any)?.[k] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-700 p-2">
          <div className="text-[10px] text-zinc-400">HP</div>
          <div className="font-semibold">{data.current?.hp ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-zinc-700 p-2">
          <div className="text-[10px] text-zinc-400">Mod. DIF</div>
          <div className="font-semibold">{data.current?.difMod ?? 0}</div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-700 p-2">
        <div className="text-[10px] text-zinc-400 mb-1">Armatura equip.</div>
        <div className="text-sm">{eqArmor}</div>
      </div>
      <div className="rounded-lg border border-zinc-700 p-2">
        <div className="text-[10px] text-zinc-400 mb-1">Armi equip.</div>
        <div className="text-sm">{eqWeapons}</div>
      </div>
    </div>
  );
}