import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getProfile, getStoredSession, signIn, signOut, signUp } from "../lib/supabase";

export const Route = createFileRoute("/")({ component: InvestmentApp });

function InvestmentApp() {
  const [session, setSession] = useState(getStoredSession());
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [amount, setAmount] = useState(100);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (session) getProfile(session).then(setProfile).catch(() => setProfile(null)); }, [session]);

  const projection = useMemo(() => {
    const principal = Math.max(10, Number(amount) || 10);
    const period = Math.max(1, Number(days) || 1);
    const monthlyRate = 0.01;
    const finalValue = principal * Math.pow(1 + monthlyRate, period / 30);
    return { principal, period, gain: finalValue - principal, finalValue };
  }, [amount, days]);
  const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  async function submitAuth(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Informe seu nome.");
        const created = await signUp(name.trim(), email.trim(), password);
        if (!created) {
          setMode("login");
          setError("Cadastro criado. Se a confirmação de e-mail estiver ativada, confirme o e-mail e depois entre com seus dados.");
        } else setSession(created);
      } else setSession(await signIn(email.trim(), password));
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível concluir o cadastro."); }
    finally { setLoading(false); }
  }

  if (!session) return (
    <div className="auth-page">
      <div className="auth-brand">Investe<span>Simples</span></div>
      <div className="auth-card">
        <div className="eyebrow">{mode === "signup" ? "PRIMEIRO ACESSO" : "ENTRAR"}</div>
        <h1>{mode === "signup" ? "Crie sua conta" : "Acesse sua simulação"}</h1>
        <p>{mode === "signup" ? "Cadastre seus dados para ter acesso à sua área de simulação." : "Entre com seu e-mail e senha para continuar."}</p>
        <form onSubmit={submitAuth}>
          {mode === "signup" && <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" autoComplete="name" />}
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" autoComplete="email" />
          <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (mínimo 6 caracteres)" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          {error && <div className="auth-error">{error}</div>}
          <button className="primary full" disabled={loading}>{loading ? "Aguarde..." : mode === "signup" ? "Criar conta e acessar" : "Entrar"}</button>
        </form>
        <button className="switch-auth" onClick={() => { setError(""); setMode(mode === "signup" ? "login" : "signup"); }}>
          {mode === "signup" ? "Já tenho uma conta → Entrar" : "Ainda não tenho conta → Cadastrar"}
        </button>
      </div>
      <small className="auth-foot">Seus dados de autenticação são tratados pelo Lovable Cloud/Supabase. A senha não é armazenada em texto aberto.</small>
    </div>
  );

  return (
    <div className="investment-site">
      <header className="site-header"><a href="#inicio" className="brand">Investe<span>Simples</span></a><nav><a href="#simulador">Simulador</a><a href="#como-funciona">Como funciona</a><a href="#seguranca">Segurança</a></nav><div className="user-area"><span>Olá, {profile?.full_name || "cliente"}</span><button onClick={() => { signOut(); setSession(null); setProfile(null); }}>Sair</button></div></header>
      <main>
        <section id="inicio" className="hero"><div className="hero-copy"><div className="badge">ÁREA DO CLIENTE</div><h1>Planeje seu futuro com <span>clareza.</span></h1><p>Olá, {profile?.full_name || "cliente"}. Sua conta está conectada e sua simulação está disponível imediatamente.</p><div className="hero-actions"><a className="primary" href="#simulador">Abrir simulação</a><a className="secondary" href="#como-funciona">Como funciona ↓</a></div></div><div className="hero-card"><div className="card-top"><span>Projeção ilustrativa</span><span>↗</span></div><strong>{money(projection.finalValue)}</strong><small>valor projetado</small><div className="chart"><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="card-footer"><span>Inicial {money(projection.principal)}</span><span>+{money(projection.gain)}</span></div></div></section>
        <section id="simulador" className="simulator section"><div className="section-heading"><div className="eyebrow">SIMULADOR</div><h2>Sua projeção financeira</h2><p>Ajuste o valor e o prazo. O resultado é uma estimativa matemática para fins educativos.</p></div><div className="sim-grid"><div className="controls"><label>Valor inicial <b>{money(Math.max(10, Number(amount) || 10))}</b></label><input type="number" min="10" step="10" value={amount} onChange={e => setAmount(Number(e.target.value))}/><input type="range" min="10" max="100000" step="10" value={Math.max(10, Number(amount) || 10)} onChange={e => setAmount(Number(e.target.value))}/><label>Prazo <b>{days} dias</b></label><input type="range" min="1" max="365" value={days} onChange={e => setDays(Number(e.target.value))}/><div className="note">Valor mínimo para simulação: R$ 10,00.</div></div><div className="result-card"><span>VALOR PROJETADO</span><strong>{money(projection.finalValue)}</strong><div className="result-line"><span>Valor inicial</span><b>{money(projection.principal)}</b></div><div className="result-line"><span>Ganho estimado</span><b>{money(projection.gain)}</b></div><div className="result-line"><span>Prazo</span><b>{projection.period} dias</b></div><small>Taxa usada: 1% ao mês, somente para fins ilustrativos. Isso não representa promessa de rendimento.</small></div></div></section>
        <section id="como-funciona" className="section steps"><div className="section-heading"><div className="eyebrow">COMO FUNCIONA</div><h2>Informação antes de qualquer decisão</h2></div><div className="step-grid"><article><b>01</b><h3>Cadastre-se</h3><p>Seu nome e e-mail ficam associados à sua conta no banco de dados do projeto.</p></article><article><b>02</b><h3>Simule</h3><p>Escolha valor e prazo para comparar cenários de forma simples.</p></article><article><b>03</b><h3>Analise</h3><p>Use a projeção apenas como ferramenta educativa; investimentos reais envolvem riscos.</p></article></div></section>
        <section id="seguranca" className="security section"><div><div className="eyebrow">TRANSPARÊNCIA</div><h2>Seus dados protegidos.</h2><p>O cadastro usa autenticação do Lovable Cloud/Supabase. A senha é processada pelo serviço de autenticação e não é gravada pela aplicação em texto aberto.</p></div><div className="security-list"><span>✓ Conta individual</span><span>✓ Perfil salvo no banco</span><span>✓ Simulação após login</span></div></section>
      </main>
      <footer><div className="brand">Investe<span>Simples</span></div><p>© 2026 InvesteSimples · Ferramenta educacional.</p><a href="#inicio">Voltar ao topo ↑</a></footer>
    </div>
  );
}
