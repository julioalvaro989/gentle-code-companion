import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { adoptSupabaseSession, getVibraAccess } from "../lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vibra" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DashboardGate,
});

function DashboardGate() {
  const [authorizationUnavailable, setAuthorizationUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await adoptSupabaseSession();
        if (!active) return;
        if (!session) { window.location.replace("/?auth=login"); return; }
        const access = await getVibraAccess(session);
        if (!active) return;
        if (access.status !== "active") {
          window.location.replace(access.status === "pending" || access.planId ? "/checkout" : "/plans");
          return;
        }
        window.location.replace(access.profileCompleted ? "/" : "/fitness-profile");
      } catch {
        // A failed permission lookup is indeterminate, not a payment denial.
        // Do not send authenticated users to checkout/plans based on a service error.
        if (active) setAuthorizationUnavailable(true);
      }
    })();
    return () => { active = false; };
  }, []);

  return <main role={authorizationUnavailable ? "alert" : undefined} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#05060B", color: "#F8F9FF" }}>{authorizationUnavailable ? <section style={{ maxWidth: 480, textAlign: "center" }}><h1>Não foi possível validar o acesso</h1><p>O serviço de autorização está temporariamente indisponível. Nenhum redirecionamento de pagamento foi realizado.</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section> : "Validando autenticação, permissões e perfil…"}</main>;
}
