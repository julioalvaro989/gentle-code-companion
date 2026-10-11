import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adoptSupabaseSession, getVibraAccess } from "../lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vibra" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DashboardGate,
});

function DashboardGate() {
  const [authorizationUnavailable, setAuthorizationUnavailable] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await adoptSupabaseSession();
        if (!active) return;
        if (!session) { window.location.replace("/?auth=login"); return; }
        const access = await getVibraAccess(session);
        if (!active) return;
        if (access.adminSessionLimit) {
          setAuthorizationUnavailable(true);
          return;
        }
        if (access.status !== "active") {
          window.location.replace(access.status === "pending" || access.planId ? "/checkout" : "/plans");
          return;
        }
        window.location.replace(access.profileCompleted ? "/" : "/fitness-profile");
      } catch (error) {
        console.error("[Vibra dashboard gate] authorization failed", {
          errorName: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
          stage: "dashboardAuthorization",
          timestamp: new Date().toISOString(),
        });
        // A failed permission lookup is indeterminate, not a payment denial.
        if (active) setAuthorizationUnavailable(true);
      }
    })().finally(() => {
      if (active) setRetrying(false);
    });
    return () => { active = false; };
  }, [retryVersion]);

  return <main role={authorizationUnavailable ? "alert" : undefined} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#05060B", color: "#F8F9FF" }}>{authorizationUnavailable ? <section style={{ maxWidth: 480, textAlign: "center" }}><h1>Não foi possível validar o acesso</h1><p>Não foi possível confirmar as permissões. Nenhum acesso pago foi liberado. Tente uma nova validação; se o problema persistir, verifique os logs do navegador e do Supabase.</p><button type="button" disabled={retrying} onClick={() => { setRetrying(true); setAuthorizationUnavailable(false); setRetryVersion(v => v + 1); }}>{retrying ? "Validando acesso…" : "Tentar novamente"}</button></section> : "Validando autenticação, permissões e perfil…"}</main>;
}
