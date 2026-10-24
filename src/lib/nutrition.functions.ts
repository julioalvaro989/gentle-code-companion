import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type PlannedFood = { name: string; quantity: string; calories: number; protein_g: number; carbs_g: number; fat_g: number };
export type PlannedMeal = { meal_type: string; title: string; foods: PlannedFood[]; calories: number; estimated_cost_brl: number };
export type MealPlan = { id: string; plan_date: string; meals: PlannedMeal[]; total_calories: number | null };
export type FoodEstimate = { food_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
type RawFood = Partial<Record<"name" | "quantity" | "calories" | "protein_g" | "carbs_g" | "fat_g", unknown>>;
type RawMeal = Partial<Record<"meal_type" | "title" | "foods" | "estimated_cost_brl", unknown>>;

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuração do servidor indisponível.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authed(token: string) {
  if (typeof token !== "string" || token.length < 20) throw new Error("Sessão inválida. Entre novamente.");
  const supabase = userClient(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão inválida. Entre novamente.");
  return { supabase, userId: data.user.id };
}

async function callAI(messages: { role: string; content: string }[], tool: object) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Serviço de IA indisponível.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: (tool as { name: string }).name } },
    }),
  });
  if (res.status === 429) throw new Error("Muitas solicitações agora. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados no momento.");
  if (!res.ok) throw new Error("Não foi possível gerar agora. Tente novamente.");
  const json = await res.json();
  const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Resposta da IA incompleta. Tente novamente.");
  return JSON.parse(args);
}

const num = (v: unknown, max = 10000) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0; };
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const foodSchema = {
  type: "object",
  properties: {
    name: { type: "string" }, quantity: { type: "string" },
    calories: { type: "number" }, protein_g: { type: "number" }, carbs_g: { type: "number" }, fat_g: { type: "number" },
  },
  required: ["name", "quantity", "calories", "protein_g", "carbs_g", "fat_g"],
};

