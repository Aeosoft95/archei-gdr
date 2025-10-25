"use client";
import { Button } from "../ui/button";   // <-- percorso corretto (cartella ui è a ../ui)
import { useRouter } from "next/navigation";

export function SessionActions() {
  const router = useRouter();
  return (
    <div className="flex gap-4 mb-6">
      <Button variant="primary" onClick={() => router.push("/sessions/create")}>
        ➕ Crea Sessione
      </Button>
      <Button variant="secondary" onClick={() => router.push("/sessions/join")}>
        🔗 Unisciti a Sessione
      </Button>
    </div>
  );
}
