import { createFileRoute } from "@tanstack/react-router";
import { PlansPage } from "../components/PlansPage";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Planos — Vibra" }, { name: "description", content: "Compare os planos Basic e Premium da Vibra." }] }),
  component: PlansPage,
});
