import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "./legal";
export const Route = createFileRoute("/politica-de-assinatura")({ head: () => ({ meta: [{ title: "Política de Assinatura — Vibra" }, { name: "robots", content: "index, follow" }] }), component: () => <LegalDocument kind="subscription" /> });
