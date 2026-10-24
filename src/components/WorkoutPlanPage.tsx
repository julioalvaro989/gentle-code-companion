import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Dumbbell, LoaderCircle, Moon, RefreshCw, Sparkles } from "lucide-react";
import type { AuthSession, FitnessProfile } from "../lib/supabase";
import { completeWorkoutPlanDay, getFitnessOnboardingAnswers, getFitnessProfile, getWorkoutPlanWeek, saveWorkoutPlanWeek, type WorkoutPlanWeekRecord } from "../lib/supabase";
import { generateWeeklyWorkoutPlan, getLocalDateKey, getMonday, isPlanProfileComplete, type WorkoutProfile } from "../lib/workout-planner";
import "./WorkoutPlanPage.css";

type Props = { session: AuthSession; onCompleted?: () => void };
const weekDates = (start: Date) => Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
const labelDate = (date: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));

function buildProfile(profile: FitnessProfile | null, answers: Record<string, unknown> | null): WorkoutProfile {
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
  const strings = (value: unknown): string[] | null => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean) : typeof value === "string" && value.trim() ? value.split(",").map(item => item.trim()).filter(Boolean) : null;
  return {
    primaryGoal: profile?.primary_goal ?? profile?.goal ?? null,
    experienceLevel: profile?.experience_level ?? null,
    weeklyFrequency: profile?.weekly_frequency ?? null,
    trainingLocation: profile?.training_location ?? null,
    sessionMinutes: number(answers?.["sessionMinutes"]),
    equipment: strings(answers?.["equipment"]),
    preferences: profile?.preferences ?? null,
    physicalLimitations: profile?.physical_limitations ?? null,
  };
}

