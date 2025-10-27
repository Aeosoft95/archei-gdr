// src/components/sheet/SheetPanelProvider.tsx
"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import SheetPanel from "./SheetPanel";

type Ctx = {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  toggleSheet: () => void;
};
const SheetCtx = createContext<Ctx | null>(null);

export function SheetPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSheet  = useCallback(()=> setOpen(true), []);
  const closeSheet = useCallback(()=> setOpen(false), []);
  const toggleSheet= useCallback(()=> setOpen(o=>!o), []);

  return (
    <SheetCtx.Provider value={{ open, openSheet, closeSheet, toggleSheet }}>
      {children}
      {open && <SheetPanel onClose={closeSheet} />}
    </SheetCtx.Provider>
  );
}

export function useSheetPanel(){
  const ctx = useContext(SheetCtx);
  if(!ctx) throw new Error("useSheetPanel must be used within <SheetPanelProvider>");
  return ctx;
}
