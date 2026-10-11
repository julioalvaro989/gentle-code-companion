import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { adoptSupabaseSession } from "../lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vibra" }] }),
  component: DashboardGate,
});

function DashboardGate() {
  useEffect(() => {
    let active = true;
    adoptSupabaseSession()
      .then((session) => {
        if (!active) return;
        // No trusted subscription-entitlement endpoint/schema exists yet.
        // Fail closed: authenticated users must complete the plans/access step.
        window.location.replace(session ? "/plans" : "/?auth=login");
      })
      .catch(() => { if (active) window.location.replace("/?auth=login"); });
    return () => { active = false; };
  }, []);

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05060B", color: "#F8F9FF" }}>Validando seu acesso...</main>;
}
