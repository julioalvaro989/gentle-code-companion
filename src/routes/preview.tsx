import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Leaf, ShieldCheck, Sparkles, Target } from "lucide-react";
import { adoptSupabaseSession, getFitnessOnboarding, type AuthSession, type FitnessOnboardingRecord } from "../lib/supabase";
import "./onboarding.css";

export const Route = createFileRoute("/preview")({
  head: () => ({ meta: [{ title: "Sua prévia personalizada — Avirafit" }, { name: "description", content: "Confira um resumo das preferências que você compartilhou com a Avirafit." }] }),
  component: PersonalizedPreview,
});

function PersonalizedPreview() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<FitnessOnboardingRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!current) { window.location.replace("/?auth=login&next=%2Fpreview"); return; }
        const saved = await getFitnessOnboarding(current);
        if (!saved || saved.status !== "completed") { window.location.replace("/onboarding"); return; }
        if (active) { setSession(current); setProfile(saved); }
      } catch { if (active) setError("Não foi possível carregar sua prévia. Tente novamente."); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, []);

  if (!ready) return <main className="onboarding-page onboarding-loading">Carregando sua prévia...</main>;
  if (!session || !profile) return <main className="onboarding-page"><section className="onboarding-card"><p role="alert">{error || "Não foi possível carregar o perfil."}</p><button className="onboarding-next" onClick={()=>window.location.reload()}>Tentar novamente</button></section></main>;

  const a = profile.answers;
  return <main className="onboarding-page">
    <div className="onboarding-glow onboarding-glow-purple" aria-hidden="true"/><div className="onboarding-glow onboarding-glow-green" aria-hidden="true"/>
    <div className="onboarding-shell onboarding-preview-shell">
      <header className="onboarding-header"><a className="onboarding-brand" href="/"><span className="onboarding-brand-icon"><Dumbbell size={19}/></span> avirafit<span>.</span></a><span className="onboarding-private"><span/> PRÉVIA DO SEU PERFIL</span></header>
      <section className="onboarding-card onboarding-preview-card">
        <div className="onboarding-preview-hero"><div className="onboarding-step-icon"><Sparkles/></div><p className="onboarding-eyebrow">UM PRIMEIRO PASSO PERSONALIZADO</p><h1>Seu próximo passo começa aqui.</h1><p>Organizamos as preferências que você compartilhou para ajudar a orientar sua experiência na Avirafit.</p></div>
        <div className="onboarding-preview-grid">
          <article className="onboarding-preview-tile"><Target/><small>SEU OBJETIVO</small><strong>{a.primaryGoal}</strong>{a.secondaryGoals.length>0&&<p>Também: {a.secondaryGoals.join(", ")}</p>}</article>
          <article className="onboarding-preview-tile"><Dumbbell/><small>SUA ROTINA DE TREINO</small><strong>{a.daysPerWeek ? a.daysPerWeek+" dias por semana" : "Rotina a definir"}</strong><p>{[a.experience,a.sessionMinutes?a.sessionMinutes+" min por sessão":"",a.trainingLocation].filter(Boolean).join(" · ") || "Suas preferências poderão orientar os próximos passos."}</p></article>
          <article className="onboarding-preview-tile"><Leaf/><small>PREFERÊNCIAS ALIMENTARES</small><strong>{a.preferredFoods.length ? a.preferredFoods.slice(0,3).join(", ") : "Preferências não informadas"}</strong><p>{a.foodBudget ? "Orçamento estimado: R$ "+a.foodBudget+(a.foodBudgetPeriod==="weekly"?" por semana":" por mês") : "Nenhum orçamento informado."}</p></article>
        </div>
        <div className="onboarding-preview-explainer"><ShieldCheck/><div><strong>Como isso ajuda a personalizar sua experiência</strong><p>Essas informações podem orientar a organização de metas, preferências e rotina. Esta é uma prévia das respostas fornecidas, não um plano de treino ou alimentação completo e não substitui avaliação de profissionais de saúde.</p></div></div>
        <div className="onboarding-preview-actions"><button className="onboarding-back" onClick={()=>window.location.assign("/onboarding?edit=1")}><ArrowLeft size={17}/> Editar meu perfil</button><button className="onboarding-next" onClick={()=>window.location.assign("/plans")}>Ver planos e continuar <ArrowRight size={17}/></button></div>
      </section>
      <p className="onboarding-footer-note">Você continua no controle das suas escolhas.</p>
    </div>
  </main>;
}
