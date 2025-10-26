'use client';

import { PCData } from '@/types/character';
import { armorEffectiveD6Auto, calcDIF } from '@/lib/characters/derived';

export default function MiniCharacterCard({ data }: { data: PCData }) {
  const equippedArmor = data.armors.find(a => a.equipped);
  const effArmor = equippedArmor
    ? (equippedArmor.useOverride ? (equippedArmor.bonusD6||0) : armorEffectiveD6Auto(equippedArmor.tipo, equippedArmor.qualita))
    : 0;
  const dif = calcDIF(data.attrs.DES||0, effArmor) + (data.current.difMod||0);

  return (
    <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl">
      <div className="flex items-center gap-3">
        {data.ident.portraitUrl ? (
          <img src={data.ident.portraitUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-zinc-700" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700 grid place-items-center text-zinc-500">PG</div>
        )}
        <div className="min-w-0">
          <div className="font-semibold truncate">{data.ident.name || 'Personaggio'}</div>
          <div className="text-xs text-zinc-400 truncate">{data.ident.race || '—'} • {data.ident.clazz || '—'} • Lv {data.ident.level || 1}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <div className="rounded-lg border border-zinc-700 p-2">
          <div className="text-xs text-zinc-400">HP</div>
          <div className="font-semibold">{data.current.hp}</div>
        </div>
        <div className="rounded-lg border border-zinc-700 p-2">
          <div className="text-xs text-zinc-400">DIF</div>
          <div className="font-semibold">{dif}</div>
        </div>
        <div className="rounded-lg border border-zinc-700 p-2">
          <div className="text-xs text-zinc-400">AP</div>
          <div className="font-semibold">{Math.max(0,(data.ap.total||0)-(data.ap.spent||0))}</div>
        </div>
      </div>
    </div>
  );
}