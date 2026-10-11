import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Dumbbell, Leaf, LoaderCircle, Sparkles, Target } from "lucide-react";
import { adoptSupabaseSession, getFitnessOnboarding, saveFitnessOnboarding, type AuthSession, type FitnessOnboardingAnswers } from "../lib/supabase";
import "./onboarding.css";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Personalize sua jornada — Avirafit" }, { name: "description", content: "Conte à Avirafit sobre seus objetivos e preferências para personalizar sua experiência." }] }),
  component: OnboardingPage,
});

const goals = ["Emagrecer", "Ganhar massa muscular", "Definir o corpo", "Melhorar o condicionamento físico", "Manter a forma e ter mais saúde"];
const equipmentOptions = ["Nenhum equipamento", "Halteres", "Elásticos", "Máquinas", "Barra e anilhas", "Equipamentos variados"];
const challengeOptions = ["Falta de tempo", "Manter a consistência", "Motivação", "Não saber por onde começar", "Organizar os treinos", "Planejar a alimentação"];
const foodOptions = ["Arroz e feijão", "Frutas", "Legumes e verduras", "Ovos", "Frango", "Peixes", "Laticínios", "Leguminosas", "Massas", "Pães e cereais"];

const emptyAnswers: FitnessOnboardingAnswers = {
  primaryGoal: "", secondaryGoals: [], age: "", heightCm: "", currentWeightKg: "", desiredWeightKg: "",
  experience: "", currentlyTraining: "", daysPerWeek: "", sessionMinutes: "", trainingLocation: "",
  weeklyTime: "", preferredTime: "", equipment: [], challenges: [], foodBudget: "", foodBudgetPeriod: "weekly",
  mealsPerDay: "", preferredFoods: [], dislikedFoods: "", dietaryRestrictions: "", allergies: "",
};

const steps = [
  { title: "Seu objetivo", description: "O que você quer priorizar nesta fase?" },
  { title: "Sobre você", description: "Informações opcionais para contextualizar sua rotina." },
  { title: "Seu treino", description: "Vamos entender como você gosta de se movimentar." },
  { title: "Sua rotina", description: "Preferências práticas para um plano possível." },
  { title: "Alimentação", description: "Hábitos e preferências, sem julgamentos." },
  { title: "Revise seu perfil", description: "Confira tudo antes de concluir." },
];

function OnboardingPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [answers, setAnswers] = useState<FitnessOnboardingAnswers>(emptyAnswers);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!current) { window.location.replace("/?auth=login&next=%2Fonboarding"); return; }
        const saved = await getFitnessOnboarding(current);
        if (!active) return;
        setSession(current);
        if (saved?.answers) setAnswers({ ...emptyAnswers, ...saved.answers });
        if (saved?.status === "completed" && new URLSearchParams(window.location.search).get("edit") !== "1") {
          window.location.replace("/preview");
          return;
        }
      } catch {
        if (active) setError("Não foi possível carregar seu perfil. Confira sua conexão e tente novamente.");
      } finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, []);

  const update = useCallback(<K extends keyof FitnessOnboardingAnswers>(key: K, value: FitnessOnboardingAnswers[K]) => {
    setAnswers(current => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }, []);

  const toggle = (key: "secondaryGoals" | "equipment" | "challenges" | "preferredFoods", value: string) => {
    const current = answers[key];
    update(key, current.includes(value) ? current.filter(item => item !== value) as never : [...current, value] as never);
  };

  const validateStep = () => {
    if (step === 0 && !answers.primaryGoal) return "Escolha seu objetivo principal para continuar.";
    if (step === 1) {
      const age = answers.age.trim() ? Number(answers.age) : null;
      const height = answers.heightCm.trim() ? Number(answers.heightCm) : null;
      const weight = answers.currentWeightKg.trim() ? Number(answers.currentWeightKg) : null;
      const desired = answers.desiredWeightKg.trim() ? Number(answers.desiredWeightKg) : null;
      if (age !== null && (!Number.isInteger(age) || age < 13 || age > 110)) return "Informe uma idade entre 13 e 110 anos, ou deixe o campo em branco.";
      if (height !== null && (!Number.isFinite(height) || height < 100 || height > 250)) return "Informe uma altura entre 100 e 250 cm, ou deixe o campo em branco.";
      if (weight !== null && (!Number.isFinite(weight) || weight < 25 || weight > 400)) return "Informe um peso atual entre 25 e 400 kg, ou deixe o campo em branco.";
      if (desired !== null && (!Number.isFinite(desired) || desired < 25 || desired > 400)) return "Informe um peso desejado entre 25 e 400 kg, ou deixe o campo em branco.";
    }
    if (step === 2 && (!answers.experience || !answers.currentlyTraining || !answers.daysPerWeek || !answers.sessionMinutes || !answers.trainingLocation)) return "Responda às perguntas principais sobre seu treino para continuar.";
    if (step === 4 && answers.foodBudget.trim() && (!Number.isFinite(Number(answers.foodBudget)) || Number(answers.foodBudget) < 0)) return "Informe um orçamento válido ou deixe o campo em branco.";
    if (step === 4 && answers.mealsPerDay && (!Number.isInteger(Number(answers.mealsPerDay)) || Number(answers.mealsPerDay) < 1 || Number(answers.mealsPerDay) > 10)) return "Informe de 1 a 10 refeições por dia, ou deixe em branco.";
    return "";
  };

  const saveDraft = async (nextStep: number) => {
    if (!session) return false;
    setSaving(true); setError(""); setNotice("");
    try {
      await saveFitnessOnboarding(session, answers, "pending");
      setStep(nextStep);
      setNotice("Suas respostas foram salvas. Você pode continuar depois.");
      return true;
    } catch {
      setError("Não foi possível salvar suas respostas. Verifique a conexão e tente novamente.");
      return false;
    } finally { setSaving(false); }
  };

  const complete = async () => {
    if (!session) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await saveFitnessOnboarding(session, answers, "completed");
      window.location.assign("/preview");
    } catch {
      setError("Não foi possível concluir o perfil agora. Suas respostas permanecem nesta tela; tente novamente.");
    } finally { setSaving(false); }
  };

  const goNext = async () => {
    const message = validateStep();
    if (message) { setError(message); return; }
    await saveDraft(Math.min(step + 1, steps.length - 1));
  };

  const progress = Math.round(((step + 1) / steps.length) * 100);
  const review = useMemo(() => [
    ["Objetivo principal", answers.primaryGoal || "Não informado"],
    ["Objetivos adicionais", answers.secondaryGoals.join(", ") || "Nenhum selecionado"],
    ["Idade", answers.age ? answers.age + " anos" : "Não informado"],
    ["Altura", answers.heightCm ? answers.heightCm + " cm" : "Não informado"],
    ["Peso atual", answers.currentWeightKg ? answers.currentWeightKg + " kg" : "Não informado"],
    ["Peso desejado", answers.desiredWeightKg ? answers.desiredWeightKg + " kg" : "Não informado"],
    ["Experiência", answers.experience || "Não informado"],
    ["Treina atualmente", answers.currentlyTraining || "Não informado"],
    ["Dias por semana", answers.daysPerWeek ? answers.daysPerWeek + " dias" : "Não informado"],
    ["Tempo por sessão", answers.sessionMinutes ? answers.sessionMinutes + " minutos" : "Não informado"],
    ["Local de treino", answers.trainingLocation || "Não informado"],
    ["Tempo na semana", answers.weeklyTime || "Não informado"],
    ["Horário preferido", answers.preferredTime || "Não informado"],
    ["Equipamentos", answers.equipment.join(", ") || "Não informado"],
    ["Desafios", answers.challenges.join(", ") || "Não informado"],
    ["Orçamento alimentar", answers.foodBudget ? "R$ " + answers.foodBudget + (answers.foodBudgetPeriod === "weekly" ? " por semana (estimativa)" : " por mês (estimativa)") : "Não informado"],
    ["Refeições por dia", answers.mealsPerDay || "Não informado"],
    ["Alimentos preferidos", answers.preferredFoods.join(", ") || "Não informado"],
    ["Alimentos que não gosta", answers.dislikedFoods || "Não informado"],
    ["Restrições alimentares", answers.dietaryRestrictions || "Não informado"],
    ["Alergias relevantes", answers.allergies || "Não informado"],
  ], [answers]);

  if (!ready) return <main className="onboarding-page onboarding-loading"><LoaderCircle className="onboarding-spin" size={28}/> Carregando seu perfil...</main>;

  return <main className="onboarding-page">
    <div className="onboarding-glow onboarding-glow-purple" aria-hidden="true"/><div className="onboarding-glow onboarding-glow-green" aria-hidden="true"/>
    <div className="onboarding-shell">
      <header className="onboarding-header">
        <a className="onboarding-brand" href="/"><span className="onboarding-brand-icon"><Dumbbell size={19}/></span> avirafit<span>.</span></a>
        <span className="onboarding-private"><span/> SEU PERFIL, SUA JORNADA</span>
      </header>
      <section className="onboarding-card">
        <div className="onboarding-progress-top"><span>PERSONALIZAÇÃO · ETAPA {step + 1} DE {steps.length}</span><strong>{progress}%</strong></div>
        <div className="onboarding-progress"><span style={{ width: progress + "%" }}/></div>
        <div className="onboarding-step-heading"><div className="onboarding-step-icon">{step === 0 ? <Target/> : step === 4 ? <Leaf/> : <Sparkles/>}</div><h1>{steps[step]?.title}</h1><p>{steps[step]?.description}</p></div>

        {step === 0 && <div className="onboarding-fields">
          <p className="onboarding-label">Qual é o seu principal objetivo?</p>
          <div className="onboarding-choice-grid">{goals.map((goal, index)=><button type="button" key={goal} className={"onboarding-choice "+(answers.primaryGoal===goal?"selected":"")} onClick={()=>update("primaryGoal",goal)}><span className="onboarding-choice-number">0{index+1}</span><span>{goal}</span>{answers.primaryGoal===goal&&<Check size={18}/>}</button>)}</div>
          <p className="onboarding-label onboarding-optional-label">Quer adicionar objetivos secundários? <small>Opcional</small></p>
          <div className="onboarding-chip-list">{goals.filter(goal=>goal!==answers.primaryGoal).map(goal=><button type="button" key={goal} className={"onboarding-chip "+(answers.secondaryGoals.includes(goal)?"selected":"")} onClick={()=>toggle("secondaryGoals",goal)}>{answers.secondaryGoals.includes(goal)&&<Check size={14}/>} {goal}</button>)}</div>
        </div>}

        {step === 1 && <div className="onboarding-fields">
          <p className="onboarding-helper">Essas informações são opcionais. Compartilhe apenas o que se sentir confortável em informar.</p>
          <div className="onboarding-input-grid">
            <label>Idade <small>Opcional</small><div className="onboarding-input-unit"><input type="number" min="13" max="110" inputMode="numeric" placeholder="Ex.: 28" value={answers.age} onChange={e=>update("age",e.target.value)}/><span>anos</span></div></label>
            <label>Altura <small>Opcional</small><div className="onboarding-input-unit"><input type="number" min="100" max="250" inputMode="numeric" placeholder="Ex.: 170" value={answers.heightCm} onChange={e=>update("heightCm",e.target.value)}/><span>cm</span></div></label>
            <label>Peso atual <small>Opcional</small><div className="onboarding-input-unit"><input type="number" min="25" max="400" step="0.1" inputMode="decimal" placeholder="Ex.: 75" value={answers.currentWeightKg} onChange={e=>update("currentWeightKg",e.target.value)}/><span>kg</span></div></label>
            <label>Peso desejado <small>Se aplicável</small><div className="onboarding-input-unit"><input type="number" min="25" max="400" step="0.1" inputMode="decimal" placeholder="Ex.: 70" value={answers.desiredWeightKg} onChange={e=>update("desiredWeightKg",e.target.value)}/><span>kg</span></div></label>
          </div>
          <p className="onboarding-helper">Seus dados são usados para contextualizar a experiência, não para julgar seu corpo ou prometer resultados.</p>
        </div>}

        {step === 2 && <div className="onboarding-fields">
          <p className="onboarding-label">Qual é seu nível de experiência?</p><div className="onboarding-segment-grid">{["Iniciante","Intermediário","Avançado"].map(value=><button type="button" key={value} className={"onboarding-segment "+(answers.experience===value?"selected":"")} onClick={()=>update("experience",value)}>{value}</button>)}</div>
          <p className="onboarding-label">Você já treina atualmente?</p><div className="onboarding-segment-grid">{["Sim","Estou voltando","Ainda não"].map(value=><button type="button" key={value} className={"onboarding-segment "+(answers.currentlyTraining===value?"selected":"")} onClick={()=>update("currentlyTraining",value)}>{value}</button>)}</div>
          <div className="onboarding-input-grid">
            <label>Dias por semana<select value={answers.daysPerWeek} onChange={e=>update("daysPerWeek",e.target.value)}><option value="">Selecione</option>{[1,2,3,4,5,6,7].map(n=><option key={n} value={String(n)}>{n} {n===1?"dia":"dias"}</option>)}</select></label>
            <label>Tempo por sessão<select value={answers.sessionMinutes} onChange={e=>update("sessionMinutes",e.target.value)}><option value="">Selecione</option>{["15","30","45","60","75","90"].map(n=><option key={n} value={n}>{n} minutos</option>)}</select></label>
          </div>
          <p className="onboarding-label">Onde prefere treinar?</p><div className="onboarding-segment-grid">{["Em casa","Na academia","Ao ar livre","Outro local"].map(value=><button type="button" key={value} className={"onboarding-segment "+(answers.trainingLocation===value?"selected":"")} onClick={()=>update("trainingLocation",value)}>{value}</button>)}</div>
        </div>}

        {step === 3 && <div className="onboarding-fields">
          <div className="onboarding-input-grid"><label>Tempo disponível na semana <small>Opcional</small><select value={answers.weeklyTime} onChange={e=>update("weeklyTime",e.target.value)}><option value="">Prefiro não informar</option><option>Até 2 horas</option><option>2 a 4 horas</option><option>4 a 6 horas</option><option>Mais de 6 horas</option></select></label><label>Horário preferido <small>Opcional</small><select value={answers.preferredTime} onChange={e=>update("preferredTime",e.target.value)}><option value="">Sem preferência</option><option>Manhã</option><option>Hora do almoço</option><option>Tarde</option><option>Noite</option><option>Varia a cada dia</option></select></label></div>
          <p className="onboarding-label">Quais equipamentos você tem disponíveis? <small>Opcional</small></p><div className="onboarding-chip-list">{equipmentOptions.map(value=><button type="button" key={value} className={"onboarding-chip "+(answers.equipment.includes(value)?"selected":"")} onClick={()=>toggle("equipment",value)}>{answers.equipment.includes(value)&&<Check size={14}/>} {value}</button>)}</div>
          <p className="onboarding-label">O que você gostaria de superar? <small>Opcional</small></p><div className="onboarding-chip-list">{challengeOptions.map(value=><button type="button" key={value} className={"onboarding-chip "+(answers.challenges.includes(value)?"selected":"")} onClick={()=>toggle("challenges",value)}>{answers.challenges.includes(value)&&<Check size={14}/>} {value}</button>)}</div>
        </div>}

        {step === 4 && <div className="onboarding-fields">
          <p className="onboarding-helper">As informações alimentares são preferências gerais, não uma prescrição nutricional. O orçamento é opcional e apenas estimativo.</p>
          <div className="onboarding-input-grid"><label>Orçamento alimentar <small>Opcional · estimativa</small><div className="onboarding-input-unit"><span>R$</span><input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Ex.: 250" value={answers.foodBudget} onChange={e=>update("foodBudget",e.target.value)}/></div></label><label>Período do orçamento<select value={answers.foodBudgetPeriod} onChange={e=>update("foodBudgetPeriod",e.target.value as "weekly"|"monthly")}><option value="weekly">Por semana</option><option value="monthly">Por mês</option></select></label><label>Refeições por dia <small>Opcional</small><select value={answers.mealsPerDay} onChange={e=>update("mealsPerDay",e.target.value)}><option value="">Prefiro não informar</option>{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={String(n)}>{n}</option>)}</select></label></div>
          <p className="onboarding-label">Quais alimentos você costuma preferir? <small>Opcional</small></p><div className="onboarding-chip-list">{foodOptions.map(value=><button type="button" key={value} className={"onboarding-chip "+(answers.preferredFoods.includes(value)?"selected":"")} onClick={()=>toggle("preferredFoods",value)}>{answers.preferredFoods.includes(value)&&<Check size={14}/>} {value}</button>)}</div>
          <label className="onboarding-textarea-label">Alimentos de que não gosta <small>Opcional</small><textarea rows={2} placeholder="Conte, se quiser..." value={answers.dislikedFoods} onChange={e=>update("dislikedFoods",e.target.value)}/></label>
          <label className="onboarding-textarea-label">Restrições alimentares <small>Opcional</small><textarea rows={2} placeholder="Ex.: vegetariana, sem lactose..." value={answers.dietaryRestrictions} onChange={e=>update("dietaryRestrictions",e.target.value)}/></label>
          <label className="onboarding-textarea-label">Alergias relevantes <small>Opcional</small><textarea rows={2} placeholder="Informe apenas se considerar relevante..." value={answers.allergies} onChange={e=>update("allergies",e.target.value)}/></label>
        </div>}

        {step === 5 && <div className="onboarding-review">
          <div className="onboarding-review-note"><Check size={18}/> Revise suas respostas. Você poderá editar o perfil depois.</div>
          {review.map(([label,value],index)=><div className="onboarding-review-row" key={label}><div><small>{label}</small><strong>{value}</strong></div>{index<2&&<button type="button" onClick={()=>setStep(0)}>Editar</button>}{index>=2&&index<=5&&<button type="button" onClick={()=>setStep(1)}>Editar</button>}{index>=6&&index<=10&&<button type="button" onClick={()=>setStep(2)}>Editar</button>}{index>=11&&index<=14&&<button type="button" onClick={()=>setStep(3)}>Editar</button>}{index>=15&&<button type="button" onClick={()=>setStep(4)}>Editar</button>}</div>)}
          <div className="onboarding-disclaimer"><CircleAlert size={17}/><span>Seu perfil ajuda a organizar a experiência. Não é diagnóstico, prescrição médica ou promessa de resultado físico.</span></div>
        </div>}

        {error&&<div className="onboarding-alert" role="alert"><CircleAlert size={17}/>{error}</div>}
        {notice&&<p className="onboarding-saved" role="status"><Check size={15}/>{notice}</p>}
        <footer className="onboarding-actions">
          <button type="button" className="onboarding-back" onClick={()=>{setError("");setNotice("");setStep(Math.max(0,step-1));}} disabled={step===0||saving}><ArrowLeft size={17}/> Voltar</button>
          {step<steps.length-1 ? <button type="button" className="onboarding-next" onClick={goNext} disabled={saving}>{saving?<><LoaderCircle className="onboarding-spin" size={17}/> Salvando...</>:<>Salvar e continuar <ArrowRight size={17}/></>}</button> : <button type="button" className="onboarding-next" onClick={complete} disabled={saving}>{saving?<><LoaderCircle className="onboarding-spin" size={17}/> Salvando perfil...</>:<>Criar meu perfil personalizado <ArrowRight size={17}/></>}</button>}
        </footer>
      </section>
      <p className="onboarding-footer-note">Avirafit · Sua jornada, no seu ritmo.</p>
    </div>
  </main>;
}
