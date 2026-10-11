import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adoptSupabaseSession, getFitnessOnboarding, type AuthSession } from "../lib/supabase";
import { PlansPage } from "../components/PlansPage";
import { useServerFn } from "@tanstack/react-start";
import { getTestAdminAccess } from "../lib/test-admin.functions";
import { accessDestination, resolveVibraAccess } from "../lib/vibra-access";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [
    { title: "Planos — Avirafit" },
    { name: "description", content: "Conheça as opções de acesso da Avirafit." },
    { property: "og:title", content: "Planos — Avirafit" },
    { property: "og:description", content: "Conheça as opções de acesso e recursos da Avirafit." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PlansRoute,
});

function PlansRoute() {
  const checkTestAdmin = useServerFn(getTestAdminAccess);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    resolveVibraAccess(adoptSupabaseSession, checkTestAdmin)
      .then(({ session: current, testAdmin }) => {
        if (!active) return;
        const destination = accessDestination("/plans", Boolean(current), testAdmin);
        if (destination) {
          window.location.replace(destination);
          return;
        }
        if (!testAdmin) {
          const onboarding = await getFitnessOnboarding(current);
          if (onboarding?.status !== "completed") {
            window.location.replace("/onboarding");
            return;
          }
        }
        setSession(current);
      })
      .catch(() => {
        if (active) window.location.replace("/?auth=login");
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [checkTestAdmin]);

  if (!ready || !session) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF" }}>Validando sua sessão...</main>;
  }

  return <PlansPage />;
}
