// src/pages/sessions/join.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "../../components/ui/button";

export default function JoinSessionPage() {
  const router = useRouter();
  const { status } = useSession();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (status === "unauthenticated") {
    signIn();
    return null;
  }
  if (status !== "authenticated") return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) {
      setErr("Inserisci un codice invito");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Join fallita");
      router.push(j.path || `/table/${c}`);
    } catch (e: any) {
      setErr(e?.message || "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <h1 className="text-xl font-semibold mb-4">Unisciti a una sessione</h1>
      <form className="flex gap-3 items-center" onSubmit={onSubmit}>
        <input
          className="bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Codice invito (es. A1B2C3)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          autoFocus
        />
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Accesso…" : "Entra"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/dashboard")}>
          Annulla
        </Button>
      </form>
      {err && <div className="text-red-400 text-sm mt-3">{err}</div>}
      <p className="text-xs text-zinc-400 mt-4">
        Suggerimento: il codice si trova nella card della sessione, accanto a “Invito”.
      </p>
    </div>
  );
}