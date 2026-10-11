export const VIBRA_PLANS = {
  basic: {
    id: "basic",
    name: "Basic",
    priceCents: 2990,
    priceLabel: "R$ 29,90",
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceCents: 4990,
    priceLabel: "R$ 49,90",
  },
} as const;

export type VibraPlanId = keyof typeof VIBRA_PLANS;

export const VIBRA_SELECTED_PLAN_KEY = "vibra:selected-plan";

export function isVibraPlanId(value: unknown): value is VibraPlanId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(VIBRA_PLANS, value);
}
