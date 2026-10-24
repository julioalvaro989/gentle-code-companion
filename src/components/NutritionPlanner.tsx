import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Loader2, Plus, RefreshCw, Sparkles, Trash2, Utensils, Wallet } from "lucide-react";
import { createFoodLog, deleteFoodLog, listFoodLogs, type AuthSession, type FoodLog } from "../lib/supabase";
import { estimateFoodCalories, getOrGenerateMealPlan, type MealPlan, type PlannedFood } from "../lib/nutrition.functions";
import { formatLocalDateInput, useLocalToday } from "../lib/date-utils";

const mealLabels: Record<string, string> = {
  cafe_da_manha: "Café da manhã", lanche_manha: "Lanche da manhã", almoco: "Almoço",
  lanche_tarde: "Lanche da tarde", jantar: "Jantar", ceia: "Ceia", lanche: "Lanche",
};

async function freshToken() {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
  return data.session.access_token;
}

const panel = { background: "#0B0C16", border: "1px solid #29233F", borderRadius: 18, padding: 20 } as const;
const btn = { border: "1px solid #39304F", borderRadius: 12, background: "#141225", color: "#F8F9FF", padding: "10px 14px", cursor: "pointer", fontWeight: 650 } as const;
const primary = { ...btn, background: "#B7FF35", color: "#10120A", borderColor: "#B7FF35" } as const;
const input = { width: "100%", boxSizing: "border-box", background: "#05060B", color: "#F8F9FF", border: "1px solid #39304F", borderRadius: 10, padding: 11 } as const;
const muted = { color: "#A8B4D8", fontSize: 13 } as const;

