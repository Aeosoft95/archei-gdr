"use client";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateSessionPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status]);

  if (status !== "authenticated") return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCode(null);

    const name = nameRef.current?.value.trim() || "";
    const maxPlayers = Number(maxRef.current?.value || 0);
    const description = descRef.current?.value || "";

    if (!name) return setMsg("Inserisci un nome sessione.");
    if (!maxPlayers || maxPlayers < 1 || maxPlayers > 99) {
      return setMsg("Player massimi deve essere tra 1 e 99.");
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, maxPlayers, description })
      });

      const raw = await resp.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        // Non è JSON → mostra l’inizio della pagina HTML restituita
        throw new Error(`API ha risposto con HTML (status ${resp.status}).\n${raw.slice(0,200)}`);
      }

      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || `Errore API (status ${resp.status})`);
      }

      setCode(data.session.code);
      setMsg("Sessione creata! Condividi il codice per far entrare i giocatori.");
      // router.push(`/session/${data.session.id}`) // quando pronta la pagina
    } catch (e: any) {
      setMsg(e.message || "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white">
      <div className="px-6">
        <div className="max-w-2xl mx-auto bg-white/10 border border-white/20 rounded-xl p-5 mt-2">
          <h1 className="text-2xl font-semibold mb-4">Crea Sessione</h1>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 opacity-80">Nome sessione</label>
              <input
                ref={nameRef}
                type="text"
                required
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="Es. Campagna ARCHEI"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-80">Player massimi</label>
              <input
                ref={maxRef}
                type="number"
                min={1}
                max={99}
                required
                defaultValue={5}
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-80">Descrizione (opzionale)</label>
              <textarea
                ref={descRef}
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="Breve descrizione della tua sessione…"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-cyan-500/90 hover:bg-cyan-400/90 disabled:opacity-60"
            >
              {loading ? "Creazione..." : "Crea Sessione"}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm whitespace-pre-wrap">{msg}</p>}

          {code && (
            <div className="mt-4 p-3 bg-black/30 border border-white/20 rounded-lg">
              <div className="text-sm text-white/70">Codice invito</div>
              <div className="text-2xl font-mono tracking-widest mt-1">{code}</div>
              <div className="mt-3 flex gap-2">
                <button
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-sm"
                  onClick={() => navigator.clipboard.writeText(code)}
                >
                  Copia codice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
