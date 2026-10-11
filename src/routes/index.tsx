import { createFileRoute } from "@tanstack/react-router";
import { ExerciseLibrary } from "../components/ExerciseLibrary";
import { ExerciseDemoModal } from "../components/ExerciseDemoModal";
import { PublicLanding } from "../components/PublicLanding";
import "../components/AuthPage.css";
import { VibraChat } from "../components/VibraChat";
import { Button } from "../components/ui/button";
import { useEffect, useState, type FormEvent, type CSSProperties } from "react";
import { adoptSupabaseSession, getFitnessProfile, getFitnessProgress, getVibraAccess, resendSignupConfirmation, saveFitnessProfile, saveFitnessProgress, signIn, signInWithGoogle, signOut, signUp, type AuthSession } from "../lib/supabase";
import { isVibraPlanId, VIBRA_PLANS, VIBRA_SELECTED_PLAN_KEY, type VibraPlanId } from "../lib/plans";
import { Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronRight, CirclePlay, Clock3, Dumbbell, Flame, HeartPulse, Home, Leaf, Menu, Search, Settings, Sparkles, Target, TrendingUp, Trophy, UserRound, Utensils, Video, X, Apple, MessageCircle, Play, Plus, BookOpen } from "lucide-react";

const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, "");

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
  { name: "Biblioteca de Exercícios", icon: BookOpen },
  { name: "Nutrição", icon: Leaf },
  { name: "Especialistas", icon: HeartPulse },
  { name: "Progresso", icon: Activity },
  { name: "Meu perfil", icon: UserRound },
];
const exercises = [
  { id: "agachamento-livre", name: "Agachamento livre", detail: "Pernas · 4 séries × 10 reps", time: "08 min" },
  { id: "supino-halteres", name: "Supino com halteres", detail: "Peitoral · 3 séries × 12 reps", time: "07 min" },
  { id: "remada-baixa", name: "Remada baixa", detail: "Costas · 3 séries × 12 reps", time: "06 min" },
  { id: "prancha", name: "Prancha abdominal", detail: "Core · 3 séries × 45 segundos", time: "04 min" },
];
const meals = [
  { time: "07:30", meal: "Café da manhã", food: "Ovos, pão integral e fruta", kcal: "420 kcal" },
  { time: "12:30", meal: "Almoço", food: "Frango, arroz, feijão e salada", kcal: "610 kcal" },
  { time: "16:00", meal: "Lanche", food: "Iogurte natural com aveia", kcal: "230 kcal" },
  { time: "20:00", meal: "Jantar", food: "Peixe, legumes e batata-doce", kcal: "480 kcal" },
];

