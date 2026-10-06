import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({ component: InvestmentSimulator });

function InvestmentSimulator() {
  const [amount, setAmount] = useState(100);
  const [days, setDays] = useState(30);

  const projection = useMemo(() => {
    const principal = Math.max(10, Number(amount) || 10);
    const period = Math.max(1, Number(days) || 1);
    const monthlyRate = 0.01;
    const finalValue = principal * Math.pow(1 + monthlyRate, period / 30);
    return { principal, period, gain: finalValue - principal, finalValue };
  }, [amount, days]);

  const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="investment-site">
      <header className="site-header">
        <a href="#inicio" className="brand">Investe<span>Simples</span></a>
        <nav><a href="#simulador">Simulador</a><a href="#como-funciona">Como funciona</a><a href="#seguranca">Segurança</a></nav>
        <a className="header-button" href="#simulador">Simular</a>
      </header>

      <main>
        <section id="inicio" className="hero">
          <div className="hero-copy">
            <div className="badge">SIMULADOR FINANCEIRO</div>
            <h1>Planeje seu futuro com <span>clareza.</span></h1>
            <p>Faça simulações a partir de R$ 10 e visualize como diferentes prazos e valores podem evoluir. Esta ferramenta é educativa e não movimenta dinheiro real.</p>
            <div className="hero-actions"><a className="primary" href="#simulador">Começar simulação</a><a className="secondary" href="#como-funciona">Entenda primeiro ↓</a></div>
          </div>
          <div className="hero-card">
            <div className="card-top"><span>Projeção ilustrativa</span><span>↗</span></div>
            <strong>{money(projection.finalValue)}</strong>
            <small>valor projetado</small>
            <div className="chart"><i/><i/><i/><i/><i/><i/><i/><i/></div>
            <div className="card-footer"><span>Inicial {money(projection.principal)}</span><span>+{money(projection.gain)}</span></div>
          </div>
        </section>

        <section id="simulador" className="simulator section">
          <div className="section-heading"><div className="eyebrow">SIMULADOR</div><h2>Veja uma projeção em segundos</h2><p>Ajuste o valor e o prazo. O resultado abaixo é apenas uma estimativa matemática.</p></div>
          <div className="sim-grid">
            <div className="controls">
              <label>Valor inicial <b>{money(Math.max(10, Number(amount) || 10))}</b></label>
              <input type="number" min="10" step="10" value={amount} onChange={e => setAmount(Number(e.target.value))}/>
              <input type="range" min="10" max="100000" step="10" value={Math.max(10, Number(amount) || 10)} onChange={e => setAmount(Number(e.target.value))}/>
              <label>Prazo <b>{days} dias</b></label>
              <input type="range" min="1" max="365" value={days} onChange={e => setDays(Number(e.target.value))}/>
              <div className="note">Valor mínimo para simulação: R$ 10,00.</div>
            </div>
            <div className="result-card">
              <span>VALOR PROJETADO</span><strong>{money(projection.finalValue)}</strong>
              <div className="result-line"><span>Valor inicial</span><b>{money(projection.principal)}</b></div>
              <div className="result-line"><span>Ganho estimado</span><b>{money(projection.gain)}</b></div>
              <div className="result-line"><span>Prazo</span><b>{projection.period} dias</b></div>
              <small>Taxa usada na simulação: 1% ao mês, somente para fins ilustrativos.</small>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="section steps">
          <div className="section-heading"><div className="eyebrow">COMO FUNCIONA</div><h2>Informação antes de qualquer decisão</h2></div>
          <div className="step-grid"><article><b>01</b><h3>Escolha um valor</h3><p>Comece com R$ 10 ou qualquer outro valor para testar diferentes cenários.</p></article><article><b>02</b><h3>Defina o prazo</h3><p>Compare períodos curtos e longos e observe o efeito da capitalização.</p></article><article><b>03</b><h3>Analise o cenário</h3><p>Use os números como referência educacional, não como promessa de retorno.</p></article></div>
        </section>

        <section id="seguranca" className="security section">
          <div><div className="eyebrow">TRANSPARÊNCIA</div><h2>Sem promessa de lucro garantido.</h2><p>Investimentos reais envolvem riscos, custos e condições que variam conforme o produto e a instituição financeira. Este site é um simulador educativo e não recebe depósitos, não oferece investimentos e não promete rendimento.</p></div>
          <div className="security-list"><span>✓ Sem depósito real</span><span>✓ Sem promessa de retorno</span><span>✓ Simulação transparente</span></div>
        </section>
      </main>

      <footer><div className="brand">Investe<span>Simples</span></div><p>© 2026 InvesteSimples · Ferramenta educacional.</p><a href="#inicio">Voltar ao topo ↑</a></footer>
    </div>
  );
}
