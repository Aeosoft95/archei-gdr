"use client";
import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { SessionActions } from "../components/dashboard/SessionActions";
import ActiveSessionsPanel from "../components/dashboard/ActiveSessionsPanel";

export default function Dashboard() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") signIn(); // redirect al login
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 pt-2">
      {/* UserBar ora arriva da _app.tsx */}
      <SessionActions />
      <ActiveSessionsPanel />
    </div>
  );
}
