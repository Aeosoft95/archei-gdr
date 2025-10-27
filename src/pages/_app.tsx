// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import "../styles/globals.css";
import { UserBar } from "../components/dashboard/UserBar";
import { useEffect } from "react";

// 👇 aggiunte per la scheda flottante
import { SheetPanelProvider, useSheetPanel } from "@/components/sheet/SheetPanelProvider";

const HIDE_USERBAR_PATHS = ["/", "/register"];
const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/session"];

// FAB “Scheda” flottante in basso a destra
function SheetFab() {
  const { status } = useSession();
  const router = useRouter();
  const { toggleSheet } = useSheetPanel();

  // mostra il FAB solo se autenticato e non in pagine nascoste / api
  const hide =
    status !== "authenticated" ||
    HIDE_USERBAR_PATHS.includes(router.pathname) ||
    router.pathname.startsWith("/api");

  if (hide) return null;

  return (
    <button
      onClick={toggleSheet}
      className="fixed bottom-6 right-6 z-[60] px-4 py-2 rounded-full bg-zinc-200 text-zinc-900 text-sm font-medium shadow-lg hover:bg-white transition"
      aria-label="Apri Scheda"
      type="button"
    >
      Scheda
    </button>
  );
}

function AuthedShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // blocca l'accesso alle pagine protette se non loggato
  useEffect(() => {
    const isProtected = PROTECTED_PREFIXES.some((p) => router.pathname.startsWith(p));
    if (isProtected && status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router.pathname, router]);

  const showUserBar =
    status === "authenticated" &&
    !HIDE_USERBAR_PATHS.includes(router.pathname) &&
    !router.pathname.startsWith("/api");

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {showUserBar && (
        <div className="px-6 pt-6 pb-2">
          <UserBar />
        </div>
      )}
      {/* Contenuto pagina */}
      <div className="px-6 pb-6">{children}</div>

      {/* FAB flottante per aprire la Scheda */}
      <SheetFab />
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      {/* Provider della scheda flottante a livello globale */}
      <SheetPanelProvider>
        <AuthedShell>
          <Component {...pageProps} />
        </AuthedShell>
      </SheetPanelProvider>
    </SessionProvider>
  );
}
