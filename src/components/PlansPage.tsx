import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { signOut } from "../lib/supabase";
import { formatPlanInterval, formatPlanPrice, loadPublicPlansConfig, type PublicPlan } from "../config/plans";
import "./PlansPage.css";

export function PlansPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);

  useEffect(() => {
    let active = true;
    loadPublicPlansConfig()
      .then((config) => {
        if (active) setPlans(config.plans.filter((plan) => plan.status === "published"));
      })
      .catch((error: unknown) => {
        console.error("[Vibra plans] Falha ao carregar /plans-config.json:", error);
        if (active) {
          setPlans([]);
          setPlansError(true);
        }
      })
      .finally(() => { if (active) setPlansLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="vibra-plans-page">
      <div className="vibra-plans-glow" aria-hidden="true" />
      <div className="vibra-plans-shell">
        <button className="vibra-plans-back" type="button" onClick={async () => {
          try { await signOut(); } finally { window.location.replace("/"); }
        }}>
          <ArrowLeft size={16} /> Sair e voltar para a Avirafit
        </button>
        <div className="vibra-plans-brand"><span>A</span> avirafit<span>.</span></div>
        <p className="vibra-plans-eyebrow"><ShieldCheck size={15} /> ACESSO E PLANOS</p>
        <h1>Seu próximo passo,<br /><span>no seu ritmo.</span></h1>
        <p className="vibra-plans-intro">
          Compare as opções da Avirafit. Os preços e os limites do Avirafit AI ainda estão em definição.
          Nenhuma contratação ou ativação de assinatura acontece nesta página.
        </p>

        {plansLoading ? (
          <section className="vibra-plans-message" aria-live="polite">Carregando os planos...</section>
        ) : plansError ? (
          <section className="vibra-plans-message" role="alert">
            <div className="vibra-plans-status">ERRO DE CONFIGURAÇÃO</div>
            <h2>Não foi possível carregar os planos</h2>
            <p>O catálogo de planos está temporariamente indisponível. Nenhuma contratação foi realizada. Tente novamente.</p>
            <Button className="vibra-plans-cta" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </section>
        ) : plans.length === 0 ? (
          <section className="vibra-plans-message" role="status">
            <h2>Nenhum plano publicado na configuração</h2>
            <p>O catálogo foi carregado, mas não contém planos publicados. Verifique public/plans-config.json. Nenhum plano foi contratado.</p>
          </section>
        ) : (
          <section className="vibra-plans-list" aria-label="Planos disponíveis">
            {plans.map((plan) => {
              const premium = plan.id === "premium";
              return (
                <article className={`vibra-plans-card ${premium ? "vibra-plans-card-premium" : ""}`} key={plan.id}>
                  {premium && <div className="vibra-plans-featured"><Sparkles size={14} /> MAIS RECURSOS</div>}
                  <div className="vibra-plans-status">{premium ? "PLANO AVANÇADO" : "PLANO ESSENCIAL"}</div>
                  <h2>{plan.name}</h2>
                  <p>{plan.description}</p>
                  <div className="vibra-plans-price">{formatPlanPrice(plan)}</div>
                  <div className="vibra-plans-period">{formatPlanInterval(plan.interval)}</div>
                  <ul className="vibra-plans-benefits">
                    {plan.benefits.map((benefit) => <li key={benefit}><CheckCircle2 size={16} />{benefit}</li>)}
                    <li><CheckCircle2 size={16} />{plan.aiLimits.summary}</li>
                    {plan.advancedPersonalization === "available" && <li><CheckCircle2 size={16} />Personalização avançada disponível</li>}
                    {plan.advancedPersonalization === "under_review" && <li className="vibra-plans-pending">Personalização avançada: em avaliação, ainda não disponível</li>}
                  </ul>
                  <Button className="vibra-plans-cta" disabled title="A contratação ainda não está disponível">
                    Contratação em breve
                  </Button>
                  <small>Contratação indisponível no momento. Não há checkout, cobrança ou ativação de assinatura nesta página.</small>
                </article>
              );
            })}
          </section>
        )}
        <p className="vibra-plans-footnote">Preços e limites de IA serão definidos antes da abertura das contratações.</p>
      </div>
    </main>
  );
}
