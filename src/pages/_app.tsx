import type { AppProps } from "next/app";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import "../styles/globals.css";
import { UserBar } from "../components/dashboard/UserBar";
import { useEffect } from "react";

const HIDE_USERBAR_PATHS = ["/", "/register"];
const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/session"];

function AuthedShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // blocca l'accesso alle pagine protette se non loggato
  useEffect(() => {
    const isProtected = PROTECTED_PREFIXES.some((p) => router.pathname.startsWith(p));
    if (isProtected && status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router.pathname]);

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
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <AuthedShell>
        <Component {...pageProps} />
      </AuthedShell>
    </SessionProvider>
  );
}
