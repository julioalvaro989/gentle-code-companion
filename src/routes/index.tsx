import { createFileRoute } from "@tanstack/react-router";
import { ExerciseLibrary } from "../components/ExerciseLibrary";
import { ExerciseDemoModal } from "../components/ExerciseDemoModal";
import { useEffect, useState, type FormEvent, type CSSProperties } from "react";
import { adoptSupabaseSession, getFitnessProfile, getFitnessProgress, resendSignupConfirmation, saveFitnessProfile, saveFitnessProgress, signIn, signInWithGoogle, signOut, signUp, type AuthSession } from "../lib/supabase";
import { Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronRight, CirclePlay, Clock3, Dumbbell, Flame, HeartPulse, Home, Leaf, Menu, Search, Settings, Target, Trophy, UserRound, Utensils, Video, X, Apple, MessageCircle, Play, Plus, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({ component: GymApp });

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
  const [profileName, setProfileName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
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
      setActiveNav(previous);
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
    let active = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!active) return;
        if (current) {
          setSession(current);
          const metaName = current.user.user_metadata?.full_name || current.user.user_metadata?.username || "";
          setProfileName(metaName || current.user.email?.split("@")[0] || "Aluno Vibra");
          try {
            const p = await getFitnessProfile(current);
            if (p?.username) setProfileName(p.username);
            else await saveFitnessProfile(current, { username: metaName || current.user.email?.split("@")[0] || "Aluno Vibra", email: current.user.email || "", goal });
            const saved = await getFitnessProgress(current);
            if (saved) {
              setDone(saved.completed_exercises || []);
              setWater(saved.water_glasses || 0);
              setGoal(saved.goal || "Ganhar massa muscular");
            }
          } catch (e) { console.error("Falha ao carregar dados fitness", e); }
          setProgressHydrated(true);
        } else {
          setProgressHydrated(false);
        }
      } catch { setSession(null); setProgressHydrated(false); }
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
    e.preventDefault(); setAuthError(""); setAuthMessage(""); setAuthBusy(true);
    try {
      let next: AuthSession | null;
      if (authMode === "signup") {
        next = await signUp(authUsername.trim(), authEmail.trim(), authPassword);
        if (!next) {
          setAuthMessage("Cadastro recebido! Enviamos um e-mail de confirmação para o endereço informado. Abra a mensagem e clique no link para confirmar sua conta; depois, volte aqui para entrar.");
          return;
        }
        setProfileName(authUsername.trim());
        await saveFitnessProfile(next, { username: authUsername.trim(), email: authEmail.trim(), goal });
      } else {
        next = await signIn(authEmail.trim(), authPassword);
        setProfileName(next.user.user_metadata?.full_name || next.user.email?.split("@")[0] || "Aluno Vibra");
        const p = await getFitnessProfile(next).catch(() => null);
        if (p?.username) setProfileName(p.username);
        else await saveFitnessProfile(next, { username: next.user.user_metadata?.full_name || next.user.email?.split("@")[0] || "Aluno Vibra", email: next.user.email || authEmail.trim(), goal });
      }
      setSession(next); setProgressHydrated(false);
      const saved = await getFitnessProgress(next).catch(() => null);
      if (saved) { setDone(saved.completed_exercises || []); setWater(saved.water_glasses || 0); setGoal(saved.goal || "Ganhar massa muscular"); }
      setProgressHydrated(true);
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
        await saveFitnessProfile(next, { username: name, email: next.user.email || "", goal }).catch(() => {});
        const saved = await getFitnessProgress(next).catch(() => null);
        if (saved) { setDone(saved.completed_exercises || []); setWater(saved.water_glasses || 0); setGoal(saved.goal || "Ganhar massa muscular"); }
        setProgressHydrated(true);
      }
    } catch (e) { setAuthError(e instanceof Error ? e.message : "Não foi possível entrar com Google."); }
    finally { setAuthBusy(false); }
  }

  if (!authReady) return <div style={{minHeight:"100vh",background:"#05060B",display:"grid",placeItems:"center",color:"white"}}>Carregando seu espaço Vibra...</div>;
  if (!session) return <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 80% 15%,#7900FF30 0%,transparent 38%),radial-gradient(ellipse at 10% 90%,#A855F720 0%,transparent 35%),#05060B",color:"#F8F9FF",display:"grid",placeItems:"center",padding:"28px 16px",fontFamily:"inherit"}}>
    <div style={{width:"min(100%,440px)",background:"#0B0C16",border:"1px solid #29233F",borderRadius:28,padding:"clamp(24px,5vw,42px)",boxShadow:"0 25px 90px #12201218"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:30}}><span style={{fontSize:30,color:"#B7FF35",fontWeight:900}}>V</span><strong style={{fontSize:28,letterSpacing:-1}}>Vibra</strong></div>
      <div style={{fontSize:11,letterSpacing:2,color:"#B7FF35",fontWeight:800,marginBottom:10}}>SEU ECOSSISTEMA DE BEM-ESTAR</div>
      <h1 style={{fontSize:"clamp(30px,7vw,42px)",lineHeight:1.08,margin:"0 0 12px",letterSpacing:-1.5}}>{authMode === "signup" ? <>Comece sua <span style={{color:"#B7FF35"}}>evolução.</span></> : <>Bom ter você <span style={{color:"#B7FF35"}}>de volta.</span></>}</h1>
      <p style={{color:"#A8B4D8",lineHeight:1.6,margin:"0 0 25px"}}>{authMode === "signup" ? "Crie sua conta para acessar treinos, nutrição, progresso e seu perfil pessoal." : "Entre na sua conta para continuar de onde parou."}</p>
      <form onSubmit={submitAuth} style={{display:"grid",gap:13}}>
        {authMode === "signup" && <input required minLength={2} autoComplete="username" placeholder="Nome de usuário" value={authUsername} onChange={e=>setAuthUsername(e.target.value)} style={authInputStyle}/>}
        <input required type="email" autoComplete="email" placeholder="Seu e-mail" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} style={authInputStyle}/>
        <input required minLength={6} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} placeholder="Senha (mínimo 6 caracteres)" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} style={authInputStyle}/>
        {authError && <div role="alert" style={{color:"#ff9b9b",fontSize:13}}>{authError}</div>}
        {authMessage && <div role="status" style={{color:"#C8FF58",fontSize:13,lineHeight:1.5}}>{authMessage}</div>}
        {authMessage && authMode === "signup" && <button type="button" onClick={resendConfirmationEmail} disabled={resendBusy || authBusy} style={{background:"transparent",border:"1px solid #B7FF35",borderRadius:999,color:"#B7FF35",padding:"10px 14px",fontWeight:750,cursor:"pointer"}}>{resendBusy ? "Reenviando..." : "Reenviar e-mail de confirmação"}</button>}
        <button disabled={authBusy} type="submit" style={{border:0,borderRadius:999,background:"#B7FF35",color:"#10110b",padding:"15px 20px",fontWeight:850,cursor:"pointer",marginTop:5}}>{authBusy ? "Aguarde..." : authMode === "signup" ? "Criar minha conta →" : "Entrar na Vibra →"}</button>
      </form>
      <div style={{display:"flex",alignItems:"center",gap:12,color:"#657065",fontSize:12,margin:"20px 0"}}><span style={{height:1,background:"#39304b",flex:1}}/>ou continue com<span style={{height:1,background:"#39304b",flex:1}}/></div>
      <button type="button" onClick={googleAuth} disabled={authBusy} style={{width:"100%",background:"#fff",color:"#17131f",border:0,borderRadius:999,padding:"13px 18px",fontWeight:750,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><span style={{fontSize:18,fontWeight:900}}>G</span> Continuar com Google</button>
      <p style={{textAlign:"center",color:"#A8B4D8",fontSize:13,marginTop:24}}>{authMode === "signup" ? "Já tem uma conta?" : "Ainda não tem conta?"} <button type="button" onClick={()=>{setAuthMode(authMode==="signup"?"login":"signup");setAuthError("");setAuthMessage("");}} style={{background:"none",border:0,color:"#B7FF35",fontWeight:800,cursor:"pointer"}}>{authMode === "signup" ? "Entrar" : "Criar conta"}</button></p>
      <p style={{fontSize:11,color:"#687368",textAlign:"center",lineHeight:1.5}}>Ao continuar, você concorda em usar a Vibra de forma responsável.</p>
    </div>
  </div>;

  return <div className="gym-app fit-app">
    <>{mobileMenu && <button type="button" className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}<aside className={"sidebar " + (mobileMenu ? "sidebar-open" : "")}>
      <a className="gym-logo" href="#inicio" onClick={() => changePage("Visão geral")}><span className="logo-mark"><Dumbbell size={23} strokeWidth={2.5}/></span><span>FITPRO<span className="logo-dot">.</span><small>PERFORMANCE CLUB</small></span></a><button type="button" className="sidebar-close" aria-label="Fechar menu lateral" onClick={() => setMobileMenu(false)}><X size={20}/></button>
      <div className="side-label">SEU ESPAÇO</div>
      <nav className="side-nav">{navItems.map(({name,icon:Icon})=><button key={name} className={"nav-item "+(activeNav===name?"active":"")} onClick={()=>changePage(name)}><Icon size={18}/>{name}{name==="Treinos"&&<span className="nav-count">4</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="coach-card"><div className="coach-icon"><HeartPulse size={20}/></div><strong>Seu próximo nível.</strong><p>Consistência hoje. Resultados amanhã.</p><button onClick={()=>changePage("Especialistas")}>Falar com especialista <ChevronRight size={15}/></button></div><button className="nav-item settings-item" onClick={()=>changePage("Configurações")}><Settings size={18}/> Configurações</button><div className="user-mini"><div className="avatar">JD</div><div><strong>{profileName || "Aluno Vibra"}</strong><small>Área do aluno</small></div><button aria-label="Abrir perfil" onClick={()=>changePage("Meu perfil")}><ChevronRight size={17}/></button></div></div>
    </aside></>
    <main className="main-content" id="inicio">
      <header className="topbar"><button className="fit-mobile-menu icon-button" aria-label="Abrir menu" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="mobile-brand"><Dumbbell size={20}/> FITPRO<span>.</span></div><div className="breadcrumb">Meu espaço <ChevronRight size={14}/><strong>{activeNav}</strong></div><div className="top-actions"><div className="date-chip"><CalendarDays size={16}/> Quinta-feira, 8 de outubro</div><button className="icon-button" aria-label="Notificações"><Bell size={18}/><i/></button><button className="avatar top-avatar" title="Sair da conta" onClick={async()=>{try { await signOut(); } catch { setAuthError("A sessão local foi encerrada, mas o provedor não confirmou o logout remoto."); } finally { setSession(null); setProgressHydrated(false); setAuthMode("login"); }}}>{(profileName||"V").slice(0,2).toUpperCase()}</button></div></header>
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
        <ExerciseDemoModal exerciseId={demoExercise?.id ?? null} workoutName={demoExercise?.name} onClose={()=>setDemoExercise(null)} />
        {activeNav==="Nutrição" && <section className="fit-page-section"><div className="section-kicker"><span/> NUTRIÇÃO E BEM-ESTAR</div><h1>Coma bem. <span>Viva melhor.</span></h1><p className="fit-page-intro">Organize sua rotina alimentar e acompanhe hábitos. Planos clínicos devem ser definidos por nutricionista.</p><div className="fit-nutrition-layout"><article className="panel fit-food-summary"><div className="section-kicker">RESUMO DE HOJE</div><div className="fit-big-number">1.740 <small>/ 2.200 kcal</small></div><div className="nutrition-bar"><i/></div><div className="fit-food-stats"><span>Proteínas <b>68 / 120g</b></span><span>Carboidratos <b>142 / 250g</b></span><span>Gorduras <b>39 / 70g</b></span></div><div className="fit-water-box"><div><Apple size={19}/><strong>Hidratação</strong><small>{water} de 8 copos registrados</small></div><button className="green-button" onClick={()=>setWater(Math.min(8,water+1))}><Plus size={16}/> Adicionar água</button></div></article><article className="panel"><div className="panel-heading"><div><div className="section-kicker">SUGESTÃO DE ROTINA</div><h3>Refeições do dia</h3></div><Utensils size={20}/></div>{meals.map(m=><div className="fit-meal-row" key={m.time}><span className="fit-meal-time">{m.time}</span><div><strong>{m.meal}</strong><p>{m.food}</p><small>{m.kcal}</small></div><Check size={16}/></div>)}</article></div><div className="fit-note"><HeartPulse size={18}/> <span>Este exemplo é informativo e não substitui avaliação individual de um nutricionista.</span></div></section>}
        {activeNav==="Especialistas" && <section className="fit-page-section"><div className="section-kicker"><span/> TIME DE ESPECIALISTAS</div><h1>Orientação de <span>verdade.</span></h1><p className="fit-page-intro">Encontre profissionais para acompanhar sua jornada. Perfis abaixo são exemplos de apresentação; agendamento real exige cadastro e disponibilidade confirmados.</p><div className="fit-expert-grid"><article className="panel fit-expert-card"><div className="fit-expert-avatar fit-expert-green"><Leaf size={30}/></div><span className="fit-expert-tag">NUTRIÇÃO</span><h3>Nutricionista</h3><p>Planejamento alimentar individualizado, hábitos sustentáveis e acompanhamento.</p><div className="fit-expert-meta"><span><CalendarDays size={15}/> Consulta agendada</span><span><MessageCircle size={15}/> Acompanhamento</span></div><button className="green-button" onClick={()=>setShowVideo(true)}>Como funciona <ArrowRight size={16}/></button></article><article className="panel fit-expert-card"><div className="fit-expert-avatar fit-expert-dark"><Dumbbell size={30}/></div><span className="fit-expert-tag">TREINAMENTO</span><h3>Personal trainer</h3><p>Orientação de técnica, planejamento de exercícios e metas compatíveis com seu nível.</p><div className="fit-expert-meta"><span><CalendarDays size={15}/> Rotina personalizada</span><span><MessageCircle size={15}/> Suporte</span></div><button className="green-button" onClick={()=>setShowVideo(true)}>Como funciona <ArrowRight size={16}/></button></article></div></section>}
        {activeNav==="Progresso" && <section className="fit-page-section"><div className="section-kicker"><span/> SUA EVOLUÇÃO</div><h1>Olhe o quanto <span>já avançou.</span></h1><p className="fit-page-intro">Resumo demonstrativo para acompanhar seus hábitos e consistência.</p><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Treinos concluídos</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">16 <small>este mês</small></div><div className="mini-progress"><i style={{width:"76%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Tempo ativo</span><span className="stat-icon"><Clock3 size={18}/></span></div><div className="stat-value">12h <small>40min</small></div><div className="mini-progress"><i style={{width:"68%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Consistência</span><span className="stat-icon"><Trophy size={18}/></span></div><div className="stat-value">82<small>%</small></div><div className="mini-progress"><i style={{width:"82%"}}/></div></article><article className="stat-card"><div className="stat-top"><span>Meta da semana</span><span className="stat-icon"><Target size={18}/></span></div><div className="stat-value">4 <small>/ 5 treinos</small></div><div className="mini-progress"><i style={{width:"80%"}}/></div></article></div><div className="panel fit-goal-panel"><div><div className="section-kicker">SEU OBJETIVO ATUAL</div><h3>{goal}</h3><p>Escolha uma meta para personalizar sua experiência.</p></div><select value={goal} onChange={e=>setGoal(e.target.value)}><option>Ganhar massa muscular</option><option>Perder gordura</option><option>Melhorar condicionamento</option><option>Ter mais saúde e energia</option></select></div></section>}
        {(activeNav==="Meu perfil"||activeNav==="Configurações") && <section className="fit-page-section"><div className="section-kicker"><span/> CONTA E PREFERÊNCIAS</div><h1>Seu espaço, <span>do seu jeito.</span></h1><p className="fit-page-intro">Gerencie suas preferências e o foco da sua jornada fitness.</p><div className="panel fit-profile-panel"><div className="fit-profile-avatar">{(profileName||"V").slice(0,2).toUpperCase()}</div><div className="fit-profile-info"><h3>{profileName || "Aluno Vibra"}</h3><p>{session.user.email || "Conta Vibra"}</p><label htmlFor="fit-goal">Meu objetivo principal</label><select id="fit-goal" value={goal} onChange={e=>setGoal(e.target.value)}><option>Ganhar massa muscular</option><option>Perder gordura</option><option>Melhorar condicionamento</option><option>Ter mais saúde e energia</option></select></div></div><div className="fit-note"><Settings size={18}/><span>Seu perfil está conectado à sua conta. Seu progresso e suas preferências são salvos na nuvem.</span></div></section>}
        <footer className="app-footer"><span>© 2026 FITPRO PERFORMANCE CLUB</span><span>Feito para sua melhor versão <span className="footer-heart">♥</span></span></footer>
      </div>
    </main>
    {showVideo&&<div className="modal-backdrop" onClick={()=>setShowVideo(false)}><section className="plan-modal fit-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Fechar" onClick={()=>setShowVideo(false)}><X size={20}/></button><div className="section-kicker">PRÓXIMOS PASSOS</div><h2>Acompanhamento profissional</h2><p className="modal-subtitle">Esta área está preparada para receber perfis verificados, horários disponíveis e contato seguro quando o serviço profissional for conectado.</p><div className="fit-modal-list"><span><Check size={16}/> Perfil e credenciais do profissional</span><span><Check size={16}/> Agenda e disponibilidade</span><span><Check size={16}/> Canal de contato protegido</span></div><button className="green-button modal-done" onClick={()=>setShowVideo(false)}>Entendi <Check size={17}/></button></section></div>}
  </div>;
}