export const getOrGenerateMealPlan = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; date: string; regenerate?: boolean }) => {
    if (!d || !DATE_RE.test(d.date)) throw new Error("Data inválida.");
    return { token: String(d.token), date: d.date, regenerate: d.regenerate === true };
  })
  .handler(async ({ data }): Promise<MealPlan> => {
    const { supabase, userId } = await authed(data.token);
    if (!data.regenerate) {
      const { data: existing } = await supabase.from("meal_plans").select("id,plan_date,meals,total_calories").eq("user_id", userId).eq("plan_date", data.date).maybeSingle();
      if (existing) return existing as unknown as MealPlan;
    } else {
      await supabase.from("meal_plans").delete().eq("user_id", userId).eq("plan_date", data.date);
    }

    const [{ data: profile }, { data: onboarding }, { data: recent }] = await Promise.all([
      supabase.from("fitness_profiles").select("birth_date,weight_kg,height_cm,primary_goal,goal,experience_level,weekly_frequency,preferences,physical_limitations").eq("id", userId).maybeSingle(),
      supabase.from("fitness_onboarding_profiles").select("answers").eq("user_id", userId).maybeSingle(),
      supabase.from("meal_plans").select("meals").eq("user_id", userId).lt("plan_date", data.date).order("plan_date", { ascending: false }).limit(5),
    ]);
    const a = (onboarding?.answers ?? {}) as Record<string, unknown>;
    const pick = (k: string) => a[k] ?? null;
    const recentTitles = (recent ?? []).flatMap(r => ((r.meals as unknown as PlannedMeal[]) ?? []).map(m => m.title)).slice(0, 30);

    const context = {
      perfil: profile ?? {},
      orcamento_mensal_alimentacao_brl: pick("foodBudget"),
      alimentos_preferidos: pick("preferredFoods"),
      alimentos_que_nao_gosta: pick("dislikedFoods"),
      restricoes: pick("dietaryRestrictions"),
      alergias: pick("allergies") ?? pick("foodAllergies"),
      refeicoes_por_dia: pick("mealsPerDay"),
      outras_respostas: a,
    };

    const result = await callAI([
      { role: "system", content: "Você é um planejador alimentar para um app fitness brasileiro. Gere um cardápio de um dia com alimentos comuns e acessíveis no Brasil, em português. Respeite RIGOROSAMENTE alergias e restrições (nunca inclua), evite alimentos que a pessoa não gosta, priorize os que ela gosta, e mantenha o custo diário dentro do orçamento mensal dividido por 30 quando informado. Ajuste calorias ao objetivo e aos dados corporais quando disponíveis; caso faltem, use porções moderadas. Calorias e macros devem ser estimativas realistas por porção (tabela TACO). Não repita os pratos recentes listados. Não faça promessas médicas." },
      { role: "user", content: `Data: ${data.date}\nDados do usuário: ${JSON.stringify(context)}\nPratos recentes a NÃO repetir: ${JSON.stringify(recentTitles)}` },
    ], {
      name: "meal_plan",
      description: "Cardápio do dia",
      parameters: {
        type: "object",
        properties: {
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                meal_type: { type: "string", enum: ["cafe_da_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"] },
                title: { type: "string" },
                foods: { type: "array", items: foodSchema },
                estimated_cost_brl: { type: "number" },
              },
              required: ["meal_type", "title", "foods", "estimated_cost_brl"],
            },
          },
        },
        required: ["meals"],
      },
    });

    const meals: PlannedMeal[] = (Array.isArray(result?.meals) ? result.meals : []).slice(0, 6).map((m: RawMeal) => {
      const foods: PlannedFood[] = (Array.isArray(m.foods) ? (m.foods as RawFood[]) : []).slice(0, 10).map((f: RawFood) => ({
        name: str(f.name, 120), quantity: str(f.quantity, 60), calories: num(f.calories, 3000),
        protein_g: num(f.protein_g, 500), carbs_g: num(f.carbs_g, 500), fat_g: num(f.fat_g, 500),
      }));
      return { meal_type: str(m.meal_type, 30), title: str(m.title, 120), foods, calories: foods.reduce((s, f) => s + f.calories, 0), estimated_cost_brl: Math.max(0, Number(m.estimated_cost_brl) || 0) };
    });
    if (!meals.length) throw new Error("Não foi possível gerar o cardápio. Tente novamente.");
    const total = meals.reduce((s, m) => s + m.calories, 0);

    const { data: saved, error } = await supabase.from("meal_plans")
      .upsert({ user_id: userId, plan_date: data.date, meals: meals as never, total_calories: total }, { onConflict: "user_id,plan_date", ignoreDuplicates: true })
      .select("id,plan_date,meals,total_calories").maybeSingle();
    if (error) throw new Error("Não foi possível salvar o cardápio.");
    if (saved) return saved as unknown as MealPlan;
    const { data: again } = await supabase.from("meal_plans").select("id,plan_date,meals,total_calories").eq("user_id", userId).eq("plan_date", data.date).single();
    return again as unknown as MealPlan;
  });

export const estimateFoodCalories = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; food: string; quantity: string }) => {
    const food = str(d?.food, 200);
    if (!food) throw new Error("Informe o alimento.");
    return { token: String(d.token), food, quantity: str(d?.quantity, 100) };
  })
  .handler(async ({ data }): Promise<FoodEstimate> => {
    await authed(data.token);
    const r = await callAI([
      { role: "system", content: "Estime calorias e macronutrientes de um alimento consumido no Brasil com base na tabela TACO ou referências reconhecidas. Se a quantidade não for informada, use uma porção média comum e diga a porção no nome." },
      { role: "user", content: `Alimento: ${data.food}\nQuantidade: ${data.quantity || "não informada"}` },
    ], {
      name: "food_estimate",
      description: "Estimativa nutricional",
      parameters: {
        type: "object",
        properties: { food_name: { type: "string" }, calories: { type: "number" }, protein_g: { type: "number" }, carbs_g: { type: "number" }, fat_g: { type: "number" } },
        required: ["food_name", "calories", "protein_g", "carbs_g", "fat_g"],
      },
    });
    return { food_name: str(r.food_name, 200) || data.food, calories: num(r.calories), protein_g: num(r.protein_g, 1000), carbs_g: num(r.carbs_g, 1000), fat_g: num(r.fat_g, 1000) };
  });
