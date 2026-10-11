import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { signOut } from "../lib/supabase";
import { formatPlanInterval, formatPlanPrice, loadPublicPlansConfig, type PublicPlan } from "../config/plans";
import "./PlansPage.css";

export function PlansPage() {
  const [interestRegistered, setInterestRegistered] = useState<string | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);

  useEffect(() => {
    let active = true;
    loadPublicPlansConfig()
      .then((config) => {
        if (active) setPlans(config.plans.filter((plan) => plan.status === "published"));
      })
      .catch(() => {
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
          <ArrowLeft size={16} /> Sair e voltar para a Vibra
        </button>
        <div className="vibra-plans-brand"><span>V</span> vibra<span>.</span></div>
        <p className="vibra-plans-eyebrow"><ShieldCheck size={15} /> ACESSO E PLANOS</p>
        <h1>Seu próximo passo,<br /><span>no seu ritmo.</span></h1>
        <p className="vibra-plans-intro">
          Consulte os planos disponíveis. Os valores e benefícios só serão exibidos quando forem definidos e publicados na configuração oficial.
          Nenhuma assinatura será ativada nem pagamento será solicitado nesta etapa.
        </p>

        {plansLoading ? (
          <section className="vibra-plans-card" aria-live="polite">Carregando os planos...</section>
        ) : plansError ? (
          <section className="vibra-plans-card" role="status">
            <div className="vibra-plans-status">PLANOS INDISPONÍVEIS</div>
            <h2>Não foi possível carregar os planos</h2>
            <p>Não vamos exibir valores desatualizados ou presumidos. Tente novamente mais tarde.</p>
            <Button className="vibra-plans-cta" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </section>
        ) : plans.length === 0 ? (
          <section className="vibra-plans-card" aria-labelledby="vibra-plans-card-title">
            <div className="vibra-plans-card-icon"><Clock3 size={22} /></div>
            <div className="vibra-plans-status">PLANOS EM PREPARAÇÃO</div>
            <h2 id="vibra-plans-card-title">Em breve na Vibra</h2>
            <p>
              Os planos, preços, periodicidades e benefícios ainda não foram publicados.
              Assim que estiverem definidos, poderão ser atualizados na configuração central sem editar esta página.
            </p>
            {interestRegistered ? (
              <div className="vibra-plans-confirmation" role="status">
                <CheckCircle2 size={18} /> Interesse registrado nesta sessão. Nenhuma contratação foi realizada.
              </div>
            ) : (
              <Button className="vibra-plans-cta" onClick={() => setInterestRegistered("plans")}>
                Tenho interesse em conhecer os planos
              </Button>
            )}
            <small>Este registro é temporário e não altera sua conta nem cria uma assinatura.</small>
          </section>
        ) : (
          <section className="vibra-plans-list" aria-label="Planos disponíveis">
            {plans.map((plan) => (
              <article className="vibra-plans-card" key={plan.id}>
                <div className="vibra-plans-status">PLANO DISPONÍVEL</div>
                <h2>{plan.name}</h2>
                {plan.description && <p>{plan.description}</p>}
                <div className="vibra-plans-price">{formatPlanPrice(plan)}</div>
                <div className="vibra-plans-period">{formatPlanInterval(plan.interval)}</div>
                {plan.benefits.length > 0 && (
                  <ul className="vibra-plans-benefits">
                    {plan.benefits.map((benefit) => <li key={benefit}><CheckCircle2 size={16} />{benefit}</li>)}
                  </ul>
                )}
                {interestRegistered === plan.id ? (
                  <div className="vibra-plans-confirmation" role="status">
                    <CheckCircle2 size={18} /> Interesse registrado nesta sessão. Nenhuma contratação foi realizada.
                  </div>
                ) : (
                  <Button className="vibra-plans-cta" onClick={() => setInterestRegistered(plan.id)}>
                    Tenho interesse neste plano
                  </Button>
                )}
                <small>Seleção de interesse apenas. Não inicia checkout nem ativa assinatura.</small>
              </article>
            ))}
          </section>
        )}
        <p className="vibra-plans-footnote">A Vibra não solicita pagamento nesta página.</p>
      </div>
    </main>
  );
}
