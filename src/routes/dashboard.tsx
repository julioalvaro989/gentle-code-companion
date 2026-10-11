import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { adoptSupabaseSession, getFitnessOnboarding } from "../lib/supabase";
import { useServerFn } from "@tanstack/react-start";
import { getTestAdminAccess } from "../lib/test-admin.functions";
import { accessDestination, resolveVibraAccess } from "../lib/vibra-access";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Meu espaço — Avirafit" },
    { name: "description", content: "Acesso ao espaço de treinos, hábitos e progresso da Avirafit." },
    { property: "og:title", content: "Meu espaço — Avirafit" },
    { property: "og:description", content: "Seu espaço de treinos e evolução na Avirafit." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DashboardGate,
});

function DashboardGate() {
  const checkTestAdmin = useServerFn(getTestAdminAccess);
  useEffect(() => {
    let active = true;
    resolveVibraAccess(adoptSupabaseSession, checkTestAdmin)
      .then(async ({ session, testAdmin }) => {
        if (!active) return;
        if (session && !testAdmin) {
          const onboarding = await getFitnessOnboarding(session);
          if (onboarding?.status !== "completed") {
            window.location.replace("/onboarding");
            return;
          }
        }
        const destination = accessDestination("/dashboard", Boolean(session), testAdmin);
        if (destination) window.location.replace(destination);
      })
      .catch(() => { if (active) window.location.replace("/?auth=login"); });
    return () => { active = false; };
  }, [checkTestAdmin]);

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF" }}>Validando seu acesso...</main>;
}
