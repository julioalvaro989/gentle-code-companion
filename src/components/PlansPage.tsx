import { useState } from "react";
import { ArrowLeft, ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { signOut } from "../lib/supabase";
import "./PlansPage.css";

export function PlansPage() {
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
          Sua conta está autenticada. Os planos e as condições comerciais ainda estão sendo preparados.
          Nenhuma assinatura será ativada nem pagamento será solicitado nesta etapa.
        </p>
        <section className="vibra-plans-card" aria-labelledby="vibra-plans-card-title">
          <div className="vibra-plans-card-icon"><Clock3 size={22} /></div>
          <div className="vibra-plans-status">PLANOS EM PREPARAÇÃO</div>
          <h2 id="vibra-plans-card-title">Em breve na Vibra</h2>
          <p>
            Estamos finalizando as informações de planos, preços, benefícios e contratação.
            Até que exista uma verificação segura de assinatura ativa, o acesso à área premium permanece bloqueado.
          </p>
          <Button className="vibra-plans-cta" onClick={() => window.location.assign("/")}>
            Continuar para o aplicativo <ArrowRight size={17} />
          </Button>
          <small>Você já pode acessar a página inicial e explorar as funcionalidades disponíveis na sua conta. Nenhuma contratação ou pagamento será realizado.</small>
        </section>
        <p className="vibra-plans-footnote">A Vibra não solicita pagamento nesta página.</p>
      </div>
    </main>
  );
}
