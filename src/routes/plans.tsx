import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adoptSupabaseSession, type AuthSession } from "../lib/supabase";
import { PlansPage } from "../components/PlansPage";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Planos — Vibra" }, { name: "description", content: "Conheça as opções de acesso da Vibra." }] }),
  component: PlansRoute,
});

function PlansRoute() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    adoptSupabaseSession()
      .then((current) => {
        if (!active) return;
        if (!current) {
          window.location.replace("/?auth=login");
          return;
        }
        setSession(current);
      })
      .catch(() => {
        if (active) window.location.replace("/?auth=login");
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  if (!ready || !session) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF" }}>Validando sua sessão...</main>;
  }

  return <PlansPage />;
}