function GymApp() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<VibraPlanId | null>(null);
  const [profileName, setProfileName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
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
  const [done, setDone] = useState<string[]>(["Supino com halteres"]);
  const [query, setQuery] = useState("");
  const [started, setStarted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [demoExercise, setDemoExercise] = useState<{id:string;name:string} | null>(null);
  const [goal, setGoal] = useState("Ganhar massa muscular");
  const [water, setWater] = useState(4);
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
  const progress = Math.round(done.length / exercises.length * 100);

  useEffect(() => {
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
      if (requestedAuth === "login" || requestedAuth === "signup") {
        setAuthMode(requestedAuth);
        setShowAuth(true);
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
          } catch {
            // Authorization unavailable is not proof that this user lacks a plan.
            // Keep the authenticated session and never redirect to plans on this path.
            setAccessError("Não foi possível confirmar suas permissões agora. Atualize a página para tentar novamente.");
            setAccessReady(true);
            return;
          }
          const profile = await getFitnessProfile(current).catch(() => null);
          if (profile?.username) setProfileName(profile.username);
          const saved = await getFitnessProgress(current).catch(() => null);
          if (saved) {
            setDone(saved.completed_exercises || []);
            setWater(saved.water_glasses ?? 0);
            setGoal(saved.goal || "Ganhar massa muscular");
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
      saveFitnessProfile(session, { username: profileName || "Aluno Vibra", email: session.user.email || "", goal }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [session, progressHydrated, done, water, goal, profileName]);

  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setAuthError(""); setAuthMessage("");
    if (authMode === "signup" && !selectedPlan) {
      window.location.assign("/plans");
      return;
    }
    setAuthBusy(true);
    try {
      let next: AuthSession | null;
      if (authMode === "signup") {
        next = await signUp(authUsername.trim(), authEmail.trim(), authPassword);
        if (!next) {
          setAuthMessage("Cadastro recebido! Enviamos um e-mail de confirmação para o endereço informado. Abra a mensagem e clique no link para confirmar sua conta; depois, volte aqui para entrar.");
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
    } catch (e) { setAuthError(e instanceof Error ? e.message : "Não foi possível concluir o acesso."); }
    finally { setAuthBusy(false); }
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
    } catch (e) { setAuthError(e instanceof Error ? e.message : "Não foi possível entrar com Google."); }
    finally { setAuthBusy(false); }
  }

  if (!authReady || (session && !accessReady && !accessError)) return <div style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",color:"white"}}>Carregando seu espaço Vibra...</div>;
  if (session && accessError) return <main role="alert" style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",padding:24,color:"white"}}><section style={{maxWidth:480,textAlign:"center"}}><h1>{accessError.startsWith("As três sessões") ? "Limite de sessões administrativas" : "Não foi possível validar o acesso"}</h1><p>{accessError}</p><button type="button" onClick={() => window.location.reload()} style={{padding:"12px 18px",borderRadius:12,cursor:"pointer"}}>Tentar novamente</button></section></main>;
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
        <div className="va-brand"><span className="va-brand-mark"><Activity size={23} strokeWidth={2.6} /></span><span>vibra<span>.</span></span></div>
        <div className="va-story-copy">
          <div className="va-eyebrow"><Sparkles size={14} /> SEU ESPAÇO DE EVOLUÇÃO</div>
          <h1>Seu ritmo.<br />Sua jornada.<br /><span>Seu próximo nível.</span></h1>
          <p>Treinos, hábitos e evolução em um só lugar. Continue construindo uma rotina que faz sentido para você.</p>
        </div>
        <div className="va-story-footer"><span><Dumbbell size={16}/> TREINO</span><i /><span><Target size={16}/> FOCO</span><i /><span><TrendingUp size={16}/> EVOLUÇÃO</span></div>
      </section>
      <section className="va-auth-panel" aria-labelledby="va-title">
        <div className="va-panel-top"><span className="va-mobile-brand"><span className="va-brand-mark"><Activity size={20}/></span> vibra<span>.</span></span><span className="va-secure"><span /> ACESSO À SUA CONTA</span></div>
        <div className="va-form-heading">
          <div className="va-form-eyebrow">{authMode === "signup" ? "COMECE POR AQUI" : "BEM-VINDO DE VOLTA"}</div>
          <h2 id="va-title">{authMode === "signup" ? <>Comece sua <span>evolução.</span></> : <>Bom ter você <span>de volta.</span></>}</h2>
          <p>{authMode === "signup" ? "Crie sua conta e organize os próximos passos da sua jornada." : "Entre para continuar de onde você parou."}</p>
          {authMode === "signup" && selectedPlan && <div className="va-message va-success">Plano selecionado: <strong>{VIBRA_PLANS[selectedPlan].name} · {VIBRA_PLANS[selectedPlan].priceLabel}/mês</strong>. A cobrança só libera o acesso após confirmação real.</div> }
        </div>
        <form className="va-form" onSubmit={submitAuth}>
          {authMode === "signup" && <label>Nome de usuário<input required minLength={2} autoComplete="username" placeholder="Como podemos chamar você?" value={authUsername} onChange={e=>setAuthUsername(e.target.value)} /></label>}
          <label>E-mail<input required type="email" autoComplete="email" placeholder="voce@exemplo.com" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} /></label>
          <label>Senha<input required minLength={6} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="Mínimo de 6 caracteres" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} /></label>
          {authError && <div role="alert" className="va-message va-error">{authError}</div>}
          {authMessage && <div role="status" className="va-message va-success">{authMessage}</div>}
          {authMessage && authMode === "signup" && <button type="button" className="va-resend" onClick={resendConfirmationEmail} disabled={resendBusy || authBusy}>{resendBusy ? "Reenviando..." : "Reenviar e-mail de confirmação"}</button>}
          <button disabled={authBusy} type="submit" className="va-submit">{authBusy ? <><span className="va-spinner" /> Aguarde...</> : authMode === "signup" ? <>Criar minha conta <ArrowRight size={17}/></> : <>Entrar na Vibra <ArrowRight size={17}/></>}</button>
        </form>
        <div className="va-divider"><span/>ou continue com<span/></div>
        <button type="button" className="va-google" onClick={googleAuth} disabled={authBusy}><span className="va-google-g">G</span> Continuar com Google</button>
        <p className="va-switch">{authMode === "signup" ? "Já tem uma conta?" : "Ainda não tem conta?"}<button type="button" onClick={()=>{setAuthMode(authMode==="signup"?"login":"signup");setAuthError("");setAuthMessage("");}}>{authMode === "signup" ? "Entrar" : "Criar conta"}</button></p>
        <p className="va-disclaimer">Ao continuar, você concorda em usar a Vibra de forma responsável.</p>
      </section>
    </main>
  </div>;

  if (!accessReady) return <div style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",color:"white"}}>Verificando pagamento e acesso...</div>;

  return <div className="gym-app fit-app">
    <VibraChat />
    <>{mobileMenu && <button type="button" className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}<aside className={"sidebar " + (mobileMenu ? "sidebar-open" : "")}>
      <a className="gym-logo" href="#inicio" onClick={() => changePage("Visão geral")}><span className="logo-mark"><Dumbbell size={23} strokeWidth={2.5}/></span><span>FITPRO<span className="logo-dot">.</span><small>PERFORMANCE CLUB</small></span></a><button type="button" className="sidebar-close" aria-label="Fechar menu lateral" onClick={() => setMobileMenu(false)}><X size={20}/></button>
      <div className="side-label">SEU ESPAÇO</div>
      <nav className="side-nav">{navItems.map(({name,icon:Icon})=><button key={name} className={"nav-item "+(activeNav===name?"active":"")} onClick={()=>changePage(name)}><Icon size={18}/>{name}{name==="Treinos"&&<span className="nav-count">4</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="coach-card"><div className="coach-icon"><HeartPulse size={20}/></div><strong>Seu próximo nível.</strong><p>Consistência hoje. Resultados amanhã.</p><button onClick={()=>changePage("Especialistas")}>Falar com especialista <ChevronRight size={15}/></button></div><button className="nav-item settings-item" onClick={()=>changePage("Configurações")}><Settings size={18}/> Configurações</button><div className="user-mini"><div className="avatar">JD</div><div><strong>{profileName || "Aluno Vibra"}</strong><small>Área do aluno</small></div><button aria-label="Abrir perfil" onClick={()=>changePage("Meu perfil")}><ChevronRight size={17}/></button></div></div>
    </aside></>
    <main className="main-content" id="inicio">
      <header className="topbar"><button className="fit-mobile-menu icon-button" aria-label="Abrir menu" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="mobile-brand"><Dumbbell size={20}/> FITPRO<span>.</span></div><div className="breadcrumb">Meu espaço <ChevronRight size={14}/><strong>{activeNav}</strong></div><div className="top-actions"><div className="date-chip"><CalendarDays size={16}/> Quinta-feira, 8 de outubro</div><button className="icon-button" aria-label="Notificações"><Bell size={18}/><i/></button><button className="avatar top-avatar" title="Sair da conta" onClick={async()=>{try { await signOut(); } catch { setAuthError("Não foi possível confirmar o logout remoto. A sessão local pode ter sido encerrada; confira o acesso antes de continuar."); } finally { setSession(null); setProgressHydrated(false); setAuthMode("login"); }}}>{(profileName||"V").slice(0,2).toUpperCase()}</button></div></header>
      <div className="page-wrap">
        {activeNav !== "Visão geral" && <div className="fit-page-actions"><button className="outline-button fit-back-button" onClick={goBack} aria-label="Voltar para a tela anterior"><ArrowLeft size={17}/> Voltar</button><button type="button" className="outline-button fit-close-page" onClick={closePage} aria-label="Fechar esta página e voltar à visão geral"><X size={17}/><span>Fechar</span></button></div>}
        {activeNav==="Visão geral" && <>
          <section className="welcome-row"><div><div className="section-kicker"><span/> SUA JORNADA COMEÇA AQUI</div><h1>Hoje é dia de <span>evoluir.</span></h1><p>Um passo de cada vez. Vamos construir sua melhor versão?</p></div><button className="outline-button" onClick={()=>changePage("Progresso")}><Activity size={17}/> Minha evolução</button></section>
          <section className="fit-hero">
            <video className="fit-hero-video" autoPlay muted loop playsInline preload="metadata" poster="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1600"><source src="https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4" type="video/mp4"/></video>
            <div className="fit-hero-shade"/>
            <div className="fit-float fit-float-one"><span className="fit-float-icon"><Flame size={17}/></span><div><b>7 dias</b><small>de consistência</small></div></div>
            <div className="fit-float fit-float-two"><span className="fit-pulse"/><div><b>Seu ritmo.</b><small>Seu progresso.</small></div></div>
            <div className="hero-copy fit-hero-copy"><div className="hero-pill"><Flame size={14}/> TREINO DO DIA</div><h2>Supere seus<br/><span>limites.</span></h2><p>Treino de corpo inteiro para ganhar força, energia e confiança.</p><div className="hero-meta"><span><Clock3 size={16}/> 35 min</span><span><Dumbbell size={16}/> 4 exercícios</span><span><Activity size={16}/> Todos os níveis</span></div><button className="green-button" onClick={()=>{setStarted(true);changePage("Treinos")}}><CirclePlay size={18}/>{started?"Continuar treino":"Começar treino"}<ChevronRight size={17}/></button></div>
            <div className="fit-hero-caption"><Video size={14}/> MOVIMENTO REAL · FOCO TOTAL</div>
          </section>
          <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Treinos na semana</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">04 <small>/ 05</small></div><div className="stat-bottom"><span className="trend">+1 treino</span><span>meta semanal</span></div><div className="mini-progress"><i style={{width:"80%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Tempo ativo</span><span className="stat-icon"><Clock3 size={18}/></span></div><div className="stat-value">3h 25<small>min</small></div><div className="stat-bottom"><span className="trend">+12%</span><span>esta semana</span></div><div className="mini-progress"><i style={{width:"67%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Água hoje</span><span className="stat-icon"><Apple size={18}/></span></div><div className="stat-value">{water}<small> / 8 copos</small></div><div className="stat-bottom"><button className="fit-inline-action" onClick={()=>setWater(Math.min(8,water+1))}><Plus size={13}/> Registrar copo</button><span>meta diária</span></div><div className="mini-progress"><i style={{width:(water/8*100)+"%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Sequência atual</span><span className="stat-icon"><Trophy size={18}/></span></div><div className="stat-value">7 <small>dias</small></div><div className="stat-bottom"><span className="trend">Boa sequência!</span><span>continue assim</span></div><div className="mini-progress"><i style={{width:"74%"}}/></div></article></section>
          <section className="lower-grid"><article className="panel workout-panel"><div className="panel-heading"><div><div className="section-kicker">PLANO DE HOJE</div><h3>Corpo inteiro</h3><p>{done.length} de {exercises.length} exercícios concluídos</p></div><button className="text-button" onClick={()=>changePage("Treinos")}>Ver treino <ChevronRight size={15}/></button></div><div className="workout-progress"><div><span>Progresso do treino</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{width:progress+"%"}}/></div></div><div className="exercise-list">{exercises.slice(0,3).map(x=><button key={x.name} className={"exercise-row "+(done.includes(x.name)?"exercise-done":"")} onClick={()=>setDone(old=>old.includes(x.name)?old.filter(n=>n!==x.name):[...old,x.name])}><span className="exercise-check">{done.includes(x.name)?<Check size={15}/>:<Plus size={15}/>}</span><span className="exercise-info"><strong>{x.name}</strong><small>{x.detail}</small></span><ChevronRight className="exercise-arrow" size={17}/></button>)}</div><button className="start-bottom" onClick={()=>{setStarted(true);changePage("Treinos")}}>{started?"Continuar sessão":"Ver sessão completa"} <ArrowRight size={17}/></button></article>
          <article className="panel nutrition-teaser"><div className="panel-heading"><div><div className="section-kicker">ENERGIA PARA EVOLUIR</div><h3>Nutrição diária</h3><p>Seu resumo alimentar</p></div><span className="nutrition-icon"><Utensils size={19}/></span></div><div className="nutrition-calories"><div><strong>1.240</strong><span>kcal consumidas</span></div><div className="calorie-ring"><span>58%</span></div></div><div className="nutrition-bar"><i/></div><div className="nutrition-macro"><span><i/> Proteínas <b>68g</b></span><span><i/> Carboidratos <b>142g</b></span><span><i/> Gorduras <b>39g</b></span></div><button className="start-bottom" onClick={()=>changePage("Nutrição")}>Abrir meu plano alimentar <ArrowRight size={17}/></button></article></section>
          <section className="fit-specialist-strip"><div className="fit-specialist-icon"><HeartPulse size={24}/></div><div><span className="section-kicker">ACOMPANHAMENTO PROFISSIONAL</span><h3>Você não precisa fazer isso sozinho.</h3><p>Encontre orientação de nutricionistas e personal trainers cadastrados.</p></div><button className="green-button" onClick={()=>changePage("Especialistas")}>Conhecer especialistas <ArrowRight size={16}/></button></section>
        </>}
        {activeNav==="Treinos" && <section className="fit-page-section"><div className="section-kicker"><span/> PLANO DE TREINO</div><h1>Seu treino. <span>Seu progresso.</span></h1><p className="fit-page-intro">Marque cada exercício concluído e acompanhe sua sessão em tempo real.</p><div className="fit-workout-banner"><div><span className="hero-pill"><Flame size={14}/> TREINO A · CORPO INTEIRO</span><h2>{started?"Treino em andamento":"Pronto para começar?"}</h2><p>35 minutos · 4 exercícios · Intensidade moderada</p></div><button className="green-button" onClick={()=>setStarted(!started)}>{started?"Pausar treino": "Iniciar sessão"} <Play size={16}/></button></div><div className="panel fit-exercises-panel"><div className="panel-heading"><div><h3>Lista de exercícios</h3><p>{done.length} de {exercises.length} concluídos · {progress}%</p></div><div className="fit-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar exercício"/></div></div><div className="progress-track"><i style={{width:progress+"%"}}/></div>{filtered.map(x=><div key={x.id} className={"exercise-row "+(done.includes(x.name)?"exercise-done":"")}><button type="button" className="exercise-check" aria-label={done.includes(x.name)?"Marcar como não concluído":"Marcar como concluído"} onClick={()=>setDone(old=>old.includes(x.name)?old.filter(n=>n!==x.name):[...old,x.name])}>{done.includes(x.name)?<Check size={15}/>:<Plus size={15}/>}</button><button type="button" className="exercise-info exercise-info-button" onClick={()=>setDemoExercise({id:x.id,name:x.name})}><strong>{x.name}</strong><small>{x.detail}</small></button><span className="fit-exercise-time">{x.time}</span><button type="button" className="exercise-howto-button" onClick={()=>setDemoExercise({id:x.id,name:x.name})}><Video size={15}/> Como fazer</button></div>)}</div></section>}
        {activeNav==="Biblioteca de Exercícios" && <ExerciseLibrary />}
        <ExerciseDemoModal exerciseId={demoExercise?.id ?? null} {...(demoExercise ? { workoutName: demoExercise.name } : {})} onClose={()=>setDemoExercise(null)} />
        {activeNav==="Nutrição" && <section className="fit-page-section"><div className="section-kicker"><span/> NUTRIÇÃO E BEM-ESTAR</div><h1>Coma bem. <span>Viva melhor.</span></h1><p className="fit-page-intro">Organize sua rotina alimentar e acompanhe hábitos. Planos clínicos devem ser definidos por nutricionista.</p><div className="fit-nutrition-layout"><article className="panel fit-food-summary"><div className="section-kicker">RESUMO DE HOJE</div><div className="fit-big-number">1.740 <small>/ 2.200 kcal</small></div><div className="nutrition-bar"><i/></div><div className="fit-food-stats"><span>Proteínas <b>68 / 120g</b></span><span>Carboidratos <b>142 / 250g</b></span><span>Gorduras <b>39 / 70g</b></span></div><div className="fit-water-box"><div><Apple size={19}/><strong>Hidratação</strong><small>{water} de 8 copos registrados</small></div><button className="green-button" onClick={()=>setWater(Math.min(8,water+1))}><Plus size={16}/> Adicionar água</button></div></article><article className="panel"><div className="panel-heading"><div><div className="section-kicker">SUGESTÃO DE ROTINA</div><h3>Refeições do dia</h3></div><Utensils size={20}/></div>{meals.map(m=><div className="fit-meal-row" key={m.time}><span className="fit-meal-time">{m.time}</span><div><strong>{m.meal}</strong><p>{m.food}</p><small>{m.kcal}</small></div><Check size={16}/></div>)}</article></div><div className="fit-note"><HeartPulse size={18}/> <span>Este exemplo é informativo e não substitui avaliação individual de um nutricionista.</span></div></section>}
        {activeNav==="Especialistas" && <section className="fit-page-section"><div className="section-kicker"><span/> TIME DE ESPECIALISTAS</div><h1>Orientação de <span>verdade.</span></h1><p className="fit-page-intro">Encontre profissionais para acompanhar sua jornada. Perfis abaixo são exemplos de apresentação; agendamento real exige cadastro e disponibilidade confirmados.</p><div className="fit-expert-grid"><article className="panel fit-expert-card"><div className="fit-expert-avatar fit-expert-green"><Leaf size={30}/></div><span className="fit-expert-tag">NUTRIÇÃO</span><h3>Nutricionista</h3><p>Planejamento alimentar individualizado, hábitos sustentáveis e acompanhamento.</p><div className="fit-expert-meta"><span><CalendarDays size={15}/> Consulta agendada</span><span><MessageCircle size={15}/> Acompanhamento</span></div><button className="green-button" onClick={()=>setShowVideo(true)}>Como funciona <ArrowRight size={16}/></button></article><article className="panel fit-expert-card"><div className="fit-expert-avatar fit-expert-dark"><Dumbbell size={30}/></div><span className="fit-expert-tag">TREINAMENTO</span><h3>Personal trainer</h3><p>Orientação de técnica, planejamento de exercícios e metas compatíveis com seu nível.</p><div className="fit-expert-meta"><span><CalendarDays size={15}/> Rotina personalizada</span><span><MessageCircle size={15}/> Suporte</span></div><button className="green-button" onClick={()=>setShowVideo(true)}>Como funciona <ArrowRight size={16}/></button></article></div></section>}
        {activeNav==="Progresso" && <section className="fit-page-section"><div className="section-kicker"><span/> SUA EVOLUÇÃO</div><h1>Olhe o quanto <span>já avançou.</span></h1><p className="fit-page-intro">Resumo demonstrativo para acompanhar seus hábitos e consistência.</p><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Treinos concluídos</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">16 <small>este mês</small></div><div className="mini-progress"><i style={{width:"76%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Tempo ativo</span><span className="stat-icon"><Clock3 size={18}/></span></div><div className="stat-value">12h <small>40min</small></div><div className="mini-progress"><i style={{width:"68%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Consistência</span><span className="stat-icon"><Trophy size={18}/></span></div><div className="stat-value">82<small>%</small></div><div className="mini-progress"><i style={{width:"82%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Meta da semana</span><span className="stat-icon"><Target size={18}/></span></div><div className="stat-value">4 <small>/ 5 treinos</small></div><div className="mini-progress"><i style={{width:"80%"}}/></div></article></div><div className="panel fit-goal-panel"><div><div className="section-kicker">SEU OBJETIVO ATUAL</div><h3>{goal}</h3><p>Escolha uma meta para personalizar sua experiência.</p></div><select value={goal} onChange={e=>setGoal(e.target.value)}><option>Ganhar massa muscular</option><option>Perder gordura</option><option>Melhorar condicionamento</option><option>Ter mais saúde e energia</option></select></div></section>}
        {(activeNav==="Meu perfil"||activeNav==="Configurações") && <section className="fit-page-section"><div className="section-kicker"><span/> CONTA E PREFERÊNCIAS</div><h1>Seu espaço, <span>do seu jeito.</span></h1><p className="fit-page-intro">Gerencie suas preferências e o foco da sua jornada fitness.</p><div className="panel fit-profile-panel"><div className="fit-profile-avatar">{(profileName||"V").slice(0,2).toUpperCase()}</div><div className="fit-profile-info"><h3>{profileName || "Aluno Vibra"}</h3><p>{session.user.email || "Conta Vibra"}</p><label htmlFor="fit-goal">Meu objetivo principal</label><select id="fit-goal" value={goal} onChange={e=>setGoal(e.target.value)}><option>Ganhar massa muscular</option><option>Perder gordura</option><option>Melhorar condicionamento</option><option>Ter mais saúde e energia</option></select><button type="button" className="green-button" style={{marginTop:12}} onClick={()=>window.location.assign("/fitness-profile")}>Editar perfil fitness <ArrowRight size={16}/></button></div></div><div className="fit-note"><Settings size={18}/><span>Seu perfil está conectado à sua conta. Seu progresso e suas preferências são salvos na nuvem.</span></div></section>}
        <footer className="app-footer"><span>© 2026 FITPRO PERFORMANCE CLUB</span><span>Feito para sua melhor versão <span className="footer-heart">♥</span></span></footer>
      </div>
    </main>
    {showVideo&&<div className="modal-backdrop" onClick={()=>setShowVideo(false)}><section className="plan-modal fit-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Fechar" onClick={()=>setShowVideo(false)}><X size={20}/></button><div className="section-kicker">PRÓXIMOS PASSOS</div><h2>Acompanhamento profissional</h2><p className="modal-subtitle">Esta área está preparada para receber perfis verificados, horários disponíveis e contato seguro quando o serviço profissional for conectado.</p><div className="fit-modal-list"><span><Check size={16}/> Perfil e credenciais do profissional</span><span><Check size={16}/> Agenda e disponibilidade</span><span><Check size={16}/> Canal de contato protegido</span></div><button className="green-button modal-done" onClick={()=>setShowVideo(false)}>Entendi <Check size={17}/></button></section></div>}
  </div>;
}
