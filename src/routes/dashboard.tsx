import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { adoptSupabaseSession, getVibraAccess } from "../lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vibra" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DashboardGate,
});

function DashboardGate() {
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
        if (active) window.location.replace("/checkout");
      }
    })();
    return () => { active = false; };
  }, []);

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF" }}>Validando pagamento, perfil e acesso…</main>;
}
