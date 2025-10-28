// src/components/table/RoomTopActions.tsx
"use client";

import { useSheetPanel } from "@/components/sheet/SheetPanelProvider";

export default function RoomTopActions() {
  const { toggleSheet } = useSheetPanel();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleSheet}
        className="px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-sm"
        aria-label="Apri scheda personaggio"
      >
        📄 Scheda
      </button>
    </div>
  );
}