import { ArrowLeft, ArrowRight, Check, Clock3, LockKeyhole, MessageCircle, ShieldCheck, Zap } from "lucide-react";
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
      <div className="vibra-plans-atmosphere" aria-hidden="true" />
      <div className="vibra-plans-shell">
        <button className="vibra-plans-back" type="button" onClick={() => window.location.assign("/")}>
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao aplicativo
        </button>

        <header className="vibra-plans-header">
          <div className="vibra-plans-brand">
            <img src="/vibra-logo-horizontal.svg" alt="Vibra" />
          </div>
          <p className="vibra-plans-eyebrow"><ShieldCheck size={15} aria-hidden="true" /> ESCOLHA SEU PLANO</p>
          <h1>Seu melhor corpo começa com a <span>escolha certa.</span></h1>
          <p className="vibra-plans-intro">Planos flexíveis para acompanhar em cada fase da sua jornada. Mais do que treino, é evolução com inteligência.</p>
        </header>

        <section className="vibra-plans-content" aria-label="Compare os planos da Vibra">
          <div className="vibra-plans-athlete" role="img" aria-label="Imagem fitness com iluminação dramática em tons roxos">
            <div className="vibra-plans-athlete-overlay">
              <span className="vibra-plans-athlete-kicker"><Zap size={14} aria-hidden="true" /> EVOLUÇÃO CONTÍNUA</span>
              <p>Seu ritmo.<br /><strong>Sua evolução.</strong></p>
            </div>
          </div>

          <div className="vibra-plans-offers">
            <div className="vibra-plans-period" aria-label="Periodicidade disponível">
              <span className="vibra-plans-period-active">Mensal</span>
              <span className="vibra-plans-period-disabled" aria-label="Trimestral indisponível">Trimestral <small>indisponível</small></span>
            </div>
            <div className="vibra-plans-options">
              <article className="vibra-plans-card vibra-plans-card-basic">
                <div className="vibra-plans-status">PLANO ESSENCIAL</div>
                <h2>Vibra <span>Basic</span></h2>
                <p className="vibra-plans-description">O essencial para você começar.</p>
                <p className="vibra-plan-price">{VIBRA_PLANS.basic.priceLabel}<span>/mês</span></p>
                <ul className="vibra-plan-features">
                  <li><span className="vibra-feature-check"><Check size={13} aria-hidden="true" /></span>Acesso à área de treinos</li>
                  <li><span className="vibra-feature-check"><Check size={13} aria-hidden="true" /></span>Biblioteca de exercícios com instruções</li>
                  <li><span className="vibra-feature-check"><Check size={13} aria-hidden="true" /></span>Acompanhamento do progresso</li>
                </ul>
                <Button className="vibra-plans-cta vibra-plans-cta-outline" onClick={() => choosePlan("basic")}>Escolher o Basic <ArrowRight size={17} aria-hidden="true" /></Button>
              </article>

              <article className="vibra-plans-card vibra-plans-card-premium">
                <div className="vibra-plans-popular">MAIS POPULAR</div>
                <div className="vibra-plans-status">EXPERIÊNCIA COMPLETA</div>
                <h2>Vibra <span>Premium</span></h2>
                <p className="vibra-plans-description">Mais recursos para acompanhar sua evolução.</p>
                <p className="vibra-plan-price">{VIBRA_PLANS.premium.priceLabel}<span>/mês</span></p>
                <ul className="vibra-plan-features">
                  <li><span className="vibra-feature-check"><Check size={13} aria-hidden="true" /></span>Todos os recursos do Basic</li>
                  <li><span className="vibra-feature-check"><Check size={13} aria-hidden="true" /></span>Recursos avançados de acompanhamento</li>
                  <li><span className="vibra-feature-check"><Check size={13} aria-hidden="true" /></span>Apoio da Vibra AI para dúvidas de treino</li>
                </ul>
                <Button className="vibra-plans-cta vibra-plans-cta-filled" onClick={() => choosePlan("premium")}>Escolher o Premium <ArrowRight size={17} aria-hidden="true" /></Button>
              </article>
            </div>
          </div>
        </section>

        <section className="vibra-plans-trust" aria-label="Informações importantes">
          <div className="vibra-trust-item"><span className="vibra-trust-icon"><LockKeyhole size={18} aria-hidden="true" /></span><div><strong>Pagamento seguro</strong><p>Confira os métodos disponíveis no checkout.</p></div></div>
          <div className="vibra-trust-item"><span className="vibra-trust-icon"><Clock3 size={18} aria-hidden="true" /></span><div><strong>Controle da assinatura</strong><p>Consulte as condições de renovação e cancelamento.</p></div></div>
          <div className="vibra-trust-item"><span className="vibra-trust-icon"><MessageCircle size={18} aria-hidden="true" /></span><div><strong>Suporte</strong><p>Encontre ajuda pelos canais de atendimento disponíveis.</p></div></div>
        </section>

        <footer className="vibra-plans-footer">
          <span className="vibra-footer-zap"><Zap size={16} aria-hidden="true" /></span>
          <strong>Pronto para transformar sua rotina?</strong>
          <p>Escolha seu plano e comece sua jornada com a Vibra.</p>
          <small>A seleção do plano não confirma pagamento nem libera acesso. A cobrança e a liberação dependem de confirmação válida no backend.</small>
        </footer>
      </div>
    </main>
  );
}
