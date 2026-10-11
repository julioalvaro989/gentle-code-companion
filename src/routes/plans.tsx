import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adoptSupabaseSession, getFitnessOnboarding, SupabaseRequestError, type AuthSession } from "../lib/supabase";
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
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let active = true;
    resolveVibraAccess(adoptSupabaseSession, checkTestAdmin)
      .then(async ({ session: current, testAdmin }) => {
        if (!active) return;
        const destination = accessDestination("/plans", Boolean(current), testAdmin);
        if (destination) {
          window.location.replace(destination);
          return;
        }
        if (!current) {
          window.location.replace("/?auth=login&next=%2Fplans");
          return;
        }
        if (!testAdmin) {
          // A missing row means pending. A failed query is an error, never proof of completion.
          const onboarding = await getFitnessOnboarding(current);
          if (onboarding?.status !== "completed") {
            window.location.replace("/onboarding");
            return;
          }
        }
        setSession(current);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const requestError = error instanceof SupabaseRequestError ? error : null;
        console.error("[plans] Access validation failed", {
          status: requestError?.status ?? null,
          code: requestError?.code ?? null,
          message: requestError?.message ?? (error instanceof Error ? error.message : "Unknown error"),
        });
        setValidationError("Não foi possível validar seu onboarding no momento. Nenhuma etapa foi marcada como concluída. Tente novamente.");
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [checkTestAdmin]);

  if (validationError) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF", padding: 24 }}>
      <section style={{ maxWidth: 520, textAlign: "center" }}>
        <h1>Não foi possível validar seu perfil</h1>
        <p>{validationError}</p>
        <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 12, padding: "12px 18px", borderRadius: 10, cursor: "pointer" }}>Tentar novamente</button>
      </section>
    </main>;
  }

  if (!ready || !session) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF" }}>Validando sua sessão...</main>;
  }

  return <PlansPage />;
}
