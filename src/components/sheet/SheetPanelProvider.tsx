// src/components/sheet/SheetPanelProvider.tsx
"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { SheetPanel } from "./SheetPanel";

type SheetContextValue = {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  toggleSheet: () => void;
};

const SheetCtx = createContext<SheetContextValue | undefined>(undefined);

export function SheetPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const api = useMemo<SheetContextValue>(
    () => ({
      open,
      openSheet: () => setOpen(true),
      closeSheet: () => setOpen(false),
      toggleSheet: () => setOpen((v) => !v),
    }),
    [open]
  );

  return (
    <SheetCtx.Provider value={api}>
      {children}
      {/* Monta il pannello solo quando serve, passando entrambe le prop richieste */}
      {open && <SheetPanel open={open} onClose={api.closeSheet} />}
    </SheetCtx.Provider>
  );
}

export function useSheetPanel() {
  const ctx = useContext(SheetCtx);
  if (!ctx) {
    throw new Error("useSheetPanel must be used within <SheetPanelProvider>");
  }
  return ctx;
}