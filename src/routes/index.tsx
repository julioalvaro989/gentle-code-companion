import { createFileRoute } from "@tanstack/react-router";
import { ExerciseLibrary } from "../components/ExerciseLibrary";
import { ExerciseDemoModal } from "../components/ExerciseDemoModal";
import { PublicLanding } from "../components/PublicLanding";
import "../components/AuthPage.css";
import { VibraChat } from "../components/VibraChat";
import { Button } from "../components/ui/button";
import { useEffect, useState, type FormEvent, type CSSProperties } from "react";
import { adoptSupabaseSession, getFitnessProfile, getFitnessProgress, getVibraAccess, requestPasswordReset, resendSignupConfirmation, saveFitnessProfile, saveFitnessProgress, signIn, signInWithGoogle, signOut, signUp, type AuthSession } from "../lib/supabase";
import { isVibraPlanId, VIBRA_PLANS, VIBRA_SELECTED_PLAN_KEY, type VibraPlanId } from "../lib/plans";
import { useLocalToday } from "../lib/date-utils";
const vibraLogoUrl = "/vibra-logo-horizontal.svg";
import { Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronRight, CirclePlay, Clock3, Dumbbell, Eye, EyeOff, Flame, HeartPulse, Home, Leaf, Menu, Search, Settings, Sparkles, Target, TrendingUp, Trophy, UserRound, Utensils, Video, X, Apple, MessageCircle, Play, Plus, BookOpen } from "lucide-react";

const publicSiteUrl = import.meta.env['VITE_PUBLIC_SITE_URL']?.replace(/\/$/, "");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vibra | Fitness com inteligência artificial para sua rotina" },
      { name: "description", content: "Organize treinos, hábitos e objetivos com o Vibra. Consulte exercícios, acompanhe seus registros e converse com a Vibra AI dentro da sua conta." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "Vibra" },
      { property: "og:title", content: "Vibra | Seu próximo nível começa com inteligência" },
      { property: "og:description", content: "Treinos, hábitos e acompanhamento da rotina em um só lugar, com a Vibra AI como apoio." },
      { property: "og:type", content: "website" },
      ...(publicSiteUrl ? [{ property: "og:url", content: publicSiteUrl }, { name: "twitter:url", content: publicSiteUrl }] : []),
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Vibra | Seu próximo nível começa com inteligência" },
      { name: "twitter:description", content: "Organize treinos, hábitos e objetivos com a Vibra." },
    ],
    links: publicSiteUrl ? [{ rel: "canonical", href: publicSiteUrl }] : [],
  }),
  component: GymApp,
});

const authInputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #29233F", borderRadius: 14, background: "#0B0C16", color: "#F8F9FF", padding: "15px 16px", outline: "none", fontSize: 14 };

const navItems = [
  { name: "Visão geral", icon: Home },
  { name: "Treinos", icon: Dumbbell },
  { name: "IA Fitness", icon: Sparkles },
  { name: "Progresso", icon: TrendingUp },
  { name: "Nutrição", icon: Leaf },
  { name: "Comunidade", icon: MessageCircle },
  { name: "Biblioteca de Exercícios", icon: BookOpen },
  { name: "Especialistas", icon: HeartPulse },
  { name: "Meu perfil", icon: UserRound },
];
// A biblioteca contém exercícios de referência, mas ainda não existe um plano
// individual agendado nem registros alimentares estruturados no backend.
const exercises: Array<{ id: string; name: string; detail: string; time: string }> = [];
const meals: Array<{ time: string; meal: string; food: string; kcal: string }> = [];

