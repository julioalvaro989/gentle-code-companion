import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { adoptSupabaseSession, getFitnessProfile, getFitnessOnboardingAnswers, saveFitnessOnboardingAnswers, getVibraAccess, saveFullFitnessProfile, type AuthSession, type FitnessProfileInput } from "../lib/supabase";
import { formatLocalDateInput, isCivilDateInFuture, isValidCivilDate, useLocalToday } from "../lib/date-utils";

const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", border: "1px solid #343047", borderRadius: 12, background: "#10101b", color: "#f8f7ff", font: "inherit" };
const labelStyle = { display: "grid", gap: 7, color: "#d8d5e7", fontSize: 13, fontWeight: 600 as const };
type Goal = NonNullable<FitnessProfileInput["primary_goal"]>;
type Level = NonNullable<FitnessProfileInput["experience_level"]>;
type Place = NonNullable<FitnessProfileInput["training_location"]>;

export function FitnessProfilePage() {
  const today = useLocalToday();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState<Goal | "">("");
  const [level, setLevel] = useState<Level | "">("");
  const [frequency, setFrequency] = useState("");
  const [place, setPlace] = useState<Place | "">("");
  const [preferences, setPreferences] = useState("");
  const [limitations, setLimitations] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState("");
  const [equipment, setEquipment] = useState("");
  const [foodBudget, setFoodBudget] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState("");

  const progress = useMemo(() => {
    const checks = [name.trim().length >= 2, Number(weight) >= 20 && Number(weight) <= 500, Number(height) >= 80 && Number(height) <= 250, Boolean(goal), Boolean(level), Number(frequency) >= 1 && Number(frequency) <= 7, Boolean(place)];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }, [name, weight, height, goal, level, frequency, place]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!current) { setRedirecting(true); window.location.replace("/?auth=login"); return; }
        const access = await getVibraAccess(current);
        if (access.status !== "active") { setRedirecting(true); window.location.replace("/checkout"); return; }
        if (!active) return;
        setSession(current);
        const saved = await getFitnessProfile(current);
        if (!active) return;
        setName(saved?.username || current.user.user_metadata?.full_name || current.user.email?.split("@")[0] || "");
        setBirthDate(saved?.birth_date || "");
        setWeight(saved?.weight_kg == null ? "" : String(saved.weight_kg));
        setHeight(saved?.height_cm == null ? "" : String(saved.height_cm));
        setGoal(saved?.primary_goal || "");
        setLevel(saved?.experience_level || "");
        setFrequency(saved?.weekly_frequency == null ? "" : String(saved.weekly_frequency));
        setPlace(saved?.training_location || "");
        setPreferences(saved?.preferences || "");
        setLimitations(saved?.physical_limitations || "");
        const onboarding = await getFitnessOnboardingAnswers(current);
        if (!active) return;
        const answers = onboarding?.answers;
        setSessionMinutes(answers?.["sessionMinutes"] == null ? "" : String(answers["sessionMinutes"]));
        setEquipment(Array.isArray(answers?.["equipment"]) ? answers["equipment"].join(", ") : typeof answers?.["equipment"] === "string" ? answers["equipment"] : "");
        setFoodBudget(answers?.["foodBudget"] == null ? "" : String(answers["foodBudget"]));
        setDietaryRestrictions(Array.isArray(answers?.["dietaryRestrictions"]) ? answers["dietaryRestrictions"].join(", ") : typeof answers?.["dietaryRestrictions"] === "string" ? answers["dietaryRestrictions"] : "");
        setDietaryPreferences(Array.isArray(answers?.["preferredFoods"]) ? answers["preferredFoods"].join(", ") : typeof answers?.["preferredFoods"] === "string" ? answers["preferredFoods"] : "");
        setAllergies(Array.isArray(answers?.["allergies"]) ? answers["allergies"].join(", ") : typeof answers?.["allergies"] === "string" ? answers["allergies"] : "");
        setDislikedFoods(Array.isArray(answers?.["dislikedFoods"]) ? answers["dislikedFoods"].join(", ") : typeof answers?.["dislikedFoods"] === "string" ? answers["dislikedFoods"] : "");
      } catch {
        if (active) setError("Não foi possível validar seu acesso ou recuperar o perfil. O acesso permanece bloqueado; tente novamente.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || saving) return;
    setError(""); setNotice("");
    const kg = Number(weight), cm = Number(height), weekly = Number(frequency);
    if (name.trim().length < 2) { setError("Informe seu nome ou como prefere ser chamado."); return; }
    if (!goal || !level || !place) { setError("Selecione seu objetivo, nível de experiência e local de treino."); return; }
    if (!Number.isFinite(kg) || kg < 20 || kg > 500) { setError("Informe um peso entre 20 e 500 kg."); return; }
    if (!Number.isFinite(cm) || cm < 80 || cm > 250) { setError("Informe uma altura entre 80 e 250 cm."); return; }
    if (!Number.isInteger(weekly) || weekly < 1 || weekly > 7) { setError("Escolha uma frequência entre 1 e 7 dias por semana."); return; }
    if (birthDate && (!isValidCivilDate(birthDate) || isCivilDateInFuture(birthDate, today) || Number(birthDate.slice(0, 4)) < 1900)) { setError("Confira a data de nascimento informada."); return; }
    setSaving(true);
    try {
      const profile: FitnessProfileInput = {
        username: name.trim(),
        email: session.user.email || "",
        goal: goal === "emagrecimento" ? "Perder gordura" : goal === "hipertrofia" ? "Ganhar massa muscular" : goal === "condicionamento" ? "Melhorar condicionamento" : "Ter mais saúde e energia",
        birth_date: birthDate || null,
        weight_kg: kg,
        height_cm: cm,
        primary_goal: goal,
        experience_level: level,
        weekly_frequency: weekly,
        training_location: place,
        preferences: preferences.trim() || null,
        physical_limitations: limitations.trim() || null,
        profile_completed: true,
      };
      await saveFullFitnessProfile(session, profile);
      await saveFitnessOnboardingAnswers(session, {
        sessionMinutes: sessionMinutes.trim() ? Number(sessionMinutes) : null,
        equipment: equipment.split(",").map(v => v.trim()).filter(Boolean).slice(0, 30),
        foodBudget: foodBudget.trim() ? Number(foodBudget.replace(",", ".")) : null,
        dietaryRestrictions: dietaryRestrictions.split(",").map(v => v.trim()).filter(Boolean).slice(0, 30),
        preferredFoods: dietaryPreferences.split(",").map(v => v.trim()).filter(Boolean).slice(0, 30),
        allergies: allergies.split(",").map(v => v.trim()).filter(Boolean).slice(0, 30),
        dislikedFoods: dislikedFoods.split(",").map(v => v.trim()).filter(Boolean).slice(0, 30),
      });
      setNotice("Perfil salvo com sucesso. Abrindo seu espaço Vibra…");
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o perfil. Tente novamente.");
    } finally { setSaving(false); }
  }

  if (loading || redirecting) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080810", color: "white" }}>Validando pagamento e carregando perfil…</main>;

  return <main style={{ minHeight: "100vh", padding: "28px 16px 56px", background: "radial-gradient(circle at 10% 0%, #21163d 0, transparent 34%), #080810", color: "#f8f7ff" }}>
    <div style={{ maxWidth: 850, margin: "0 auto" }}>
      <button type="button" onClick={() => window.location.assign("/")} style={{ background: "transparent", border: 0, color: "#c9c4df", display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer", marginBottom: 28 }}><ArrowLeft size={16}/> Voltar</button>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}><span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 13, background: "#b9f35b", color: "#151521" }}><Activity size={23}/></span><strong style={{ fontSize: 23 }}>vibra<span style={{ color: "#b9f35b" }}>.</span></strong></div>
      <p style={{ color: "#b9f35b", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>ETAPA 2 DE 2 · PERFIL FITNESS</p>
      <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", lineHeight: 1.08, margin: "8px 0 12px" }}>Vamos personalizar <span style={{ color: "#b9f35b" }}>sua jornada.</span></h1>
      <p style={{ color: "#b8b4c9", lineHeight: 1.7, maxWidth: 640 }}>Preencha o essencial para adaptar sua experiência. Você pode voltar e atualizar as respostas depois.</p>
      <div style={{ background: "#1a1927", borderRadius: 999, height: 6, overflow: "hidden", margin: "22px 0 28px" }}><div style={{ width: progress + "%", height: "100%", background: "#b9f35b", transition: "width .2s" }}/></div>
      <form onSubmit={submit} style={{ border: "1px solid #302b43", background: "rgba(18,17,29,.94)", borderRadius: 22, padding: "clamp(18px,4vw,34px)", display: "grid", gap: 22 }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <label style={labelStyle}>Nome ou nome de preferência<input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" /></label>
          <label style={labelStyle}>Data de nascimento <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional)</span><input style={inputStyle} type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} max={formatLocalDateInput(today)} /></label>
          <label style={labelStyle}>Peso atual (kg)<input style={inputStyle} type="number" inputMode="decimal" min="20" max="500" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} required /></label>
          <label style={labelStyle}>Altura (cm)<input style={inputStyle} type="number" inputMode="numeric" min="80" max="250" step="0.1" value={height} onChange={e=>setHeight(e.target.value)} required /></label>
        </section>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <label style={labelStyle}>Objetivo principal<select style={inputStyle} value={goal} onChange={e=>setGoal(e.target.value as Goal | "")} required><option value="">Selecione seu objetivo</option><option value="emagrecimento">Emagrecimento</option><option value="hipertrofia">Hipertrofia</option><option value="condicionamento">Condicionamento físico</option><option value="saude_geral">Saúde geral</option></select></label>
          <label style={labelStyle}>Experiência com treino<select style={inputStyle} value={level} onChange={e=>setLevel(e.target.value as Level | "")} required><option value="">Selecione seu nível</option><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option><option value="avancado">Avançado</option></select></label>
          <label style={labelStyle}>Frequência semanal<select style={inputStyle} value={frequency} onChange={e=>setFrequency(e.target.value)} required><option value="">Selecione os dias</option>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n} {n===1?"dia":"dias"} por semana</option>)}</select></label>
          <label style={labelStyle}>Onde costuma treinar?<select style={inputStyle} value={place} onChange={e=>setPlace(e.target.value as Place | "")} required><option value="">Selecione o local</option><option value="academia">Academia</option><option value="casa">Em casa</option><option value="outro">Outro local</option></select></label>
        </section>
        <label style={labelStyle}>Preferências ou restrições relevantes <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional)</span><textarea style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} value={preferences} onChange={e=>setPreferences(e.target.value)} maxLength={1500} placeholder="Ex.: equipamentos disponíveis, preferências de treino ou alimentação." /></label>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <label style={labelStyle}>Tempo disponível por sessão (minutos) <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional)</span><input style={inputStyle} type="number" min="10" max="240" step="5" value={sessionMinutes} onChange={e=>setSessionMinutes(e.target.value)} placeholder="Ex.: 45" /></label>
          <label style={labelStyle}>Orçamento mensal para alimentação (R$) <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional)</span><input style={inputStyle} type="number" min="0" max="100000" step="0.01" value={foodBudget} onChange={e=>setFoodBudget(e.target.value)} placeholder="Ex.: 400,00" /></label>
        </section>
        <label style={labelStyle}>Equipamentos disponíveis <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional, separe por vírgulas)</span><input style={inputStyle} value={equipment} onChange={e=>setEquipment(e.target.value)} maxLength={1200} placeholder="Ex.: halteres, elásticos, esteira" /></label>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <label style={labelStyle}>Restrições alimentares <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional, separe por vírgulas)</span><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={dietaryRestrictions} onChange={e=>setDietaryRestrictions(e.target.value)} maxLength={1200} placeholder="Ex.: vegetariana, intolerância à lactose (somente se aplicável)" /></label>
          <label style={labelStyle}>Preferências alimentares <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional, separe por vírgulas)</span><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={dietaryPreferences} onChange={e=>setDietaryPreferences(e.target.value)} maxLength={1200} placeholder="Ex.: arroz, feijão, refeições práticas" /></label>
        </section>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <label style={labelStyle}>Alergias alimentares <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional, separe por vírgulas)</span><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={allergies} onChange={e=>setAllergies(e.target.value)} maxLength={1200} placeholder="Informe somente alergias confirmadas." /></label>
          <label style={labelStyle}>Alimentos que prefere evitar <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional, separe por vírgulas)</span><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={dislikedFoods} onChange={e=>setDislikedFoods(e.target.value)} maxLength={1200} placeholder="Ex.: alimentos que não gosta." /></label>
        </section>
        <label style={labelStyle}>Lesões ou limitações físicas que deseja informar <span style={{ color: "#8d89a1", fontWeight: 400 }}>(opcional)</span><textarea style={{ ...inputStyle, minHeight: 92, resize: "vertical" }} value={limitations} onChange={e=>setLimitations(e.target.value)} maxLength={1000} placeholder="Compartilhe somente o que considerar necessário." /><small style={{ color: "#9691a9", fontWeight: 400, lineHeight: 1.5 }}>Esse dado é sensível. Será usado apenas para contextualizar orientações relevantes; não substitui avaliação profissional.</small></label>
        {error && <p role="alert" style={{ color: "#ff9eaa", background: "#351c2a", padding: 12, borderRadius: 10 }}>{error}</p>}
        {notice && <p role="status" style={{ color: "#c9ff87" }}><CheckCircle2 size={16} style={{ verticalAlign: "middle" }}/> {notice}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid #302b43", paddingTop: 20 }}>
          <span style={{ color: "#a8a3bb", fontSize: 12 }}><ShieldCheck size={15} style={{ verticalAlign: "middle" }}/> Seus dados ficam vinculados à sua conta.</span>
          <button type="submit" disabled={saving || progress < 100} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "13px 20px", border: 0, borderRadius: 12, background: saving || progress < 100 ? "#555364" : "#b9f35b", color: "#11111a", fontWeight: 800, cursor: saving || progress < 100 ? "not-allowed" : "pointer" }}>{saving ? "Salvando…" : "Salvar perfil e continuar"} <ArrowRight size={17}/></button>
        </div>
      </form>
    </div>
  </main>;
}
