import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adoptSupabaseSession, getFitnessOnboarding, SupabaseRequestError } from "../lib/supabase";
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
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let active = true;
    resolveVibraAccess(adoptSupabaseSession, checkTestAdmin)
      .then(async ({ session, testAdmin }) => {
        if (!active) return;
        if (session && !testAdmin) {
          // A missing row means pending. A failed query must not be treated as completed.
          const onboarding = await getFitnessOnboarding(session);
          if (onboarding?.status !== "completed") {
            window.location.replace("/onboarding");
            return;
          }
        }
        const destination = accessDestination("/dashboard", Boolean(session), testAdmin);
        if (destination) window.location.replace(destination);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const requestError = error instanceof SupabaseRequestError ? error : null;
        console.error("[dashboard] Access validation failed", {
          status: requestError?.status ?? null,
          code: requestError?.code ?? null,
          message: requestError?.message ?? (error instanceof Error ? error.message : "Unknown error"),
        });
        setValidationError("Não foi possível validar seu onboarding. Tente novamente; o erro não foi interpretado como conclusão do perfil.");
      });
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

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF" }}>Validando seu acesso...</main>;
}
