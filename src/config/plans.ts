/**
 * Runtime plan catalog.
 *
 * Public catalog data only: never put secrets, payment credentials, or entitlement
 * decisions here. The JSON asset is loaded at runtime so a host that supports
 * replacing public assets can update catalog copy/prices without rebuilding the
 * application bundle.
 *
 * Checkout must later resolve the selected plan on a trusted server and use the
 * gateway's authoritative price/price ID. Never trust the amount sent by a browser.
 */
export type PlanInterval = "month" | "year" | "one_time";
export type PlanPublicationStatus = "draft" | "published";

export interface PublicPlan {
  id: string;
  name: string;
  description: string;
  priceAmountCents: number | null;
  currency: string;
  interval: PlanInterval | null;
  benefits: string[];
  status: PlanPublicationStatus;
}

export interface PublicPlansConfig {
  version: 1;
  plans: PublicPlan[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parsePlan(value: unknown): PublicPlan | null {
  if (!isRecord(value)) return null;
  const { id, name, description, priceAmountCents, currency, interval, benefits, status } = value;
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) return null;
  if (typeof name !== "string" || !name.trim()) return null;
  if (typeof description !== "string") return null;
  if (priceAmountCents !== null && (!Number.isSafeInteger(priceAmountCents) || (priceAmountCents as number) < 0)) return null;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return null;
  if (interval !== null && interval !== "month" && interval !== "year" && interval !== "one_time") return null;
  if (!Array.isArray(benefits) || !benefits.every((item) => typeof item === "string")) return null;
  if (status !== "draft" && status !== "published") return null;

  // A plan cannot be publicly displayed as priced unless both price and period are explicit.
  if (status === "published" && (priceAmountCents === null || interval === null)) return null;

  return {
    id,
    name,
    description,
    priceAmountCents: priceAmountCents as number | null,
    currency,
    interval: interval as PlanInterval | null,
    benefits: benefits as string[],
    status,
  };
}

export async function loadPublicPlansConfig(): Promise<PublicPlansConfig> {
  const response = await fetch("/plans-config.json", { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar a configuração de planos.");
  const raw: unknown = await response.json();
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.plans)) {
    throw new Error("A configuração de planos está em formato inválido.");
  }
  const plans = raw.plans.map(parsePlan);
  if (plans.some((plan) => plan === null)) throw new Error("A configuração contém um plano inválido.");
  const validPlans = plans as PublicPlan[];
  if (new Set(validPlans.map((plan) => plan.id)).size !== validPlans.length) {
    throw new Error("A configuração contém identificadores de plano duplicados.");
  }
  return { version: 1, plans: validPlans };
}

export function formatPlanPrice(plan: PublicPlan, locale = "pt-BR"): string {
  if (plan.priceAmountCents === null) return "Preço a definir";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: plan.currency,
    minimumFractionDigits: 2,
  }).format(plan.priceAmountCents / 100);
}

export function formatPlanInterval(interval: PlanInterval | null): string {
  if (interval === "month") return "por mês";
  if (interval === "year") return "por ano";
  if (interval === "one_time") return "pagamento único";
  return "Periodicidade a definir";
}
