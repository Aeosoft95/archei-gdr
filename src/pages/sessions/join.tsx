"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function JoinSessionPage() {
  const { status } = useSession();
  useEffect(() => { if (status === "unauthenticated") window.location.href = "/"; }, [status]);
  if (status !== "authenticated") return null;

  return (
    <main className="min-h-screen bg-zinc-900 text-white">
      <div className="px-6">
        <div className="max-w-xl mx-auto bg-white/10 border border-white/20 rounded-xl p-5 mt-2">
          <h1 className="text-2xl font-semibold mb-4">Unisciti a Sessione</h1>
          <p className="text-white/80 text-sm">
            A breve qui potrai inserire il <strong>codice sessione</strong> per entrare.
          </p>
        </div>
      </div>
    </main>
  );
}
