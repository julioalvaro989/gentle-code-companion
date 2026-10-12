import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "../components/LegalDocument";
export const Route = createFileRoute("/politica-de-privacidade")({ head: () => ({ meta: [{ title: "Política de Privacidade — Vibra" }, { name: "robots", content: "index, follow" }] }), component: () => <LegalDocument kind="privacy" /> });
