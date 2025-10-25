import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<null | { type: "ok" | "err"; text: string }>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!email || !password) return setMsg({ type: "err", text: "Inserisci email e password." });
    if (password.length < 6) return setMsg({ type: "err", text: "Minimo 6 caratteri." });
    if (password !== confirm) return setMsg({ type: "err", text: "Le password non coincidono." });

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined })
      });
      const data = await res.json();
      if (!res.ok) return setMsg({ type: "err", text: data?.error || "Registrazione fallita." });

      const login = await signIn("credentials", { redirect: false, email, password });
      if (login?.ok) {
        setMsg({ type: "ok", text: "Registrazione completata! Accesso in corso..." });
        window.location.href = "/dashboard";
      } else {
        setMsg({ type: "ok", text: "Registrato! Ora effettua l’accesso." });
        window.location.href = "/";
      }
    } catch {
      setMsg({ type: "err", text: "Errore di rete. Riprova." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen text-white">
      <div className="absolute inset-0 -z-10">
        <Image src="/login-bg.jpg" alt="ARCHEI - Sfondo" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-cyan-400/80 ring-2 ring-white/30 shadow-md" />
          <h1 className="text-xl font-semibold tracking-wide">
            ARCHEI <span className="opacity-75">Companion</span>
          </h1>
        </div>
        <a href="/" className="text-sm px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur border border-white/15 transition">
          Hai già un account? Accedi
        </a>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-4 grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow">
            Crea il tuo <span className="text-cyan-300">profilo</span>
          </h2>
          <p className="text-white/80">Registra un account per accedere alla dashboard e sincronizzare le scene in tempo reale.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-2xl font-semibold mb-1">Registrazione</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 opacity-80">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="tuo@email.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-80">Nome (opzionale)</label>
              <input
                type="text"
                autoComplete="name"
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="Il tuo nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-80">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 pr-10"
                  placeholder="Minimo 6 caratteri"
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

            <div>
              <label className="block text-sm mb-1 opacity-80">Conferma password</label>
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                required
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="Ripeti la password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-400/90 disabled:opacity-60 disabled:cursor-not-allowed font-semibold transition"
            >
              {loading ? "Creazione account..." : "Crea account"}
            </button>
          </form>

          {msg && (
            <div
              className={`mt-4 text-sm rounded-lg px-3 py-2 ${
                msg.type === "ok" ? "bg-emerald-500/20 border border-emerald-400/40" : "bg-rose-500/20 border border-rose-400/40"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
