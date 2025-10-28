// src/components/sheet/SheetPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

/* ========= Tipi ========= */
type Attrs = { FOR: number; DES: number; COS: number; INT: number; SAP: number; CAR: number };
type Ability = { id: string; name: string; rank: 0 | 1 | 2 | 3 | 4; desc?: string };
type Weapon = { id: string; name: string; notes?: string; damageSeg?: number; equipped?: boolean };
type Armor  = { id: string; name: string; bonusD6: number; notes?: string; equipped?: boolean };
type SpellTier = "I" | "II" | "III" | "IV";
type SpellKind = "Incantesimo" | "Preghiera";
type SpellEntry = {
  id: string; name: string; kind: SpellKind; tier: SpellTier;
  school?: string; action?: string; range?: string; duration?: string; foc?: string; text: string;
};
type LearnedSpell = { id: string; refId: string; notes?: string };

type PCData = {
  ident: { name: string; race: string; clazz: string; level: number; portraitUrl?: string };
  attrs: Attrs;
  quick: { hp: number; foc: number; difMod?: number };
  abilities: Ability[];
  weapons: Weapon[];
  armors: Armor[];
  spells: LearnedSpell[];
  notes?: string;
};

/* ========= Utility UI locali (evitiamo dipendenze da classi globali) ========= */
const ui = {
  card: "rounded-xl border border-zinc-700/70 bg-zinc-900/70 backdrop-blur px-3 py-3",
  cardHeaderRow: "flex items-center justify-between gap-2 mb-1",
  h2: "text-[13px] font-semibold tracking-wide uppercase text-zinc-200",
  label: "text-[11px] font-medium text-zinc-400 mb-1",
  input: "w-full rounded-md border border-zinc-700 bg-zinc-800/80 text-zinc-100 px-2 py-1.5 outline-none focus:ring-2 focus:ring-zinc-500/40 focus:border-zinc-500/50 placeholder:text-zinc-500",
  inputCenter: "text-center",
  btn: "px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/70 hover:bg-zinc-700/70 text-zinc-100 transition",
  btnPrimary: "px-3 py-1.5 rounded-md border border-emerald-700/60 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-200 transition",
  btnGhost: "px-2 py-1 rounded border border-transparent hover:border-zinc-700 hover:bg-zinc-800/60",
  btnSubtle: "px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200",
  chip: "px-2 py-0.5 rounded text-sm bg-zinc-800 border border-zinc-700 text-zinc-100",
  hint: "text-[11px] text-zinc-400",
  smallText: "text-sm text-zinc-300",
  empty: "text-sm text-zinc-500",
};