export function WorkoutPlanPage({ session, onCompleted }: Props) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [record, setRecord] = useState<WorkoutPlanWeekRecord | null>(null);
  const [profile, setProfile] = useState<WorkoutProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profileLoadError, setProfileLoadError] = useState("");
  const [planLoadError, setPlanLoadError] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey(new Date()));
  const [confirmComplete, setConfirmComplete] = useState(false);
  const today = getLocalDateKey(new Date());
  const weekKey = getLocalDateKey(weekStart);
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const selectedDay = record?.days.find(day => day.date === selectedDate) ?? null;
  const profileComplete = profile ? isPlanProfileComplete(profile) : false;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setProfileLoadError("");
    setPlanLoadError("");
    setProfileLoaded(false);
    setPlanLoaded(false);
    setNotice("");

    const [fitnessResult, onboardingResult, planResult] = await Promise.allSettled([
      getFitnessProfile(session),
      getFitnessOnboardingAnswers(session),
      getWorkoutPlanWeek(session, weekKey),
    ]);

    if (fitnessResult.status === "fulfilled") {
      const answers = onboardingResult.status === "fulfilled" ? onboardingResult.value?.answers ?? null : null;
      setProfile(buildProfile(fitnessResult.value, answers));
      setProfileLoaded(true);
      if (onboardingResult.status === "rejected") {
        // The required planning fields live in fitness_profiles; onboarding adds
        // optional personalization and must not turn a valid profile into "incomplete".
        setNotice("Perfil carregado. Algumas preferências opcionais não puderam ser carregadas.");
      }
    } else {
      setProfile(null);
      setProfileLoadError(fitnessResult.reason instanceof Error
        ? fitnessResult.reason.message
        : "Não foi possível carregar seu perfil fitness.");
    }

    if (planResult.status === "fulfilled") {
      setRecord(planResult.value);
      setPlanLoaded(true);
    } else {
      setRecord(null);
      setPlanLoadError(planResult.reason instanceof Error
        ? planResult.reason.message
        : "Não foi possível consultar o plano semanal.");
    }

    setLoading(false);
  }, [session, weekKey]);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (!profile || !profileComplete || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const plan = generateWeeklyWorkoutPlan(profile, weekStart);
      const saved = await saveWorkoutPlanWeek(session, {
        week_start: plan.weekStart,
        profile_snapshot: plan.profileSnapshot,
        days: plan.days,
        generation_version: 1,
      });
      setRecord(saved);
      setNotice("Seu plano individual foi salvo para esta semana.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o plano. Tente novamente.");
    } finally { setBusy(false); }
  };

  const completeSelectedDay = async () => {
    if (!record || !selectedDay || selectedDay.status !== "planned" || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await completeWorkoutPlanDay(session, record.id, selectedDay.date);
      const saved = await getWorkoutPlanWeek(session, weekKey);
      setRecord(saved);
      setConfirmComplete(false);
      setNotice("Treino concluído e registrado no seu histórico.");
      onCompleted?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a conclusão.");
    } finally { setBusy(false); }
  };

  const changeWeek = (delta: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
    setSelectedDate(getLocalDateKey(next));
    setConfirmComplete(false);
  };

  return <section className="fit-page-section workout-plan-page">
    <div className="section-kicker"><span/> PLANEJAMENTO INDIVIDUAL</div>
    <h1>Seu treino, <span>do seu jeito.</span></h1>
    <p className="fit-page-intro">Um plano baseado nas respostas disponíveis do seu perfil e nos exercícios cadastrados na biblioteca Vibra.</p>
    <div className="wp-weekbar">
      <button type="button" className="fit-avatar-cancel" onClick={() => changeWeek(-1)} aria-label="Semana anterior">←</button>
      <div><strong>{labelDate(weekKey)} — {labelDate(getLocalDateKey(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)))}</strong><small>Semana salva por conta autenticada</small></div>
      <button type="button" className="fit-avatar-cancel" onClick={() => changeWeek(1)} aria-label="Próxima semana">→</button>
    </div>
    {error && <div className="wp-alert" role="alert"><AlertCircle size={18}/><span>{error}</span><button type="button" onClick={() => void load()}>Tentar novamente</button></div>}
    {profileLoadError && <div className="wp-alert" role="alert"><AlertCircle size={18}/><span>Erro ao carregar o perfil fitness: {profileLoadError}</span><button type="button" onClick={() => void load()}>Tentar novamente</button></div>}
    {planLoadError && <div className="wp-alert" role="alert"><AlertCircle size={18}/><span>Erro ao carregar o plano semanal: {planLoadError}. A existência do perfil não é afetada por esse erro.</span><button type="button" onClick={() => void load()}>Tentar novamente</button></div>}
    {notice && <p className="wp-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}
    {loading ? <div className="panel wp-loading"><LoaderCircle className="wp-spin"/><span>Carregando seu perfil e plano salvo…</span></div> : profileLoadError ? <div className="panel wp-empty">
      <AlertCircle size={28}/><h2>Não foi possível validar seu perfil</h2><p>Ocorreu um erro ao consultar os dados salvos. Não vamos tratar uma falha de consulta como se seu perfil estivesse incompleto.</p>
    </div> : !profileLoaded || !profile ? <div className="panel wp-empty">
      <AlertCircle size={28}/><h2>Perfil fitness ainda não encontrado</h2><p>Não encontramos um perfil fitness associado à conta autenticada. Verifique a conta e tente carregar novamente antes de preencher informações.</p><button type="button" className="fit-avatar-cancel" onClick={() => void load()}>Recarregar perfil</button>
    </div> : !profileComplete ? <div className="panel wp-empty">
      <AlertCircle size={28}/><h2>Precisamos completar seu perfil</h2>
      <p>Para montar um plano compatível, informe pelo menos objetivo, nível de experiência, frequência semanal e local de treino na página Meu perfil. Não vamos presumir essas respostas.</p>
    </div> : planLoadError ? <div className="panel wp-empty">
      <AlertCircle size={28}/><h2>Seu perfil está carregado, mas o plano não pôde ser consultado</h2><p>Corrija a disponibilidade da tabela do planejamento no banco conectado e tente novamente. Nenhum dado do perfil será solicitado novamente.</p>
    </div> : !planLoaded ? <div className="panel wp-loading"><LoaderCircle className="wp-spin"/><span>Consultando seu plano semanal…</span></div> : !record ? <div className="panel wp-empty">
      <Sparkles size={28}/><h2>Seu plano ainda não foi criado</h2><p>Gere uma semana para salvar um planejamento individual. A geração não será repetida automaticamente ao abrir esta página.</p>
      {profile?.physicalLimitations?.trim() && <p className="wp-caution">Você informou limitações físicas. O sistema não consegue interpretá-las clinicamente; o planejamento será limitado a exercícios de mobilidade/alongamento e recomendamos validar as escolhas com um profissional qualificado.</p>}
      <button className="green-button" type="button" onClick={() => void generate()} disabled={busy || Boolean(profile?.physicalLimitations?.trim())}>{busy ? <LoaderCircle className="wp-spin"/> : <Sparkles size={17}/>} {profile?.physicalLimitations?.trim() ? "Confirme as limitações com um profissional" : "Gerar meu plano semanal"}</button>
    </div> : <>
      <div className="wp-days" aria-label="Dias da semana">{dates.map(date => { const key = getLocalDateKey(date); const day = record.days.find(item => item.date === key); const active = selectedDate === key; return <button type="button" key={key} className={"wp-day"+(active ? " is-selected" : "")} onClick={() => { setSelectedDate(key); setConfirmComplete(false); }} aria-pressed={active}><small>{new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(date)}</small><strong>{date.getDate()}</strong><span>{day?.status === "rest" ? "Descanso" : day?.status === "completed" ? "Concluído" : "Treino"}</span></button>; })}</div>
      <div className="wp-content-grid">
        <article className="panel wp-session">
          {!selectedDay || selectedDay.status === "rest" ? <div className="wp-empty"><Moon size={30}/><h2>Dia de descanso</h2><p>Recuperação também faz parte do planejamento. Não há treino prescrito para esta data.</p></div> : <>
            <div className="wp-session-heading"><div><div className="section-kicker">{selectedDate === today ? "TREINO DE HOJE" : "SESSÃO PROGRAMADA"}</div><h2>{selectedDay.title}</h2><p>{selectedDay.muscleGroups.join(" · ")}</p></div><span className="wp-duration"><Clock3 size={16}/>{Math.round(selectedDay.estimatedMinutes)} min</span></div>
            <div className="wp-exercises">{selectedDay.exercises.map((exercise, index) => <div className="wp-exercise" key={exercise.exerciseId}><div className="wp-exercise-num">{index+1}</div><div className="wp-exercise-body"><h3>{exercise.name}</h3><p>{exercise.primaryMuscle} · {exercise.equipment}</p><div className="wp-params"><span>{exercise.sets} séries</span><span>{exercise.reps} reps</span><span>{exercise.restSeconds}s descanso</span></div><details><summary>Como fazer</summary><ol>{exercise.instructions.map((instruction, i) => <li key={i}>{instruction}</li>)}</ol></details></div></div>)}</div>
            {selectedDay.status === "completed" ? <p className="wp-success"><CheckCircle2 size={17}/> Sessão marcada como concluída.</p> : <div className="wp-complete-box"><p>Concluir registra apenas a realização declarada; não aumenta cargas nem inventa séries realizadas.</p>{!confirmComplete ? <button className="green-button" type="button" onClick={() => setConfirmComplete(true)}>Concluir treino</button> : <div className="wp-confirm"><strong>Você terminou esta sessão?</strong><button type="button" className="green-button" onClick={() => void completeSelectedDay()} disabled={busy}>Confirmar conclusão</button><button type="button" className="fit-avatar-cancel" onClick={() => setConfirmComplete(false)}>Cancelar</button></div>}</div>}
          </>}
        </article>
        <aside className="panel wp-summary"><div className="section-kicker">SEU PLANO</div><h3>Resumo da semana</h3><div className="wp-summary-stat"><Dumbbell size={18}/><span>{record.days.filter(day => day.status === "planned" || day.status === "completed").length} sessões planejadas</span></div><div className="wp-summary-stat"><Moon size={18}/><span>{record.days.filter(day => day.status === "rest").length} dias de descanso</span></div><p>Gerado em {new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(record.created_at))}.</p><button type="button" className="fit-avatar-cancel" onClick={() => void load()}><RefreshCw size={15}/> Atualizar</button></aside>
      </div>
    </>}
  </section>;
}
