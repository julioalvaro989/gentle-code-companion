import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "../components/LegalDocument";
export const Route = createFileRoute("/termos-de-uso")({ head: () => ({ meta: [{ title: "Termos de Uso — Vibra" }, { name: "robots", content: "index, follow" }] }), component: () => <LegalDocument kind="terms" /> });
