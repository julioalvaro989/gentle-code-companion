import { ArrowLeft, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Button } from "./ui/button";
import "./PlansPage.css";
import { VIBRA_PLANS, VIBRA_SELECTED_PLAN_KEY, type VibraPlanId } from "../lib/plans";

export function PlansPage() {
  function choosePlan(plan: VibraPlanId) {
    try { window.localStorage.setItem(VIBRA_SELECTED_PLAN_KEY, plan); } catch { /* URL keeps the choice for this navigation. */ }
    window.location.assign(`/?auth=signup&plan=${plan}`);
  }
  return (
    <main className="vibra-plans-page">
      <div className="vibra-plans-glow" aria-hidden="true" />
      <div className="vibra-plans-shell">
        <button className="vibra-plans-back" type="button" onClick={() => window.location.assign("/")}>
          <ArrowLeft size={16} /> Voltar ao aplicativo
        </button>
        <div className="vibra-plans-brand"><img src="/vibra-logo-horizontal.svg" alt="Vibra" style={{ width: 150, height: "auto", display: "block" }} /></div>
        <p className="vibra-plans-eyebrow"><ShieldCheck size={15} /> ESCOLHA SEU PLANO</p>
        <h1>Seu próximo passo,<br /><span>no seu ritmo.</span></h1>
        <p className="vibra-plans-intro">Escolha o plano ideal para acompanhar sua evolução na Vibra.</p>
        <section className="vibra-plans-options" aria-label="Planos disponíveis">
          <article className="vibra-plans-card">
            <div className="vibra-plans-status">PLANO ESSENCIAL</div>
            <h2>Basic</h2>
            <p className="vibra-plan-price">{VIBRA_PLANS.basic.priceLabel} <span>/ mês</span></p>
            <ul className="vibra-plan-features">
              <li><Check size={16}/> Acesso à área de treinos</li>
              <li><Check size={16}/> Biblioteca de exercícios com instruções</li>
              <li><Check size={16}/> Acompanhamento do progresso</li>
            </ul>
            <Button className="vibra-plans-cta" onClick={() => choosePlan("basic")}>Escolher Basic <ArrowRight size={17}/></Button>
          </article>
          <article className="vibra-plans-card vibra-plans-card-premium">
            <div className="vibra-plans-status">MAIS RECURSOS</div>
            <h2>Premium</h2>
            <p className="vibra-plan-price">{VIBRA_PLANS.premium.priceLabel} <span>/ mês</span></p>
            <ul className="vibra-plan-features">
              <li><Check size={16}/> Todos os recursos do Basic</li>
              <li><Check size={16}/> Recursos avançados de acompanhamento</li>
              <li><Check size={16}/> Apoio da Vibra AI para dúvidas de treino</li>
            </ul>
            <Button className="vibra-plans-cta" onClick={() => choosePlan("premium")}>Escolher Premium <ArrowRight size={17}/></Button>
          </article>
        </section>
        <p className="vibra-plans-footnote">Os valores são propostas comerciais. A escolha fica registrada para continuar o cadastro, mas não confirma pagamento nem libera recursos. O checkout só será iniciado quando a integração real estiver configurada.</p>
      </div>
    </main>
  );
}
