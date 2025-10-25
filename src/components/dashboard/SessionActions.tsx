// src/components/dashboard/SessionActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/router"; // ⬅️ Pages Router
import { Button } from "../ui/button";

type Props = {
  onCreated?: (path: string) => void;
};

export function SessionActions({ onCreated }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!title.trim()) {
      setError("Inserisci un titolo per la sessione");
      return;
    }
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Errore ${res.status}`);

      const path: string = data.path || `/table/${data.inviteCode}`;
      // callback esterna (se passata)
      onCreated?.(path);

      // redirect principale
      if (path) {
        // primo tentativo: router.push (Pages Router)
        try {
          await router.push(path);
        } catch {
          // fallback hard se qualcosa blocca
          window.location.assign(path);
        }
      }
    } catch (err: any) {
      console.error("Create session failed:", err);
      setError(err.message || "Errore sconosciuto");
    } finally {
      setCreating(false);
      setTitle("");
    }
  }

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex gap-4">
        <input
          className="bg-zinc-800 text-white px-3 py-2 rounded-md border border-zinc-700 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Titolo sessione..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={creating}
        />

        <Button variant="primary" onClick={handleCreate} disabled={creating}>
          ➕ {creating ? "Creazione..." : "Crea Sessione"}
        </Button>

        <Button
          variant="secondary"
          onClick={() => router.push("/sessions/join")}
        >
          🔗 Unisciti
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}