"use client";
import { useSession, signOut } from "next-auth/react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { FaCog, FaSignOutAlt, FaArrowLeft } from "react-icons/fa";

export function UserBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  const avatarSrc = (user as any)?.image || "/default-avatar.png";

  return (
    <div className="flex items-center justify-between mb-6">
      {/* SEZIONE SINISTRA */}
      <div className="flex items-center gap-3">
        <img
          src={avatarSrc}
          alt="Avatar"
          className="h-10 w-10 rounded-full border border-white/20 object-cover"
        />
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-lg">{user?.name || user?.email}</span>
          <span className="text-xs text-white/60">Utente connesso</span>
        </div>
      </div>

      {/* SEZIONE DESTRA - Pulsanti */}
      <div className="flex items-center gap-3">
        {/* BACK */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm"
        >
          <FaArrowLeft className="text-white/70" /> Indietro
        </Button>

        {/* SETTINGS */}
        <Button
          variant="ghost"
          onClick={() => router.push("/settings")}
          className="flex items-center gap-2 text-sm"
        >
          <FaCog className="text-white/70" /> Impostazioni
        </Button>

        {/* LOGOUT */}
        <Button
          variant="secondary"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 text-sm"
        >
          <FaSignOutAlt className="text-white/80" /> Logout
        </Button>
      </div>
    </div>
  );
}
