// src/pages/dashboard.tsx
"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionActions } from "../components/dashboard/SessionActions";
import ActiveSessionsPanel from "../components/dashboard/ActiveSessionsPanel";

export default function Dashboard() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") signIn(); // redirect al login
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 pt-2">
      {/* La barra utente arriva da _app.tsx */}
      <SessionActions onCreated={(path) => router.push(path)} /> {/* 👈 redirect automatico */}
      <ActiveSessionsPanel />
    </div>
  );
}