/* ========= Helpers ========= */
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const normStr = (v: any, def = "") => (typeof v === "string" ? v : v == null ? def : String(v));
const normNum = (v: any, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const EMPTY_PC: PCData = {
  ident: { name: "", race: "", clazz: "", level: 1, portraitUrl: "" },
  attrs: { FOR: 0, DES: 0, COS: 0, INT: 0, SAP: 0, CAR: 0 },
  quick: { hp: 10, foc: 3, difMod: 0 },
  abilities: [],
  weapons: [],
  armors: [],
  spells: [],
  notes: "",
};

function normalizePC(inData: any): PCData {
  const abilities: Ability[] = Array.isArray(inData?.abilities)
    ? inData.abilities.map((a: any) => ({
        id: normStr(a?.id, uid()),
        name: normStr(a?.name),
        rank: clamp(normNum(a?.rank, 0), 0, 4) as 0 | 1 | 2 | 3 | 4,
        desc: normStr(a?.desc),
      }))
    : [];

  const weapons: Weapon[] = Array.isArray(inData?.weapons)
    ? inData.weapons.map((w: any) => ({
        id: normStr(w?.id, uid()),
        name: normStr(w?.name),
        notes: normStr(w?.notes),
        damageSeg: normNum(w?.damageSeg, 1),
        equipped: !!w?.equipped,
      }))
    : [];

  const armors: Armor[] = Array.isArray(inData?.armors)
    ? inData.armors.map((a: any) => ({
        id: normStr(a?.id, uid()),
        name: normStr(a?.name),
        bonusD6: normNum(a?.bonusD6, 0),
        notes: normStr(a?.notes),
        equipped: !!a?.equipped,
      }))
    : [];

  const spells: LearnedSpell[] = Array.isArray(inData?.spells)
    ? inData.spells.map((s: any) => ({
        id: normStr(s?.id, uid()),
        refId: normStr(s?.refId),
        notes: normStr(s?.notes),
      }))
    : [];

  // retrocompat: mods.difMod -> quick.difMod
  const legacyDifMod =
    inData?.mods && typeof inData.mods === "object" ? normNum(inData?.mods?.difMod, NaN) : NaN;
  const difMod = Number.isFinite(legacyDifMod) ? legacyDifMod : normNum(inData?.quick?.difMod, 0);

  return {
    ident: {
      name: normStr(inData?.ident?.name, ""),
      race: normStr(inData?.ident?.race, ""),
      clazz: normStr(inData?.ident?.clazz, ""),
      level: normNum(inData?.ident?.level, 1) || 1,
      portraitUrl: normStr(inData?.ident?.portraitUrl, ""),
    },
    attrs: {
      FOR: normNum(inData?.attrs?.FOR, 0),
      DES: normNum(inData?.attrs?.DES, 0),
      COS: normNum(inData?.attrs?.COS, 0),
      INT: normNum(inData?.attrs?.INT, 0),
      SAP: normNum(inData?.attrs?.SAP, 0),
      CAR: normNum(inData?.attrs?.CAR, 0),
    },
    quick: {
      hp: normNum(inData?.quick?.hp, 10),
      foc: normNum(inData?.quick?.foc, 3),
      difMod,
    },
    abilities,
    weapons,
    armors,
    spells,
    notes: normStr(inData?.notes, ""),
  };
}

function derivedHP(level: number, COS: number) {
  return Math.max(1, 8 + COS + Math.max(0, level - 1) * 2);
}
function calcDIF(des: number, armor: number, mod: number = 0) {
  return 10 + Math.max(0, des) + Math.max(0, armor) + (mod || 0);
}

/* ========= Component ========= */
export function SheetPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<PCData>(EMPTY_PC);

  useEffect(() => setMounted(true), []);

  // Carica al momento dell'apertura
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setStatus("");
        const r = await fetch("/api/player/sheet", { cache: "no-store", credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        const incoming = j?.data ? normalizePC(j.data) : EMPTY_PC;
        setData(incoming);
      } catch (e: any) {
        if (!alive) return;
        setData(EMPTY_PC);
        setStatus(e?.message || "Errore durante il caricamento");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const payload = normalizePC({
        ...data,
        ident: { ...data.ident, level: clamp(data.ident.level ?? 1, 1, 50) },
        attrs: {
          FOR: clamp(data.attrs.FOR ?? 0, 0, 20),
          DES: clamp(data.attrs.DES ?? 0, 0, 20),
          COS: clamp(data.attrs.COS ?? 0, 0, 20),
          INT: clamp(data.attrs.INT ?? 0, 0, 20),
          SAP: clamp(data.attrs.SAP ?? 0, 0, 20),
          CAR: clamp(data.attrs.CAR ?? 0, 0, 20),
        },
        quick: {
          hp: clamp(data.quick?.hp ?? 0, 0, 999),
          foc: clamp(data.quick?.foc ?? 0, 0, 99),
          difMod: clamp(data.quick?.difMod ?? 0, -20, 50),
        },
        abilities: (data.abilities || []).map((a) => ({
          ...a,
          id: a.id || uid(),
          rank: clamp(a.rank, 0, 4) as 0 | 1 | 2 | 3 | 4,
        })),
        weapons: (data.weapons || []).map((w) => ({
          ...w,
          id: w.id || uid(),
          damageSeg: w.damageSeg ?? 1,
        })),
        armors: (data.armors || []).map((a) => ({
          ...a,
          id: a.id || uid(),
          bonusD6: a.bonusD6 ?? 0,
        })),
        spells: (data.spells || []).map((s) => ({ ...s, id: s.id || uid() })),
      });

      const r = await fetch("/api/player/sheet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      let ok = r.ok;
      let msg = "";
      try {
        const jr = await r.json();
        ok = ok && (jr?.ok !== false);
        if (jr?.message) msg = String(jr.message);
      } catch {}
      setStatus(ok ? "Salvato ✅" : msg || "Il server non ha confermato (salvato lato client)");
    } catch {
      setStatus("Errore: impossibile salvare ora.");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(""), 2500);
    }
  }

  // Portal container
  const container = typeof document !== "undefined" ? document.body : null;
  if (!mounted || !container) return null;

  /* ==== derivati UI ==== */
  const armorBonus = useMemo(
    () => (data?.armors || []).find((a) => a.equipped)?.bonusD6 ?? 0,
    [data?.armors]
  );
  const sugHP = useMemo(
    () => derivedHP(data?.ident?.level ?? 1, data?.attrs?.COS ?? 0),
    [data?.ident?.level, data?.attrs?.COS]
  );
  const dif = useMemo(
    () => calcDIF(data?.attrs?.DES ?? 0, armorBonus, data?.quick?.difMod ?? 0),
    [data?.attrs?.DES, armorBonus, data?.quick?.difMod]
  );

  // DB incantesimi (opzionale, se esiste in bundle)
  let SPELLS_DB: SpellEntry[] = [];
  try {
    // @ts-ignore
    SPELLS_DB = (require("@/data/spells") as { SPELLS_DB: SpellEntry[] }).SPELLS_DB || [];
  } catch {}

  const [spellQuery, setSpellQuery] = useState("");
  const [spellKind, setSpellKind] = useState<"all" | SpellKind>("all");
  const [spellTier, setSpellTier] = useState<"all" | SpellTier>("all");

  const filteredSpells = useMemo(() => {
    let list = SPELLS_DB as SpellEntry[];
    if (spellKind !== "all") list = list.filter((s) => s.kind === spellKind);
    if (spellTier !== "all") list = list.filter((s) => s.tier === spellTier);
    const q = spellQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.text?.toLowerCase() ?? "").includes(q) ||
          (s.school?.toLowerCase() ?? "").includes(q)
      );
    }
    return list;
  }, [SPELLS_DB, spellKind, spellTier, spellQuery]);

  function addSpell(ref: SpellEntry) {
    if (data.spells.some((s) => s.refId === ref.id)) return;
    setData((d) => ({ ...d, spells: [...d.spells, { id: uid(), refId: ref.id, notes: "" }] }));
  }
  function removeSpell(id: string) {
    setData((d) => ({ ...d, spells: d.spells.filter((s) => s.id !== id) }));
  }

  return createPortal(
    <div className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`absolute right-4 bottom-4 w-[min(1080px,96vw)] max-h-[90vh] rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-2xl transition-transform
        ${open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 py-2 rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-zinc-200 font-semibold">Scheda Personaggio</span>
            <div className="flex items-center gap-2">
              {status && <span className="text-xs text-zinc-400">{status}</span>}
              <button className={ui.btnPrimary} onClick={save} disabled={saving}>
                {saving ? "Salvo…" : "Salva"}
              </button>
              <button className={ui.btn} onClick={onClose}>
                Chiudi
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 overflow-auto max-h-[calc(90vh-48px)] space-y-3">
          {loading ? (
            <div className={ui.smallText}>Caricamento…</div>
          ) : (
            <>
              {/* IDENTITÀ */}
              <section className={ui.card}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">👤</span>
                  <h2 className={ui.h2}>Identità</h2>
                </div>
                <div className="grid md:grid-cols-[1fr_220px] gap-3">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <div className={ui.label}>Nome</div>
                      <input className={ui.input} value={data.ident.name}
                        onChange={(e) => setData((d) => ({ ...d, ident: { ...d.ident, name: e.target.value } }))} />
                    </div>
                    <div>
                      <div className={ui.label}>Razza</div>
                      <input className={ui.input} value={data.ident.race}
                        onChange={(e) => setData((d) => ({ ...d, ident: { ...d.ident, race: e.target.value } }))} />
                    </div>
                    <div>
                      <div className={ui.label}>Classe</div>
                      <input className={ui.input} value={data.ident.clazz}
                        onChange={(e) => setData((d) => ({ ...d, ident: { ...d.ident, clazz: e.target.value } }))} />
                    </div>
                    <div>
                      <div className={ui.label}>Livello</div>
                      <input type="number" min={1} className={`${ui.input} ${ui.inputCenter}`} value={data.ident.level}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            ident: { ...d.ident, level: parseInt(e.target.value || "1") },
                          }))
                        } />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <div className={ui.label}>Ritratto (URL)</div>
                      <input className={ui.input} placeholder="https://…" value={data.ident.portraitUrl || ""}
                        onChange={(e) =>
                          setData((d) => ({ ...d, ident: { ...d.ident, portraitUrl: e.target.value } }))
                        } />
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-700 overflow-hidden bg-zinc-900/60 h-[150px]">
                    {data.ident.portraitUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.ident.portraitUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs text-zinc-500">
                        Nessuna immagine
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* QUICK */}
              <section className="grid md:grid-cols-3 gap-3">
                <div className={ui.card}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">❤️</span>
                    <div className={ui.h2}>HP</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className={`${ui.input} ${ui.inputCenter} w-24`}
                      value={data.quick?.hp ?? 0}
                      onChange={(e) =>
                        setData((d) => ({ ...d, quick: { ...d.quick, hp: parseInt(e.target.value || "0") } }))
                      }
                    />
                    <span className={ui.hint}>
                      Suggerito <b className="text-zinc-100">{sugHP}</b>
                    </span>
                  </div>
                </div>

                <div className={ui.card}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🛡️</span>
                    <div className={ui.h2}>DIF</div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-xl font-semibold">{dif}</div>
                    <span className={ui.hint}>
                      10 + DES ({data.attrs?.DES ?? 0}) + Arm. ({armorBonus}d6) + Mod.
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={ui.label}>Mod.</span>
                    <input
                      type="number"
                      className={`${ui.input} ${ui.inputCenter} w-24`}
                      value={data.quick?.difMod ?? 0}
                      onChange={(e) =>
                        setData((d) => ({ ...d, quick: { ...d.quick, difMod: parseInt(e.target.value || "0") } }))
                      }
                    />
                  </div>
                </div>

                <div className={ui.card}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">✨</span>
                    <div className={ui.h2}>FOC</div>
                  </div>
                  <input
                    type="number"
                    className={`${ui.input} ${ui.inputCenter} w-24`}
                    value={data.quick?.foc ?? 0}
                    onChange={(e) =>
                      setData((d) => ({ ...d, quick: { ...d.quick, foc: parseInt(e.target.value || "0") } }))
                    }
                  />
                </div>
              </section>

              {/* ATTRIBUTI */}
              <section className={ui.card}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📊</span>
                  <h2 className={ui.h2}>Caratteristiche</h2>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-1">
                  {(["FOR", "DES", "COS", "INT", "SAP", "CAR"] as (keyof Attrs)[]).map((k) => (
                    <div key={k}>
                      <div className={ui.label}>{k}</div>
                      <input
                        type="number"
                        className={`${ui.input} ${ui.inputCenter}`}
                        value={data.attrs?.[k] ?? 0}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            attrs: { ...d.attrs, [k]: parseInt(e.target.value || "0") } as Attrs,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* ABILITÀ */}
              <section className={ui.card}>
                <div className={ui.cardHeaderRow}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧩</span>
                    <h2 className={ui.h2}>Abilità</h2>
                  </div>
                  <button
                    className={ui.btnPrimary}
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        abilities: [...d.abilities, { id: uid(), name: "", rank: 0, desc: "" }],
                      }))
                    }
                  >
                    + Aggiungi
                  </button>
                </div>
                <div className="space-y-2 mt-2">
                  {data.abilities.length === 0 && <div className={ui.empty}>Nessuna abilità.</div>}
                  {data.abilities.map((ab) => (
                    <div key={ab.id} className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                      <div className="grid md:grid-cols-3 gap-2">
                        <div>
                          <div className={ui.label}>Nome</div>
                          <input
                            className={ui.input}
                            value={ab.name}
                            onChange={(e) =>
                              setData((d) => ({
                                ...d,
                                abilities: d.abilities.map((x) =>
                                  x.id === ab.id ? { ...x, name: e.target.value } : x
                                ),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <div className={ui.label}>Grado</div>
                          <div className="flex items-center gap-2">
                            <button
                              className={ui.btnGhost}
                              onClick={() =>
                                setData((d) => ({
                                  ...d,
                                  abilities: d.abilities.map((x) =>
                                    x.id === ab.id ? { ...x, rank: (clamp(x.rank - 1, 0, 4) as any) } : x
                                  ),
                                }))
                              }
                            >
                              −
                            </button>
                            <div className={ui.chip}>{ab.rank}</div>
                            <button
                              className={ui.btnGhost}
                              onClick={() =>
                                setData((d) => ({
                                  ...d,
                                  abilities: d.abilities.map((x) =>
                                    x.id === ab.id ? { ...x, rank: (clamp(x.rank + 1, 0, 4) as any) } : x
                                  ),
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex items-end justify-end">
                          <button
                            className={ui.btnSubtle}
                            onClick={() =>
                              setData((d) => ({ ...d, abilities: d.abilities.filter((x) => x.id !== ab.id) }))
                            }
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className={ui.label}>Descrizione</div>
                        <textarea
                          className={`${ui.input} min-h-18`}
                          value={ab.desc || ""}
                          onChange={(e) =>
                            setData((d) => ({
                              ...d,
                              abilities: d.abilities.map((x) =>
                                x.id === ab.id ? { ...x, desc: e.target.value } : x
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* INCANTESIMI */}
              <section className={ui.card}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📜</span>
                  <h2 className={ui.h2}>Incantesimi & Preghiere</h2>
                </div>

                <div className="grid md:grid-cols-4 gap-2 mt-1">
                  <div className="md:col-span-2">
                    <div className={ui.label}>Cerca (nome, testo, scuola)</div>
                    <input
                      className={ui.input}
                      placeholder="es. Dardo, Benedizione…"
                      value={spellQuery}
                      onChange={(e) => setSpellQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className={ui.label}>Tipo</div>
                    <select
                      className={ui.input}
                      value={spellKind}
                      onChange={(e) => setSpellKind(e.target.value as any)}
                    >
                      <option value="all">Tutti</option>
                      <option value="Incantesimo">Incantesimi</option>
                      <option value="Preghiera">Preghiere</option>
                    </select>
                  </div>
                  <div>
                    <div className={ui.label}>Tier</div>
                    <select
                      className={ui.input}
                      value={spellTier}
                      onChange={(e) => setSpellTier(e.target.value as any)}
                    >
                      <option value="all">Tutti</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2">
                  <div className={`${ui.label} mb-1`}>Risultati</div>
                  <div className="space-y-1.5 max-h-60 overflow-auto pr-1">
                    {filteredSpells.length === 0 && <div className={ui.empty}>Nessun risultato.</div>}
                    {filteredSpells.map((s) => {
                      const already = data.spells.some((ls) => ls.refId === s.id);
                      return (
                        <div key={s.id} className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{s.name}</div>
                              <div className="text-[11px] text-zinc-400">
                                {s.kind} • Tier {s.tier}
                                {s.school ? ` • ${s.school}` : ""}
                                {s.foc ? ` • ${s.foc}` : ""}
                                {s.action ? ` • ${s.action}` : ""}
                                {s.range ? ` • ${s.range}` : ""}
                                {s.duration ? ` • ${s.duration}` : ""}
                              </div>
                            </div>
                            <button
                              className={already ? ui.btn : ui.btnPrimary}
                              disabled={already}
                              onClick={() => addSpell(s)}
                            >
                              {already ? "✓ Aggiunto" : "+ Aggiungi"}
                            </button>
                          </div>
                          <div className={`${ui.smallText} mt-1`}>{s.text}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-700 mt-2 pt-2">
                  <div className={`${ui.label} mb-1`}>Selezionati</div>
                  {data.spells.length === 0 && (
                    <div className={ui.empty}>Nessun incantesimo o preghiera selezionato.</div>
                  )}
                  <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
                    {data.spells.map((s) => {
                      const ref = (SPELLS_DB as SpellEntry[]).find((x) => x.id === s.refId);
                      if (!ref) return null;
                      return (
                        <div key={s.id} className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{ref.name}</div>
                              <div className="text-[11px] text-zinc-400">
                                {ref.kind} • Tier {ref.tier}
                                {ref.foc ? ` • ${ref.foc}` : ""}
                              </div>
                            </div>
                            <button className={ui.btnSubtle} onClick={() => removeSpell(s.id)}>
                              Rimuovi
                            </button>
                          </div>
                          <div className={`${ui.label} mt-1`}>Note</div>
                          <input
                            className={ui.input}
                            placeholder="Annotazioni (variante, focus, dominio, ecc.)"
                            value={s.notes || ""}
                            onChange={(e) =>
                              setData((d) => ({
                                ...d,
                                spells: d.spells.map((x) => (x.id === s.id ? { ...x, notes: e.target.value } : x)),
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* EQUIP */}
              <section className={ui.card}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🗡️</span>
                  <h2 className={ui.h2}>Equip</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {/* Armi */}
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Armi</div>
                      <button
                        className={ui.btnPrimary}
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            weapons: [
                              ...d.weapons,
                              { id: uid(), name: "", notes: "", damageSeg: 1, equipped: false },
                            ],
                          }))
                        }
                      >
                        + Aggiungi
                      </button>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {data.weapons.length === 0 && <div className={ui.empty}>Nessuna arma.</div>}
                      {data.weapons.map((w) => (
                        <div key={w.id} className="rounded border border-zinc-700 p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className={ui.label}>Nome</div>
                              <input
                                className={ui.input}
                                value={w.name}
                                onChange={(e) =>
                                  setData((d) => ({
                                    ...d,
                                    weapons: d.weapons.map((x) =>
                                      x.id === w.id ? { ...x, name: e.target.value } : x
                                    ),
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <div className={ui.label}>Danno (seg)</div>
                              <input
                                type="number"
                                className={`${ui.input} ${ui.inputCenter}`}
                                value={w.damageSeg ?? 1}
                                onChange={(e) =>
                                  setData((d) => ({
                                    ...d,
                                    weapons: d.weapons.map((x) =>
                                      x.id === w.id
                                        ? { ...x, damageSeg: parseInt(e.target.value || "1") }
                                        : x
                                    ),
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className={`${ui.label} mt-1`}>Note</div>
                          <input
                            className={ui.input}
                            value={w.notes || ""}
                            onChange={(e) =>
                              setData((d) => ({
                                ...d,
                                weapons: d.weapons.map((x) =>
                                  x.id === w.id ? { ...x, notes: e.target.value } : x
                                ),
                              }))
                            }
                          />
                          <div className="mt-1 flex items-center justify-between">
                            <label className="text-[12px] text-zinc-400 flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!w.equipped}
                                onChange={(e) =>
                                  setData((d) => ({
                                    ...d,
                                    weapons: d.weapons.map((x) =>
                                      x.id === w.id ? { ...x, equipped: e.target.checked } : x
                                    ),
                                  }))
                                }
                              />
                              Equipaggiata
                            </label>
                            <button
                              className={ui.btnSubtle}
                              onClick={() =>
                                setData((d) => ({ ...d, weapons: d.weapons.filter((x) => x.id !== w.id) }))
                              }
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Armature */}
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Armature</div>
                      <button
                        className={ui.btnPrimary}
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            armors: [
                              ...d.armors,
                              { id: uid(), name: "", bonusD6: 1, notes: "", equipped: false },
                            ],
                          }))
                        }
                      >
                        + Aggiungi
                      </button>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {data.armors.length === 0 && <div className={ui.empty}>Nessuna armatura.</div>}
                      {data.armors.map((a) => (
                        <div key={a.id} className="rounded border border-zinc-700 p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className={ui.label}>Nome</div>
                              <input
                                className={ui.input}
                                value={a.name}
                                onChange={(e) =>
                                  setData((d) => ({
                                    ...d,
                                    armors: d.armors.map((x) =>
                                      x.id === a.id ? { ...x, name: e.target.value } : x
                                    ),
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <div className={ui.label}>Bonus DIF (d6)</div>
                              <input
                                type="number"
                                className={`${ui.input} ${ui.inputCenter}`}
                                value={a.bonusD6}
                                onChange={(e) =>
                                  setData((d) => ({
                                    ...d,
                                    armors: d.armors.map((x) =>
                                      x.id === a.id
                                        ? { ...x, bonusD6: parseInt(e.target.value || "0") }
                                        : x
                                    ),
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className={`${ui.label} mt-1`}>Note</div>
                          <input
                            className={ui.input}
                            value={a.notes || ""}
                            onChange={(e) =>
                              setData((d) => ({
                                ...d,
                                armors: d.armors.map((x) =>
                                  x.id === a.id ? { ...x, notes: e.target.value } : x
                                ),
                              }))
                            }
                          />
                          <div className="mt-1 flex items-center justify-between">
                            <label className="text-[12px] text-zinc-400 flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!a.equipped}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setData((d) => ({
                                    ...d,
                                    armors: d.armors.map((x) =>
                                      x.id === a.id ? { ...x, equipped: on } : { ...x, equipped: false }
                                    ),
                                  }));
                                }}
                              />
                              Indossata (calcolata in DIF)
                            </label>
                            <button
                              className={ui.btnSubtle}
                              onClick={() =>
                                setData((d) => ({ ...d, armors: d.armors.filter((x) => x.id !== a.id) }))
                              }
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* DESCRIZIONE */}
              <section className={ui.card}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📝</span>
                  <h2 className={ui.h2}>Descrizione PG</h2>
                </div>
                <textarea
                  className={`${ui.input} min-h-24`}
                  placeholder="Origini, tratti, legami, obiettivi, note…"
                  value={data.notes || ""}
                  onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    container
  );
}

export default SheetPanel;