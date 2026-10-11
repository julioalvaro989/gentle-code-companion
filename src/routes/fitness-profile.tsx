import { createFileRoute } from "@tanstack/react-router";
import { FitnessProfilePage } from "../components/FitnessProfilePage";

export const Route = createFileRoute("/fitness-profile")({
  head: () => ({ meta: [{ title: "Perfil fitness — Vibra" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: FitnessProfilePage,
});
