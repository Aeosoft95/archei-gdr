"use client";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [msgA, setMsgA] = useState<string | null>(null);
  const [msgP, setMsgP] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") window.location.href = "/";
  }, [status]);

  if (status !== "authenticated") return null;

  const avatarSrc = preview || session?.user?.image || "/default-avatar.png";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveAvatar() {
    if (!preview) return setMsgA("Scegli un'immagine da caricare.");
    setSavingAvatar(true);
    setMsgA(null);
    try {
      const res = await fetch("/api/user/update-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: preview })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore durante l'upload");
      setMsgA("Avatar aggiornato!");
      // forza refresh sessione immagine
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      setMsgA(e.message || "Errore durante l'upload");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function savePassword() {
    const current = currentRef.current?.value || "";
    const next = newRef.current?.value || "";
    const confirm = confirmRef.current?.value || "";
    setMsgP(null);

    if (!current || !next) return setMsgP("Compila tutti i campi.");
    if (next.length < 6) return setMsgP("La nuova password deve avere almeno 6 caratteri.");
    if (next !== confirm) return setMsgP("Le password non coincidono.");

    setSavingPwd(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore");
      setMsgP("Password aggiornata!");
      if (currentRef.current) currentRef.current.value = "";
      if (newRef.current) newRef.current.value = "";
      if (confirmRef.current) confirmRef.current.value = "";
    } catch (e: any) {
      setMsgP(e.message || "Errore");
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-6">
      <h1 className="text-2xl font-semibold mb-6">Impostazioni Utente</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pannello Avatar */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Avatar</h2>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border border-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="space-y-2">
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
              <button
                onClick={saveAvatar}
                disabled={savingAvatar}
                className="px-4 py-2 rounded-lg bg-cyan-500/90 hover:bg-cyan-400/90 disabled:opacity-60"
              >
                {savingAvatar ? "Salvataggio..." : "Salva Avatar"}
              </button>
              {msgA && <p className="text-sm text-white/80">{msgA}</p>}
            </div>
          </div>
        </div>

        {/* Pannello Password */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Modifica Password</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1 opacity-80">Password attuale</label>
              <input
                ref={currentRef}
                type="password"
                className="w-full px-3 py-2 rounded bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">Nuova password</label>
              <input
                ref={newRef}
                type="password"
                className="w-full px-3 py-2 rounded bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">Conferma nuova password</label>
              <input
                ref={confirmRef}
                type="password"
                className="w-full px-3 py-2 rounded bg-black/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
            <button
              onClick={savePassword}
              disabled={savingPwd}
              className="px-4 py-2 rounded-lg bg-cyan-500/90 hover:bg-cyan-400/90 disabled:opacity-60"
            >
              {savingPwd ? "Aggiornamento..." : "Aggiorna Password"}
            </button>
            {msgP && <p className="text-sm text-white/80">{msgP}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
