import { ArrowLeft, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Button } from "./ui/button";
import "./PlansPage.css";

export function PlansPage() {
  return (
    <main className="vibra-plans-page">
      <div className="vibra-plans-glow" aria-hidden="true" />
      <div className="vibra-plans-shell">
        <button className="vibra-plans-back" type="button" onClick={() => window.location.assign("/")}>
          <ArrowLeft size={16} /> Voltar ao aplicativo
        </button>
        <div className="vibra-plans-brand"><span>V</span> vibra<span>.</span></div>
        <p className="vibra-plans-eyebrow"><ShieldCheck size={15} /> ESCOLHA SEU PLANO</p>
        <h1>Seu próximo passo,<br /><span>no seu ritmo.</span></h1>
        <p className="vibra-plans-intro">Escolha o plano ideal para acompanhar sua evolução na Vibra.</p>
        <section className="vibra-plans-options" aria-label="Planos disponíveis">
          <article className="vibra-plans-card">
            <div className="vibra-plans-status">PLANO ESSENCIAL</div>
            <h2>Basic</h2>
            <p className="vibra-plan-price">R$ 29,90 <span>/ mês</span></p>
            <ul className="vibra-plan-features">
              <li><Check size={16}/> Acesso à área de treinos</li>
              <li><Check size={16}/> Biblioteca de exercícios com instruções</li>
              <li><Check size={16}/> Acompanhamento do progresso</li>
            </ul>
            <Button className="vibra-plans-cta" onClick={() => window.location.assign("/")}>Escolher Basic <ArrowRight size={17}/></Button>
          </article>
          <article className="vibra-plans-card vibra-plans-card-premium">
            <div className="vibra-plans-status">MAIS RECURSOS</div>
            <h2>Premium</h2>
            <p className="vibra-plan-price">R$ 49,90 <span>/ mês</span></p>
            <ul className="vibra-plan-features">
              <li><Check size={16}/> Todos os recursos do Basic</li>
              <li><Check size={16}/> Recursos avançados de acompanhamento</li>
              <li><Check size={16}/> Apoio da Vibra AI para dúvidas de treino</li>
            </ul>
            <Button className="vibra-plans-cta" onClick={() => window.location.assign("/")}>Escolher Premium <ArrowRight size={17}/></Button>
          </article>
        </section>
        <p className="vibra-plans-footnote">Os planos e preços são exibidos para sua escolha. A contratação e a cobrança online ainda não estão conectadas nesta etapa.</p>
      </div>
    </main>
  );
}
