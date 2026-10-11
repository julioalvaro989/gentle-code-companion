import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "../components/CheckoutPage";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Confirmar pagamento — Vibra" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CheckoutPage,
});