function GymApp() {
  const localToday = useLocalToday();
  const formattedToday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(localToday);
  const dateLabel = formattedToday.charAt(0).toLocaleUpperCase("pt-BR") + formattedToday.slice(1);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<VibraPlanId | null>(null);
  const [profileName, setProfileName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [activeNav, setActiveNav] = useState("Visão geral");
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [started, setStarted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [demoExercise, setDemoExercise] = useState<{id:string;name:string} | null>(null);
  const [goal, setGoal] = useState("");
  const [water, setWater] = useState(0);
  const filtered = exercises.filter(x => x.name.toLowerCase().includes(query.toLowerCase()));
  const changePage = (page: string) => {
    setActiveNav((current) => {
      if (current !== page) setNavHistory((history) => [...history, current]);
      return page;
    });
    setMobileMenu(false);
  };
  const goBack = () => {
    setNavHistory((history) => {
      if (history.length === 0) {
        setActiveNav("Visão geral");
        return [];
      }
      const previous = history[history.length - 1];
      if (previous) setActiveNav(previous);
      return history.slice(0, -1);
    });
    setMobileMenu(false);
  };
  const closePage = () => {
    setActiveNav("Visão geral");
    setNavHistory([]);
    setMobileMenu(false);
  };
  const progress = exercises.length ? Math.round(done.length / exercises.length * 100) : 0;
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";
  const calendarDays = Array.from({ length: new Date(localToday.getFullYear(), localToday.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);
  const calendarOffset = new Date(localToday.getFullYear(), localToday.getMonth(), 1).getDay();
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(localToday);

  useEffect(() => {
    let forceLoginForm = false;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      // A return-to-public-landing navigation must not be redirected back to
      // checkout merely because this browser still has a pending session.
      if (params.get("public") === "1") {
        setAuthReady(true);
        setAccessReady(true);
        return;
      }
      const requestedAuth = params.get("auth");
      forceLoginForm = requestedAuth === "login";
      if (requestedAuth === "login" || requestedAuth === "signup") {
        setAuthMode(requestedAuth);
        setShowAuth(true);
        setAuthError("");
        setAuthMessage("");
      }
      const fromUrl = params.get("plan");
      let fromStorage: string | null = null;
      try { fromStorage = window.localStorage.getItem(VIBRA_SELECTED_PLAN_KEY); } catch { /* URL parameter remains available. */ }
      const chosen = isVibraPlanId(fromUrl) ? fromUrl : isVibraPlanId(fromStorage) ? fromStorage : null;
      if (chosen) {
        setSelectedPlan(chosen);
        try { window.localStorage.setItem(VIBRA_SELECTED_PLAN_KEY, chosen); } catch { /* Selection remains in component state. */ }
      }
    }
    let active = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!active) return;
        // When the visitor explicitly chooses “Já tenho conta”, keep the
        // email/password form visible even if this browser has a stale saved
        // session. Otherwise the automatic subscription check can redirect to
        // /plans before the user gets a chance to sign in with the intended account.
        if (current && forceLoginForm) {
          setProgressHydrated(false);
          setAccessReady(true);
          return;
        }
        if (current) {
          setSession(current);
          const name = current.user.user_metadata?.full_name || current.user.email?.split("@")[0] || "Aluno Vibra";
          setProfileName(name);
          // Resolve backend authorization first. Admin sessions must be registered
          // before RLS-protected profile/progress reads are attempted.
          let access: Awaited<ReturnType<typeof getVibraAccess>>;
          try {
            access = await getVibraAccess(current);
            setAccessError("");
          } catch (error) {
            // Log technical diagnostics without session tokens, user email, or credentials.
            console.error("[Vibra access] initial authorization failed", {
              errorName: error instanceof Error ? error.name : "UnknownError",
              message: error instanceof Error ? error.message : String(error),
              userId: current.user.id,
              stage: "getVibraAccess",
              timestamp: new Date().toISOString(),
            });
            setAccessError("Não foi possível confirmar suas permissões agora. Verifique a conexão e tente validar novamente.");
            setAccessReady(true);
            return;
          }
          const profile = await getFitnessProfile(current).catch(() => null);
          if (profile?.username) setProfileName(profile.username);
          if (profile?.goal) setGoal(profile.goal);
          const saved = await getFitnessProgress(current).catch(() => null);
          if (saved) {
            setDone(saved.completed_exercises || []);
            setWater(saved.water_glasses ?? 0);
            setGoal(saved.goal || profile?.goal || "");
          }
          const params = new URLSearchParams(window.location.search);
          const fromUrl = params.get("plan");
          let fromStorage: string | null = null;
          try { fromStorage = window.localStorage.getItem(VIBRA_SELECTED_PLAN_KEY); } catch { /* Ignore unavailable storage. */ }
          const chosenPlan = isVibraPlanId(fromUrl) ? fromUrl : isVibraPlanId(fromStorage) ? fromStorage : null;
          if (access.adminSessionLimit) {
            setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente.");
            setAccessReady(true);
            return;
          }
          if (access.status !== "active") {
            const nextPlan = access.planId || chosenPlan;
            window.location.replace(access.status === "pending" || nextPlan ? "/checkout" + (nextPlan ? "?plan=" + nextPlan : "") : "/plans");
            return;
          }
          if (!access.profileCompleted) {
            window.location.replace("/fitness-profile");
            return;
          }
          setProgressHydrated(true);
          setAccessReady(true);
        } else {
          setProgressHydrated(false);
          setAccessReady(true);
        }
      } catch { setSession(null); setProgressHydrated(false); setAccessReady(true); }
      finally { if (active) setAuthReady(true); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session || !progressHydrated) return;
    const timer = window.setTimeout(() => {
      saveFitnessProgress(session, { completed_exercises: done, water_glasses: water, goal }).catch(() => {});
      if (goal.trim()) saveFitnessProfile(session, { username: profileName || "Aluno Vibra", email: session.user.email || "", goal }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [session, progressHydrated, done, water, goal, profileName]);

  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setAuthError(""); setAuthMessage("");
    setAuthBusy(true);
    try {
      let next: AuthSession | null;
      if (authMode === "signup") {
        next = await signUp(authUsername.trim(), authEmail.trim(), authPassword);
        if (!next) {
          setAuthMessage("A conta foi recebida, mas o provedor de autenticação não retornou uma sessão. Para entrar sem confirmação por e-mail, desative “Confirm email” nas configurações de autenticação do projeto e tente novamente.");
          return;
        }
        setProfileName(authUsername.trim());
      } else {
        next = await signIn(authEmail.trim(), authPassword);
        setProfileName(next.user.user_metadata?.full_name || next.user.email?.split("@")[0] || "Aluno Vibra");
        const p = await getFitnessProfile(next).catch(() => null);
        if (p?.username) setProfileName(p.username);
      }
      setSession(next); setProgressHydrated(false);
      const saved = await getFitnessProgress(next).catch(() => null);
      if (saved) { setDone(saved.completed_exercises || []); setWater(saved.water_glasses || 0); setGoal(saved.goal || "Ganhar massa muscular"); }
      setProgressHydrated(true);
      const access = await getVibraAccess(next);
      setAccessReady(true);
      if (access.adminSessionLimit) {
        setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente.");
        setAccessReady(true);
        return;
      }
      if (access.status === "active") {
        window.location.assign(access.profileCompleted ? "/" : "/fitness-profile");
      } else {
        const nextPlan = access.planId || selectedPlan;
        window.location.assign(access.status === "pending" || nextPlan ? "/checkout" + (nextPlan ? "?plan=" + nextPlan : "") : "/plans");
      }
    } catch (e) { setAccessReady(true); setAccessError(e instanceof Error ? e.message : "Não foi possível validar o acesso."); setAuthError(e instanceof Error ? e.message : "Não foi possível concluir o acesso."); }
    finally { setAuthBusy(false); }
  }

  async function submitPasswordRecovery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    const email = resetEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError("Informe um endereço de e-mail válido.");
      return;
    }
    setResetBusy(true);
    try {
      await requestPasswordReset(email);
      setAuthMessage("Se houver uma conta associada a esse e-mail, você receberá instruções para redefinir sua senha.");
    } catch {
      // Do not show provider details or disclose whether the address has an account.
      setAuthError("Não foi possível processar a solicitação agora. Tente novamente em alguns minutos.");
    } finally {
      setResetBusy(false);
    }
  }

  async function resendConfirmationEmail() {
    if (!authEmail.trim()) {
      setAuthError("Informe o e-mail usado no cadastro para reenviar a confirmação.");
      return;
    }
    setAuthError("");
    setResendBusy(true);
    try {
      await resendSignupConfirmation(authEmail.trim());
      setAuthMessage("Solicitação enviada. Confira a caixa de entrada e o spam; se a mensagem não chegar, aguarde alguns minutos antes de tentar novamente.");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Não foi possível reenviar o e-mail. Confira o endereço e tente novamente.");
    } finally {
      setResendBusy(false);
    }
  }

  async function googleAuth() {
    setAuthError(""); setAuthMessage(""); setAuthBusy(true);
    try {
      const next = await signInWithGoogle();
      if (next) {
        setSession(next);
        const name = next.user.user_metadata?.full_name || next.user.email?.split("@")[0] || "Aluno Vibra";
        setProfileName(name);
        const saved = await getFitnessProgress(next).catch(() => null);
        if (saved) { setDone(saved.completed_exercises || []); setWater(saved.water_glasses || 0); setGoal(saved.goal || "Ganhar massa muscular"); }
        setProgressHydrated(true);
        const access = await getVibraAccess(next);
        setAccessReady(true);
        if (access.adminSessionLimit) {
          setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente.");
          setAccessReady(true);
          return;
        }
        if (access.status === "active") window.location.assign(access.profileCompleted ? "/" : "/fitness-profile");
        else {
          const nextPlan = access.planId || selectedPlan;
          window.location.assign(access.status === "pending" || nextPlan ? "/checkout" + (nextPlan ? "?plan=" + nextPlan : "") : "/plans");
        }
      }
    } catch (e) { setAccessReady(true); setAccessError(e instanceof Error ? e.message : "Não foi possível validar o acesso."); setAuthError(e instanceof Error ? e.message : "Não foi possível entrar com Google."); }
    finally { setAuthBusy(false); }
  }

  if (!authReady || (session && !accessReady && !accessError)) return <div style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",color:"white"}}>Carregando seu espaço Vibra...</div>;
  if (session && accessError) return <main role="alert" style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",padding:24,color:"white"}}><section style={{maxWidth:480,textAlign:"center"}}><h1>{accessError.startsWith("As três sessões") ? "Limite de sessões administrativas" : "Não foi possível validar o acesso"}</h1><p>{accessError}</p><button type="button" disabled={authBusy} onClick={async () => {
    setAuthBusy(true); setAccessError(""); setAccessReady(false);
    try {
      const current = await adoptSupabaseSession();
      if (!current) { setSession(null); setAuthMode("login"); setShowAuth(true); setAuthError("Sua sessão expirou. Entre novamente."); return; }
      setSession(current);
      const access = await getVibraAccess(current);
      if (access.adminSessionLimit) { setAccessError("As três sessões administrativas permitidas já estão em uso. Encerre uma sessão anterior e tente novamente."); return; }
      if (access.status === "active") { window.location.assign(access.profileCompleted ? "/" : "/fitness-profile"); return; }
      const params = new URLSearchParams(window.location.search);
      const storedPlan = (() => { try { return window.localStorage.getItem(VIBRA_SELECTED_PLAN_KEY); } catch { return null; } })();
      const candidate = isVibraPlanId(params.get("plan")) ? params.get("plan") : isVibraPlanId(storedPlan) ? storedPlan : null;
      window.location.assign(access.status === "pending" || access.planId || candidate ? "/checkout" + ((access.planId || candidate) ? "?plan=" + (access.planId || candidate) : "") : "/plans");
    } catch (error) {
      console.error("[Vibra access] manual retry failed", { errorName: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : String(error), userId: session.user.id, stage: "retryAuthorization", timestamp: new Date().toISOString() });
      setAccessError("A validação continua indisponível. Tente novamente em instantes; se persistir, a equipe técnica deve verificar os logs do Supabase.");
    } finally { setAuthBusy(false); setAccessReady(true); }
  }} style={{padding:"12px 18px",borderRadius:12,cursor:authBusy ? "wait" : "pointer",opacity:authBusy ? 0.65 : 1}}>{authBusy ? "Validando acesso…" : "Tentar novamente"}</button></section></main>;
  const publicLandingRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("public") === "1";
  if (publicLandingRequested) return <PublicLanding onAuth={(mode) => window.location.assign("/?auth=" + mode)} onPlans={() => window.location.assign("/plans")} />;
  if (!session && !showAuth) return <PublicLanding onAuth={(mode) => { setAuthMode(mode); setAuthError(""); setAuthMessage(""); setShowAuth(true); window.scrollTo({ top: 0, behavior: "instant" }); }} onPlans={() => window.location.assign("/plans")} />;
  if (!session) return <div className="vibra-auth-page">
    <div className="va-background va-background-purple" aria-hidden="true" />
    <div className="va-background va-background-lime" aria-hidden="true" />
    <main className="va-layout">
      <section className="va-story" aria-label="Sobre o Vibra">
        <button type="button" className="va-back" onClick={() => { setShowAuth(false); setAuthError(""); setAuthMessage(""); }}>
          <ArrowLeft size={16} /> Voltar ao início
        </button>
        <div className="va-brand"><img className="va-brand-logo va-brand-logo-lg" src={vibraLogoUrl} alt="Vibra — Fitness com IA" /></div>
        <div className="va-story-copy">
          <div className="va-eyebrow"><Sparkles size={14} /> SEU ESPAÇO DE EVOLUÇÃO</div>
          <h1>Seu ritmo.<br />Sua jornada.<br /><span>Seu próximo nível.</span></h1>
          <p>Treinos, hábitos e evolução em um só lugar. Continue construindo uma rotina que faz sentido para você.</p>
        </div>
        <div className="va-story-footer"><span><Dumbbell size={16}/> TREINO</span><i /><span><Target size={16}/> FOCO</span><i /><span><TrendingUp size={16}/> EVOLUÇÃO</span></div>
      </section>
      <section className="va-auth-panel" aria-labelledby="va-title">
        <div className="va-panel-top"><span className="va-mobile-brand"><img className="va-brand-logo" src={vibraLogoUrl} alt="Vibra — Fitness com IA" /></span><span className="va-secure"><span /> ACESSO À SUA CONTA</span></div>
        <div className="va-form-heading">
          <div className="va-form-eyebrow">{showForgotPassword ? "RECUPERAÇÃO DE ACESSO" : authMode === "signup" ? "COMECE POR AQUI" : "BEM-VINDO DE VOLTA"}</div>
          <h2 id="va-title">{showForgotPassword ? <>Recupere sua <span>conta.</span></> : authMode === "signup" ? <>Comece sua <span>evolução.</span></> : <>Bom ter você <span>de volta.</span></>}</h2>
          <p>{showForgotPassword ? "Informe seu e-mail para receber as instruções de redefinição de senha." : authMode === "signup" ? "Crie sua conta e organize os próximos passos da sua jornada." : "Entre para continuar de onde você parou."}</p>
          {authMode === "signup" && selectedPlan && <div className="va-message va-success">Plano selecionado: <strong>{VIBRA_PLANS[selectedPlan].name} · {VIBRA_PLANS[selectedPlan].priceLabel}/mês</strong>. A cobrança só libera o acesso após confirmação real.</div> }
        </div>
        <form className="va-form" onSubmit={showForgotPassword ? submitPasswordRecovery : submitAuth}>
          {showForgotPassword ? <>
            <label>E-mail cadastrado<input required type="email" autoComplete="email" placeholder="voce@exemplo.com" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} /></label>
            {authError && <div role="alert" className="va-message va-error">{authError}</div>}
            {authMessage && <div role="status" className="va-message va-success">{authMessage}</div>}
            <button disabled={resetBusy} type="submit" className="va-submit">{resetBusy ? <><span className="va-spinner" /> Enviando...</> : <>Enviar instruções <ArrowRight size={17}/></>}</button>
            <button type="button" className="va-back-link" onClick={()=>{setShowForgotPassword(false);setAuthError("");setAuthMessage("");}}>Voltar para o login</button>
          </> : <>
            {authMode === "signup" && <label>Nome de usuário<input required minLength={2} autoComplete="username" placeholder="Como podemos chamar você?" value={authUsername} onChange={e=>setAuthUsername(e.target.value)} /></label>}
            <label>E-mail<input required type="email" autoComplete="email" placeholder="voce@exemplo.com" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} /></label>
            <label>Senha<div className="va-password-field"><input required minLength={6} type={showPassword ? "text" : "password"} autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="Mínimo de 6 caracteres" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} /><button type="button" className="va-password-toggle" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>
            {authMode === "login" && <div className="va-forgot-row"><button type="button" onClick={()=>{setResetEmail(authEmail);setShowForgotPassword(true);setAuthError("");setAuthMessage("");}}>Esqueci minha senha?</button></div>}
            {authError && <div role="alert" className="va-message va-error">{authError}</div>}
            {authMessage && <div role="status" className="va-message va-success">{authMessage}</div>}
            {authMessage && authMode === "signup" && <button type="button" className="va-resend" onClick={resendConfirmationEmail} disabled={resendBusy || authBusy}>{resendBusy ? "Reenviando..." : "Reenviar e-mail de confirmação"}</button>}
            <button disabled={authBusy} type="submit" className="va-submit">{authBusy ? <><span className="va-spinner" /> Aguarde...</> : authMode === "signup" ? <>Criar minha conta <ArrowRight size={17}/></> : <>Entrar na Vibra <ArrowRight size={17}/></>}</button>
          </>}
        </form>
        {!showForgotPassword && <>
          <div className="va-divider"><span/>ou continue com<span/></div>
          <button type="button" className="va-google" onClick={googleAuth} disabled={authBusy}><span className="va-google-g">G</span> Continuar com Google</button>
          <p className="va-switch">{authMode === "signup" ? "Já tem uma conta?" : "Ainda não tem conta?"}<button type="button" onClick={()=>{setAuthMode(authMode==="signup"?"login":"signup");setAuthError("");setAuthMessage("");setShowPassword(false);}}> {authMode === "signup" ? "Entrar" : "Criar conta"}</button></p>
          <p className="va-disclaimer">Ao continuar, você concorda em usar a Vibra de forma responsável.</p>
        </>}
      </section>
    </main>
  </div>;

  if (!accessReady) return <div style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",color:"white"}}>Verificando pagamento e acesso...</div>;

  return <div className="gym-app fit-app">
    <VibraChat />
    <>{mobileMenu && <button type="button" className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}<aside className={"sidebar " + (mobileMenu ? "sidebar-open" : "")}>
      <a className="gym-logo" href="#inicio" aria-label="Vibra, início" onClick={() => changePage("Visão geral")}><img className="gym-logo-img" src={vibraLogoUrl} alt="Vibra — Fitness com IA" /></a><button type="button" className="sidebar-close" aria-label="Fechar menu lateral" onClick={() => setMobileMenu(false)}><X size={20}/></button>
      <div className="side-label">SEU ESPAÇO</div>
      <nav className="side-nav">{navItems.map(({name,icon:Icon})=><button key={name} className={"nav-item "+(activeNav===name?"active":"")} onClick={()=>changePage(name)}><Icon size={18}/>{name}</button>)}</nav>
      <div className="sidebar-bottom"><div className="coach-card"><div className="coach-icon"><HeartPulse size={20}/></div><strong>Seu próximo nível.</strong><p>Consistência hoje. Resultados amanhã.</p><button onClick={()=>changePage("Especialistas")}>Falar com especialista <ChevronRight size={15}/></button></div><button className="nav-item settings-item" onClick={()=>changePage("Configurações")}><Settings size={18}/> Configurações</button><div className="user-mini"><div className="avatar">{(profileName || "V").slice(0,2).toUpperCase()}</div><div><strong>{profileName || "Aluno Vibra"}</strong><small>Área do aluno</small></div><button aria-label="Abrir perfil" onClick={()=>changePage("Meu perfil")}><ChevronRight size={17}/></button></div></div>
    </aside></>
    <main className="main-content" id="inicio">
      <header className="topbar"><button className="fit-mobile-menu icon-button" aria-label="Abrir menu" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="mobile-brand"><img className="mobile-brand-logo" src={vibraLogoUrl} alt="Vibra" /></div><div className="breadcrumb">Meu espaço <ChevronRight size={14}/><strong>{activeNav}</strong></div><div className="top-actions"><div className="date-chip"><CalendarDays size={16}/> {dateLabel}</div><button className="icon-button" aria-label="Notificações"><Bell size={18}/><i/></button><button className="avatar top-avatar" title="Sair da conta" onClick={async()=>{try { await signOut(); } catch { setAuthError("Não foi possível confirmar o logout remoto. A sessão local pode ter sido encerrada; confira o acesso antes de continuar."); } finally { setSession(null); setProgressHydrated(false); setAuthMode("login"); }}}>{(profileName||"V").slice(0,2).toUpperCase()}</button></div></header>
      <div className="page-wrap">
        {activeNav !== "Visão geral" && <div className="fit-page-actions"><button className="outline-button fit-back-button" onClick={goBack} aria-label="Voltar para a tela anterior"><ArrowLeft size={17}/> Voltar</button><button type="button" className="outline-button fit-close-page" onClick={closePage} aria-label="Fechar esta página e voltar à visão geral"><X size={17}/><span>Fechar</span></button></div>}
        {activeNav==="Visão geral" && <>
          <section className="welcome-row"><div><div className="section-kicker"><span/> SUA JORNADA COMEÇA AQUI</div><h1>{greeting}, <span>{profileName || "bem-vindo à Vibra"}.</span></h1><p>{dateLabel}. Um passo de cada vez — acompanhe sua jornada com dados reais.</p></div><button className="outline-button" onClick={()=>changePage("Progresso")}><Activity size={17}/> Minha evolução</button></section>
          <section className="fit-hero">
            <video className="fit-hero-video" autoPlay muted loop playsInline preload="metadata" poster="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1600"><source src="https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4" type="video/mp4"/></video>
            <div className="fit-hero-shade"/>
            <div className="fit-float fit-float-one"><span className="fit-float-icon"><Sparkles size={17}/></span><div><b>Seu próximo passo</b><small>feito no seu ritmo</small></div></div>
            <div className="fit-float fit-float-two"><span className="fit-pulse"/><div><b>Vibra</b><small>Treino, hábitos e evolução</small></div></div>
            <div className="hero-copy fit-hero-copy"><div className="hero-pill"><Dumbbell size={14}/> SUA ROTINA FITNESS</div><h2>Construa sua<br/><span>evolução.</span></h2><p>Consulte sua biblioteca, registre seus hábitos e personalize seu perfil para preparar uma rotina que combine com você.</p><div className="hero-meta"><span><BookOpen size={16}/> Biblioteca de exercícios</span><span><Sparkles size={16}/> Vibra AI</span></div><button className="green-button" onClick={()=>changePage("Treinos")}><CirclePlay size={18}/>Explorar treinos<ChevronRight size={17}/></button></div>
            <div className="fit-hero-caption"><Sparkles size={14}/> SEU RITMO · SUA EVOLUÇÃO</div>
          </section>
          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>Exercícios registrados</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">{done.length}</div><div className="stat-bottom"><span>Registros disponíveis na conta</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Copos registrados</span><span className="stat-icon"><Apple size={18}/></span></div><div className="stat-value">{water}<small> / 8</small></div><div className="stat-bottom"><button className="fit-inline-action" onClick={()=>setWater(Math.min(8,water+1))}><Plus size={13}/> Registrar copo</button><span>meta configurável</span></div><div className="mini-progress"><i style={{width:(water/8*100)+"%"}}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Objetivo pessoal</span><span className="stat-icon"><Target size={18}/></span></div><div className="stat-value stat-value-text">{goal || "Não definido"}</div><div className="stat-bottom"><button className="fit-inline-action" onClick={()=>changePage("Meu perfil")}>Personalizar objetivo <ChevronRight size={13}/></button></div></article>
            <article className="stat-card"><div className="stat-top"><span>Histórico semanal</span><span className="stat-icon"><TrendingUp size={18}/></span></div><div className="stat-value stat-value-text">Sem dados</div><div className="stat-bottom"><span>O histórico por data ainda não está disponível</span></div></article>
          </section>
          <section className="lower-grid">
            <article className="panel workout-panel"><div className="panel-heading"><div><div className="section-kicker">SEU PLANEJAMENTO</div><h3>Treino de hoje</h3><p>O plano individual será exibido quando estiver configurado.</p></div><button className="text-button" onClick={()=>changePage("Treinos")}>Abrir treinos <ChevronRight size={15}/></button></div><div className="fit-empty-state"><Dumbbell size={25}/><strong>Nenhum treino programado</strong><p>Explore a biblioteca de exercícios ou complete seu perfil fitness para personalizar sua rotina.</p><button className="green-button" onClick={()=>changePage("Biblioteca de Exercícios")}>Explorar exercícios <ArrowRight size={16}/></button></div></article>
            <article className="panel nutrition-teaser"><div className="panel-heading"><div><div className="section-kicker">NUTRIÇÃO E HÁBITOS</div><h3>Registro alimentar</h3><p>Seus dados aparecerão aqui quando forem registrados.</p></div><span className="nutrition-icon"><Utensils size={19}/></span></div><div className="fit-empty-state fit-empty-state-compact"><Leaf size={23}/><strong>Sem registros alimentares</strong><p>Ainda não há refeições ou valores nutricionais salvos para exibir.</p></div><button className="start-bottom" onClick={()=>changePage("Nutrição")}>Abrir nutrição <ArrowRight size={17}/></button></article>
          </section>
          <section className="panel fit-calendar-panel"><div className="panel-heading"><div><div className="section-kicker">CALENDÁRIO</div><h3>Seu mês</h3><p>Dia atual em destaque; sem eventos de treino registrados.</p></div><span className="fit-calendar-month">{monthLabel}</span></div><div className="fit-calendar-grid">{["D","S","T","Q","Q","S","S"].map((day,index)=><span className="fit-calendar-weekday" key={index}>{day}</span>)}{Array.from({length:calendarOffset},(_,index)=><span className="fit-calendar-blank" key={"blank-"+index}/>)}{calendarDays.map(day=><span key={day} className={"fit-calendar-day "+(day===localToday.getDate()?"is-today":"")}>{day}</span>)}</div></section>
          <section className="fit-specialist-strip"><div className="fit-specialist-icon"><HeartPulse size={24}/></div><div><span className="section-kicker">ACOMPANHAMENTO PROFISSIONAL</span><h3>Você não precisa fazer isso sozinho.</h3><p>Encontre orientação de nutricionistas e personal trainers cadastrados.</p></div><button className="green-button" onClick={()=>changePage("Especialistas")}>Conhecer especialistas <ArrowRight size={16}/></button></section>
        </>}
        {activeNav==="Treinos" && <section className="fit-page-section"><div className="section-kicker"><span/> PLANEJAMENTO DE TREINO</div><h1>Treine no seu <span>ritmo.</span></h1><p className="fit-page-intro">Os treinos programados aparecerão aqui quando houver um plano associado à sua conta. Enquanto isso, explore o catálogo disponível.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><Dumbbell size={28}/><strong>Nenhum treino programado para hoje</strong><p>Não há um plano individual registrado para esta data. A biblioteca contém exercícios de referência, mas não será tratada como um treino prescrito.</p><button className="green-button" onClick={()=>changePage("Biblioteca de Exercícios")}><BookOpen size={17}/> Abrir biblioteca <ArrowRight size={16}/></button></div></div></section>}
        {activeNav==="Biblioteca de Exercícios" && <ExerciseLibrary />}
        <ExerciseDemoModal exerciseId={demoExercise?.id ?? null} {...(demoExercise ? { workoutName: demoExercise.name } : {})} onClose={()=>setDemoExercise(null)} />
        {activeNav==="Nutrição" && <section className="fit-page-section"><div className="section-kicker"><span/> NUTRIÇÃO E BEM-ESTAR</div><h1>Nutrição com <span>contexto.</span></h1><p className="fit-page-intro">Esta área pode reunir registros de refeições e preferências alimentares. Nenhum registro nutricional estruturado está disponível no momento.</p><div className="fit-nutrition-layout"><article className="panel fit-food-summary"><div className="section-kicker">HÁBITO DE HIDRATAÇÃO</div><div className="fit-big-number">{water} <small>copos registrados</small></div><div className="nutrition-bar"><i style={{width:(water/8*100)+"%"}}/></div><p className="fit-page-intro">Registro salvo na conta; a data de cada registro não está disponível para confirmar um resumo diário.</p><div className="fit-water-box"><div><Apple size={19}/><strong>Hidratação</strong><small>{water} de 8 copos registrados</small></div><button className="green-button" onClick={()=>setWater(Math.min(8,water+1))} disabled={water>=8}><Plus size={16}/> Adicionar copo</button></div></article><article className="panel"><div className="panel-heading"><div><div className="section-kicker">REGISTROS ALIMENTARES</div><h3>Refeições</h3></div><Utensils size={20}/></div><div className="fit-empty-state"><Leaf size={25}/><strong>Nenhuma refeição registrada</strong><p>Quando o registro alimentar estiver conectado, suas refeições e nutrientes aparecerão aqui.</p></div></article></div><div className="fit-note"><HeartPulse size={18}/> <span>Orientações clínicas e metas nutricionais individuais devem ser definidas por profissional qualificado.</span></div></section>}
        {activeNav==="Especialistas" && <section className="fit-page-section"><div className="section-kicker"><span/> ACOMPANHAMENTO PROFISSIONAL</div><h1>Orientação com <span>confiança.</span></h1><p className="fit-page-intro">O diretório de profissionais ainda não está conectado a uma fonte verificada de perfis e disponibilidade.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><HeartPulse size={28}/><strong>Profissionais ainda não disponíveis</strong><p>Quando houver cadastro verificado e agenda integrada, você poderá consultar perfis e solicitar acompanhamento por aqui.</p></div></div></section>}
        {activeNav==="Progresso" && <section className="fit-page-section"><div className="section-kicker"><span/> SUA EVOLUÇÃO</div><h1>Acompanhe seus <span>registros.</span></h1><p className="fit-page-intro">Só exibimos aqui os dados já salvos na sua conta. O backend atual não fornece histórico por data, duração das sessões ou metas semanais concluídas.</p><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Exercícios registrados</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">{done.length}</div><div className="stat-bottom"><span>Lista salva na conta</span></div></article><article className="stat-card"><div className="stat-top"><span>Hidratação registrada</span><span className="stat-icon"><Apple size={18}/></span></div><div className="stat-value">{water}<small> / 8 copos</small></div><div className="stat-bottom"><span>Sem data por registro</span></div></article><article className="stat-card"><div className="stat-top"><span>Tempo de treino</span><span className="stat-icon"><Clock3 size={18}/></span></div><div className="stat-value stat-value-text">Sem dados</div><div className="stat-bottom"><span>Não armazenado atualmente</span></div></article><article className="stat-card"><div className="stat-top"><span>Progresso semanal</span><span className="stat-icon"><Trophy size={18}/></span></div><div className="stat-value stat-value-text">Sem dados</div><div className="stat-bottom"><span>Não há histórico datado</span></div></article></div><div className="panel fit-goal-panel"><div><div className="section-kicker">SEU OBJETIVO ATUAL</div><h3>{goal || "Defina seu objetivo"}</h3><p>Escolha uma meta pessoal para personalizar sua experiência.</p></div><select value={goal} onChange={e=>setGoal(e.target.value)}><option value="">Selecione um objetivo</option><option value="Ganhar massa muscular">Ganhar massa muscular</option><option value="Perder gordura">Perder gordura</option><option value="Melhorar condicionamento">Melhorar condicionamento</option><option value="Ter mais saúde e energia">Ter mais saúde e energia</option></select></div></section>}
        {(activeNav==="Meu perfil"||activeNav==="Configurações") && <section className="fit-page-section"><div className="section-kicker"><span/> CONTA E PREFERÊNCIAS</div><h1>Seu espaço, <span>do seu jeito.</span></h1><p className="fit-page-intro">Gerencie suas preferências e o foco da sua jornada fitness.</p><div className="panel fit-profile-panel"><div className="fit-profile-avatar">{(profileName||"V").slice(0,2).toUpperCase()}</div><div className="fit-profile-info"><h3>{profileName || "Aluno Vibra"}</h3><p>{session.user.email || "Conta Vibra"}</p><label htmlFor="fit-goal">Meu objetivo principal</label><select id="fit-goal" value={goal} onChange={e=>setGoal(e.target.value)}><option value="">Selecione um objetivo</option><option value="Ganhar massa muscular">Ganhar massa muscular</option><option value="Perder gordura">Perder gordura</option><option value="Melhorar condicionamento">Melhorar condicionamento</option><option value="Ter mais saúde e energia">Ter mais saúde e energia</option></select><button type="button" className="green-button" style={{marginTop:12}} onClick={()=>window.location.assign("/fitness-profile")}>Editar perfil fitness <ArrowRight size={16}/></button></div></div><div className="fit-note"><Settings size={18}/><span>Seu perfil está conectado à sua conta. Seu progresso e suas preferências são salvos na nuvem.</span></div></section>}
        {activeNav==="IA Fitness" && <section className="fit-page-section"><div className="section-kicker"><span/> ASSISTENTE DE IA</div><h1>Conheça a <span>Vibra AI.</span></h1><p className="fit-page-intro">Use o assistente para dúvidas sobre exercícios, hábitos e sua rotina. O acesso e os limites continuam sendo validados pela conta e pelo plano.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><Sparkles size={28}/><strong>Seu assistente está no botão flutuante</strong><p>Abra a Vibra AI pelo atalho flutuante no canto da tela. Se o seu plano não incluir esse recurso, as permissões existentes continuarão sendo respeitadas.</p></div></div></section>}
        {activeNav==="Comunidade" && <section className="fit-page-section"><div className="section-kicker"><span/> COMUNIDADE VIBRA</div><h1>Evolução em <span>conjunto.</span></h1><p className="fit-page-intro">A área de comunidade ainda não está conectada a publicações, grupos ou interações reais.</p><div className="panel fit-empty-state-panel"><div className="fit-empty-state"><MessageCircle size={28}/><strong>Comunidade em preparação</strong><p>Quando os recursos sociais estiverem disponíveis, eles aparecerão aqui sem conteúdo ou atividades fictícias.</p></div></div></section>}
        <footer className="app-footer"><span>© 2026 VIBRA</span><span>Feito para sua evolução <span className="footer-heart">♥</span></span></footer>
      </div>
    </main>
    <nav className="fit-bottom-nav" aria-label="Navegação principal mobile">
      {[{name:"Visão geral",label:"Início",icon:Home},{name:"Treinos",label:"Treinos",icon:Dumbbell},{name:"IA Fitness",label:"IA",icon:Sparkles},{name:"Progresso",label:"Evolução",icon:TrendingUp},{name:"Meu perfil",label:"Perfil",icon:UserRound}].map(({name,label,icon:Icon})=><button type="button" key={name} className={activeNav===name?"active":""} onClick={()=>changePage(name)} aria-current={activeNav===name?"page":undefined}><Icon size={18}/><span>{label}</span></button>)}
    </nav>
    {showVideo&&<div className="modal-backdrop" onClick={()=>setShowVideo(false)}><section className="plan-modal fit-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Fechar" onClick={()=>setShowVideo(false)}><X size={20}/></button><div className="section-kicker">PRÓXIMOS PASSOS</div><h2>Acompanhamento profissional</h2><p className="modal-subtitle">Esta área está preparada para receber perfis verificados, horários disponíveis e contato seguro quando o serviço profissional for conectado.</p><div className="fit-modal-list"><span><Check size={16}/> Perfil e credenciais do profissional</span><span><Check size={16}/> Agenda e disponibilidade</span><span><Check size={16}/> Canal de contato protegido</span></div><button className="green-button modal-done" onClick={()=>setShowVideo(false)}>Entendi <Check size={17}/></button></section></div>}
  </div>;
}
