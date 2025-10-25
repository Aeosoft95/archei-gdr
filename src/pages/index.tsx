"use client";
import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function HomeLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<null | { type: "ok" | "err"; text: string }>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!email || !password) {
      setMsg({ type: "err", text: "Inserisci email e password." });
      return;
    }

    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);

    if (res?.ok) {
      setMsg({ type: "ok", text: "Accesso effettuato. Reindirizzo..." });
      window.location.href = "/dashboard";
    } else {
      setMsg({ type: "err", text: "Credenziali non valide." });
    }
  }

  return (
    <main className="relative min-h-screen text-white">
      {/* SFONDO */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/login-bg.jpg"
          alt="ARCHEI - Sfondo"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* HEADER */}
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-cyan-400/80 ring-2 ring-white/30 shadow-md" />
          <h1 className="text-xl font-semibold tracking-wide">
            ARCHEI <span className="opacity-75">Companion</span>
          </h1>
        </div>
        <a
          href="/register"
          className="text-sm px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur border border-white/15 transition"
        >
          Crea un account
        </a>
      </header>

      {/* HERO + CARD LOGIN */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-4 grid md:grid-cols-2 gap-8 items-center">
        {/* Testo */}
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow">
            Entra nella <span className="text-cyan-300">Cittadella Radiosa</span>
          </h2>
          <p className="text-white/80 max-w-xl">
            Accedi per sincronizzare scene e giocatori in tempo reale.
          </p>
          <ul className="text-white/75 text-sm space-y-1">
            <li>• Realtime WebSocket (porta 8787)</li>
            <li>• Cloudflare Tunnel online</li>
            <li>• Login con NextAuth + Mongo</li>
          </ul>
        </div>

        {/* Card Login */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-2xl font-semibold mb-1">Accedi</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 opacity-80">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="tuo@email.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-80">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white/90 text-xs"
                >
                  {showPwd ? "Nascondi" : "Mostra"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-400/90 disabled:opacity-60 disabled:cursor-not-allowed font-semibold transition"
            >
              {loading ? "Accesso in corso..." : "Entra"}
            </button>
          </form>

          {msg && (
            <div
              className={`mt-4 text-sm rounded-lg px-3 py-2 ${
                msg.type === "ok"
                  ? "bg-emerald-500/20 border border-emerald-400/40"
                  : "bg-rose-500/20 border border-rose-400/40"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between text-xs text-white/70">
            <a href="#" className="hover:text-white/90">Password dimenticata?</a>
            <a href="/register" className="hover:text-white/90">Crea un account</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 pb-6 text-xs text-white/60">
        © {new Date().getFullYear()} ARCHEI — Companion
      </footer>
    </main>
  );
}
