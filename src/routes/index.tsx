import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, CirclePlay, Clock3, Dumbbell, Flame, HeartPulse, Home, Menu, Plus, Search, Settings, Target, Trophy, UserRound, X } from "lucide-react";

export const Route = createFileRoute("/")({ component: GymApp });

const initialExercises = [
  { name: "Supino reto", detail: "Peitoral · 4 séries × 10 reps", done: true },
  { name: "Supino inclinado com halteres", detail: "Peitoral · 3 séries × 12 reps", done: true },
  { name: "Crucifixo na máquina", detail: "Peitoral · 3 séries × 12 reps", done: false },
  { name: "Tríceps na polia", detail: "Tríceps · 3 séries × 15 reps", done: false },
];
const plans = [
  { day: "SEG", date: "05", name: "Peito & tríceps", type: "Superior", active: false },
  { day: "TER", date: "06", name: "Costas & bíceps", type: "Superior", active: false },
  { day: "QUA", date: "07", name: "Pernas completas", type: "Inferior", active: true },
  { day: "QUI", date: "08", name: "Ombros & abdômen", type: "Superior", active: false },
  { day: "SEX", date: "09", name: "Full body", type: "Corpo todo", active: false },
];

function GymApp() {
  const [activeNav, setActiveNav] = useState("Visão geral");
  const [exercises, setExercises] = useState(initialExercises);
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const completed = exercises.filter((exercise) => exercise.done).length;
  const nav = [
    { name: "Visão geral", icon: Home },
    { name: "Treinos", icon: Dumbbell },
    { name: "Progresso", icon: Activity },
    { name: "Meu perfil", icon: UserRound },
  ];
  const filteredExercises = exercises.filter((exercise) => exercise.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="gym-app">
      <aside className="sidebar">
        <a className="gym-logo" href="#inicio"><span className="logo-mark"><Dumbbell size={23} strokeWidth={2.5} /></span><span>FORMA<span className="logo-dot">.</span><small>FITNESS CLUB</small></span></a>
        <div className="side-label">MENU PRINCIPAL</div>
        <nav className="side-nav">{nav.map(({ name, icon: Icon }) => <button key={name} className={activeNav === name ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(name)}><Icon size={18} />{name}{name === "Treinos" && <span className="nav-count">5</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="coach-card"><div className="coach-icon"><HeartPulse size={20}/></div><strong>Seu objetivo, seu ritmo.</strong><p>Pequenos passos todos os dias geram grandes resultados.</p><button onClick={() => setShowPlan(true)}>Ver meu plano <ChevronRight size={15}/></button></div><button className="nav-item settings-item" onClick={() => setActiveNav("Configurações")}><Settings size={18}/> Configurações</button><div className="user-mini"><div className="avatar">JD</div><div><strong>João Dias</strong><small>Plano Premium</small></div><button aria-label="Opções do perfil" onClick={() => setActiveNav("Meu perfil")}><ChevronRight size={17}/></button></div></div>
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar"><div className="mobile-brand"><Dumbbell size={20}/> FORMA<span>.</span></div><div className="breadcrumb">Workspace <ChevronRight size={14}/> <strong>{activeNav}</strong></div><div className="top-actions"><div className="date-chip"><CalendarDays size={16}/> Quinta-feira, 8 de outubro</div><button className="icon-button" aria-label="Notificações"><Bell size={18}/><i/></button><div className="avatar top-avatar">JD</div></div></header>
        <div className="page-wrap">
          <section className="welcome-row"><div><div className="section-kicker"><span/> QUINTA-FEIRA, 8 DE OUTUBRO</div><h1>Vamos ficar mais <span>fortes.</span></h1><p>O seu próximo nível começa com o treino de hoje. Bora?</p></div><button className="outline-button" onClick={() => setShowPlan(true)}><CalendarDays size={17}/> Ver agenda</button></section>

          <section className="hero-workout"><div className="hero-copy"><div className="hero-pill"><Flame size={14}/> SEU TREINO DE HOJE</div><h2>Dia de superar<br/>seus <span>limites.</span></h2><p>Treino de força para construir consistência e evoluir a cada repetição.</p><div className="hero-meta"><span><Clock3 size={16}/> 50 min</span><span><Dumbbell size={16}/> 6 exercícios</span><span><Activity size={16}/> Intermediário</span></div><button className="green-button" onClick={() => { setStarted(true); setActiveNav("Treinos"); }}><CirclePlay size={18}/>{started ? "Continuar treino" : "Começar treino"}<ChevronRight size={17}/></button></div><div className="hero-art"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-number">01<span>/05</span></div><div className="art-dumbbell"><Dumbbell size={148} strokeWidth={1.1}/></div><div className="art-tag"><span className="live-dot"/> FOCO & CONSISTÊNCIA</div></div></section>

          <section className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>Treinos esta semana</span><span className="stat-icon"><Dumbbell size={18}/></span></div><div className="stat-value">04 <small>/ 05</small></div><div className="stat-bottom"><span className="trend"><ArrowUpRight size={14}/> +1 treino</span><span>vs. semana passada</span></div><div className="mini-progress"><i style={{width:"80%"}}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Tempo de atividade</span><span className="stat-icon"><Clock3 size={18}/></span></div><div className="stat-value">3h 25<small>min</small></div><div className="stat-bottom"><span className="trend"><ArrowUpRight size={14}/> +12%</span><span>vs. semana passada</span></div><div className="mini-progress"><i style={{width:"67%"}}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Calorias estimadas</span><span className="stat-icon"><Flame size={18}/></span></div><div className="stat-value">1.240 <small>kcal</small></div><div className="stat-bottom"><span className="trend"><ArrowUpRight size={14}/> +8%</span><span>nesta semana</span></div><div className="mini-progress"><i style={{width:"58%"}}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Sequência atual</span><span className="stat-icon"><Trophy size={18}/></span></div><div className="stat-value">7 <small>dias</small></div><div className="stat-bottom"><span className="trend">🔥 Boa sequência!</span><span>continue assim</span></div><div className="mini-progress"><i style={{width:"74%"}}/></div></article>
          </section>

          <section className="lower-grid"><article className="panel workout-panel"><div className="panel-heading"><div><div className="section-kicker">PLANO DE HOJE</div><h3>Peito & tríceps</h3><p>{completed} de {exercises.length} exercícios concluídos</p></div><button className="text-button" onClick={() => setShowPlan(true)}>Ver plano <ChevronRight size={15}/></button></div><div className="workout-progress"><div><span>Progresso do treino</span><strong>{Math.round(completed / exercises.length * 100)}%</strong></div><div className="progress-track"><i style={{width: (completed / exercises.length * 100) + "%"}}/></div></div><div className="exercise-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar exercício..."/></div><div className="exercise-list">{filteredExercises.map((exercise) => <button key={exercise.name} className={"exercise-row " + (exercise.done ? "exercise-done" : "")} onClick={() => setExercises(old => old.map(item => item.name === exercise.name ? {...item, done: !item.done} : item))}><span className="exercise-check">{exercise.done ? <Check size={15}/> : <Plus size={15}/>}</span><span className="exercise-info"><strong>{exercise.name}</strong><small>{exercise.detail}</small></span><ChevronRight className="exercise-arrow" size={17}/></button>)}{filteredExercises.length === 0 && <p className="empty-state">Nenhum exercício encontrado.</p>}</div><button className="start-bottom" onClick={() => { setStarted(true); setActiveNav("Treinos"); }}>{started ? "Treino em andamento" : "Iniciar sessão de treino"} <ArrowDownRight size={17}/></button></article>

          <article className="panel week-panel"><div className="panel-heading"><div><div className="section-kicker">MANTENHA O RITMO</div><h3>Sua semana</h3></div><button className="icon-button subtle" aria-label="Ver calendário" onClick={() => setShowPlan(true)}><CalendarDays size={17}/></button></div><div className="week-days">{plans.map((plan, i) => <button key={plan.day} className={"day-cell " + (plan.active ? "day-active" : "")} onClick={() => setShowPlan(true)}><span>{plan.day}</span><b>{plan.date}</b><i className={i < 2 ? "day-complete" : ""}>{i < 2 ? <Check size={11}/> : <span/>}</i></button>)}</div><div className="goal-card"><div className="goal-icon"><Target size={20}/></div><div className="goal-text"><strong>Meta semanal</strong><p>5 treinos para manter a evolução.</p><div className="goal-track"><i/></div><small>4 de 5 treinos concluídos</small></div><div className="goal-percent">80%</div></div><div className="motivation"><div className="motivation-mark">“</div><p>Não precisa ser perfeito. Só precisa continuar.</p><span>— SUA MENTALIDADE FITNESS</span></div></article></section>
          <footer className="app-footer"><span>© 2026 FORMA FITNESS CLUB</span><span>Feito para sua melhor versão <span className="footer-heart">♥</span></span></footer>
        </div>
      </main>

      {showPlan && <div className="modal-backdrop" onClick={() => setShowPlan(false)}><section className="plan-modal" onClick={e => e.stopPropagation()}><button className="modal-close" aria-label="Fechar" onClick={() => setShowPlan(false)}><X size={20}/></button><div className="section-kicker">SEU PLANEJAMENTO</div><h2>Agenda de treinos</h2><p className="modal-subtitle">Organize sua semana e mantenha a consistência.</p><div className="modal-plan-list">{plans.map((plan, i) => <div className="modal-plan-row" key={plan.day}><div className={"modal-day " + (plan.active ? "current" : "")}>{plan.day}<strong>{plan.date}</strong></div><div><strong>{plan.name}</strong><small>{plan.type} · {i < 2 ? "Concluído" : plan.active ? "Próximo treino" : "Planejado"}</small></div><span className={i < 2 ? "plan-status complete" : "plan-status"}>{i < 2 ? "Concluído" : plan.active ? "Hoje" : "Agendado"}</span></div>)}</div><button className="green-button modal-done" onClick={() => setShowPlan(false)}>Tudo certo <Check size={17}/></button></section></div>}
    </div>
  );
}