export function NutritionPlanner({ session }: { session: AuthSession }) {
  const today = formatLocalDateInput(useLocalToday());
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState("");
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [food, setFood] = useState("");
  const [quantity, setQuantity] = useState("");
  const [mealType, setMealType] = useState("almoco");
  const [saving, setSaving] = useState(false);
  const [logError, setLogError] = useState("");

  const loadPlan = useCallback(async (regenerate = false) => {
    setPlanLoading(true); setPlanError("");
    try { setPlan(await getOrGenerateMealPlan({ data: { token: await freshToken(), date: today, regenerate } })); }
    catch (e) { setPlanError(e instanceof Error ? e.message : "Não foi possível gerar o cardápio."); }
    finally { setPlanLoading(false); }
  }, [today]);

  const loadLogs = useCallback(async () => {
    try { setLogs(await listFoodLogs(session, today)); } catch (e) { setLogError(e instanceof Error ? e.message : "Erro ao carregar registros."); }
  }, [session, today]);

  useEffect(() => { void loadPlan(); void loadLogs(); }, [loadPlan, loadLogs]);

  const consumed = useMemo(() => logs.reduce((s, l) => s + l.calories, 0), [logs]);
  const macros = useMemo(() => logs.reduce((s, l) => ({ p: s.p + Number(l.protein_g), c: s.c + Number(l.carbs_g), f: s.f + Number(l.fat_g) }), { p: 0, c: 0, f: 0 }), [logs]);
  const target = plan?.total_calories ?? null;

  const save = async (entry: Omit<FoodLog, "id" | "created_at">) => {
    await createFoodLog(session, entry);
    await loadLogs();
  };

  const addCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!food.trim()) return;
    setSaving(true); setLogError("");
    try {
      const est = await estimateFoodCalories({ data: { token: await freshToken(), food, quantity } });
      await save({ local_date: today, meal_type: mealType, food_name: est.food_name, quantity: quantity.trim(), calories: est.calories, protein_g: est.protein_g, carbs_g: est.carbs_g, fat_g: est.fat_g });
      setFood(""); setQuantity("");
    } catch (err) { setLogError(err instanceof Error ? err.message : "Não foi possível registrar."); }
    finally { setSaving(false); }
  };

  const addPlanned = async (meal: string, f: PlannedFood) => {
    setSaving(true); setLogError("");
    try { await save({ local_date: today, meal_type: meal, food_name: f.name, quantity: f.quantity, calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g }); }
    catch (err) { setLogError(err instanceof Error ? err.message : "Não foi possível registrar."); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    setSaving(true);
    try { await deleteFoodLog(session, id); await loadLogs(); } catch (err) { setLogError(err instanceof Error ? err.message : "Erro ao excluir."); }
    finally { setSaving(false); }
  };

  const dayCost = plan?.meals.reduce((s, m) => s + m.estimated_cost_brl, 0) ?? 0;

  return <section className="fit-page-section" aria-labelledby="nutrition-title" style={{ paddingBottom: 0 }}>
    <div className="section-kicker"><span /> ALIMENTAÇÃO</div>
    <h1 id="nutrition-title">Cardápio <span>do dia.</span></h1>
    <p className="fit-page-intro">Um cardápio novo a cada dia, montado com base no que você informou no cadastro: alimentos que gosta, que evita, restrições e orçamento. Calorias são estimativas e não substituem orientação de nutricionista.</p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 12, marginTop: 20 }}>
      <div style={panel}><div style={muted}><Flame size={14} style={{ verticalAlign: "middle" }} /> CONSUMIDO HOJE</div><div style={{ fontSize: 28, fontWeight: 800, color: "#F8F9FF" }}>{consumed} <small style={{ fontSize: 14, color: "#A8B4D8" }}>kcal</small></div>{target ? <div style={{ height: 8, background: "#29233F", borderRadius: 99, overflow: "hidden", marginTop: 8 }}><div style={{ width: Math.min(100, consumed / target * 100) + "%", height: "100%", background: "linear-gradient(90deg,#7900FF,#B7FF35)" }} /></div> : null}</div>
      <div style={panel}><div style={muted}><Sparkles size={14} style={{ verticalAlign: "middle" }} /> CARDÁPIO SUGERIDO</div><div style={{ fontSize: 28, fontWeight: 800, color: "#F8F9FF" }}>{target ?? "—"} <small style={{ fontSize: 14, color: "#A8B4D8" }}>kcal</small></div></div>
      <div style={panel}><div style={muted}>MACROS CONSUMIDOS</div><div style={{ color: "#F8F9FF", fontWeight: 700, marginTop: 6 }}>P {Math.round(macros.p)}g · C {Math.round(macros.c)}g · G {Math.round(macros.f)}g</div></div>
      <div style={panel}><div style={muted}><Wallet size={14} style={{ verticalAlign: "middle" }} /> CUSTO ESTIMADO DO DIA</div><div style={{ fontSize: 24, fontWeight: 800, color: "#F8F9FF" }}>{plan ? dayCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</div></div>
    </div>

    <article style={{ ...panel, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div><h2 style={{ margin: 0, color: "#F8F9FF", fontSize: 18 }}>Sugestão de hoje</h2><p style={{ ...muted, margin: "4px 0 0" }}>Toque em + para registrar um alimento que você comeu.</p></div>
        <button type="button" style={btn} disabled={planLoading} onClick={() => void loadPlan(true)}><RefreshCw size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />Gerar outro</button>
      </div>
      {planLoading ? <p style={muted}><Loader2 size={15} className="animate-spin" style={{ verticalAlign: "middle", marginRight: 6 }} />Montando seu cardápio…</p>
        : planError ? <div role="alert" style={{ color: "#FFB5BF" }}>{planError} <button type="button" style={{ ...btn, marginLeft: 8 }} onClick={() => void loadPlan()}>Tentar novamente</button></div>
        : plan && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 12 }}>
          {plan.meals.map((m, i) => <div key={i} style={{ border: "1px solid #29233F", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ color: "#C8FF58", fontSize: 12, fontWeight: 700 }}>{(mealLabels[m.meal_type] ?? m.meal_type).toUpperCase()}</span><span style={muted}>{m.calories} kcal</span></div>
            <strong style={{ display: "block", color: "#F8F9FF", margin: "6px 0 8px" }}>{m.title}</strong>
            {m.foods.map((f, j) => <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #1d1930" }}>
              <div style={{ minWidth: 0 }}><div style={{ color: "#F8F9FF", fontSize: 14 }}>{f.name}</div><div style={{ ...muted, fontSize: 12 }}>{f.quantity} · {f.calories} kcal</div></div>
              <button type="button" aria-label={`Registrar ${f.name}`} disabled={saving} style={{ ...btn, padding: 7 }} onClick={() => void addPlanned(m.meal_type, f)}><Plus size={14} /></button>
            </div>)}
          </div>)}
        </div>}
    </article>

    <article style={{ ...panel, marginTop: 16 }}>
      <h2 style={{ margin: "0 0 4px", color: "#F8F9FF", fontSize: 18 }}>O que você comeu hoje</h2>
      <p style={{ ...muted, margin: "0 0 14px" }}>Digite qualquer alimento e a quantidade; calculamos as calorias para você.</p>
      <form onSubmit={addCustom} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,160px),1fr))", gap: 8 }}>
        <input style={input} placeholder="Ex.: pão francês com manteiga" value={food} onChange={e => setFood(e.target.value)} maxLength={200} aria-label="Alimento" />
        <input style={input} placeholder="Quantidade (ex.: 2 unidades)" value={quantity} onChange={e => setQuantity(e.target.value)} maxLength={100} aria-label="Quantidade" />
        <select style={input} value={mealType} onChange={e => setMealType(e.target.value)} aria-label="Refeição">{Object.entries(mealLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button type="submit" style={primary} disabled={saving || !food.trim()}>{saving ? "Calculando…" : "Registrar"}</button>
      </form>
      {logError && <div role="alert" style={{ color: "#FFB5BF", marginTop: 10 }}>{logError}</div>}
      {logs.length === 0 ? <div style={{ textAlign: "center", padding: "24px 12px", ...muted }}><Utensils size={24} /><div>Nenhum alimento registrado hoje.</div></div>
        : <div style={{ marginTop: 12 }}>{logs.map(l => <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid #29233F" }}>
          <div style={{ minWidth: 0 }}><strong style={{ color: "#F8F9FF" }}>{l.food_name}</strong><div style={{ ...muted, fontSize: 12 }}>{mealLabels[l.meal_type] ?? l.meal_type}{l.quantity ? " · " + l.quantity : ""} · P {Math.round(l.protein_g)}g C {Math.round(l.carbs_g)}g G {Math.round(l.fat_g)}g</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "#C8FF58", fontWeight: 700 }}>{l.calories} kcal</span><button type="button" aria-label={`Excluir ${l.food_name}`} disabled={saving} style={{ ...btn, padding: 7 }} onClick={() => void remove(l.id)}><Trash2 size={14} /></button></div>
        </div>)}</div>}
    </article>
  </section>;
}
