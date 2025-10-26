// src/components/table/RoomToolbar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DiceRoller from "../tools/DiceRoller";
import ChatPanel from "./ChatPanel";
import { Button } from "../ui/button";

// Mini scheda
import MiniCharacterCard from "@/components/sheet/MiniCharacterCard";
import type { PCData } from "@/types/character";
import { EMPTY_PC } from "@/types/character";

type Props = {
  roomCode: string; // es. ABC123
  isGM?: boolean;
};

type TabKey = "chat" | "dice" | "sheet" | "inventory" | "notes";

export default function RoomToolbar({ roomCode, isGM }: Props) {
  const storageKeyOpen  = useMemo(() => `toolbar-open:${roomCode}`,  [roomCode]);
  const storageKeyTab   = useMemo(() => `toolbar-tab:${roomCode}`,   [roomCode]);
  const storageKeyWidth = useMemo(() => `toolbar-width:${roomCode}`, [roomCode]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("chat");
  const [width, setWidth] = useState<number | null>(null);

  const asideRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  // ---- Mini-scheda: fetch lazy quando serve ----
  const [pc, setPc] = useState<PCData | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcError, setPcError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  async function loadPc() {
    if (pcLoading) return;
    setPcLoading(true);
    setPcError(null);
    try {
      const r = await fetch("/api/player/sheet", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json().catch(() => ({}));
      setPc(j?.data ?? null);
      hasFetchedRef.current = true;
    } catch (e: any) {
      setPc(null);
      setPcError(e?.message || "Errore caricamento scheda");
    } finally {
      setPcLoading(false);
    }
  }

  // avvia il fetch quando entri nel tab "sheet" la prima volta
  useEffect(() => {
    if (tab === "sheet" && !hasFetchedRef.current) {
      loadPc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ---- ripristina stato ----
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKeyOpen);
      if (v === "1") setOpen(true);

      const t = localStorage.getItem(storageKeyTab) as TabKey | null;
      if (t) setTab(t);

      const w = localStorage.getItem(storageKeyWidth);
      if (w) setWidth(parseInt(w, 10));
    } catch {}
  }, [storageKeyOpen, storageKeyTab, storageKeyWidth]);

  // ---- persisti open/tab ----
  useEffect(() => {
    try { localStorage.setItem(storageKeyOpen, open ? "1" : "0"); } catch {}
  }, [open, storageKeyOpen]);

  useEffect(() => {
    try { localStorage.setItem(storageKeyTab, tab);