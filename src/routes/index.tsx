import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { adoptSupabaseSession, getProfile, getSiteSettings, getStoredSession, signIn, signInWithGoogle, signOut, signUp, type SiteSettings } from "../lib/supabase";

export const Route = createFileRoute("/")({ component: InvestmentApp });

const fallback: SiteSettings = {
  brand_name: "InvesteSimples", nav_simulator: "Simulador", nav_how: "Como funciona", nav_security: "Segurança",
  hero_badge: "SIMULAÇÃO EDUCATIVA", hero_title: "Cada valor que você colocar rende 10% ao dia.",
  hero_description: "Esta é uma simulação hipotética de 10% ao dia, apenas para fins educativos.",
  hero_primary_button: "Abrir simulação", hero_secondary_button: "Como funciona ↓",
  simulator_title: "Sua projeção financeira", simulator_description: "Cada valor informado é projetado com 10% ao dia nesta simulação hipotética.",
  simulator_note: "Valor mínimo para simulação: R$ 10,00.", result_label: "VALOR PROJETADO",
  result_disclaimer: "Taxa usada: 10% ao dia, somente nesta simulação hipotética. Não é rendimento real nem promessa de lucro.",
  how_title: "Informação antes de qualquer decisão",
  step1_title: "Cadastre-se", step1_description: "Seu nome e e-mail ficam associados à sua conta no banco de dados do projeto.",
  step2_title: "Simule", step2_description: "Escolha valor e prazo para comparar cenários de forma simples.",
  step3_title: "Analise", step3_description: "Use a projeção apenas como ferramenta educativa; investimentos reais envolvem riscos.",
  security_title: "Seus dados protegidos.", security_description: "O cadastro usa autenticação do Lovable Cloud/Supabase.",
  footer_text: "© 2026 InvesteSimples · Ferramenta educacional.", primary_color: "#63e6a4",
  background_color: "#07110d", surface_color: "#0d1b15", text_color: "#f4f8f5", banner_url: null
};

function InvestmentApp() {
  const [session, setSession] = useState(getStoredSession());
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [settings, setSettings] = useState<SiteSettings>(fallback);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [amount, setAmount] = useState(100);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => getSiteSettings().then(value => { if (active && value) setSettings(value); }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (session) getProfile(session).then(setProfile).catch(() => setProfile(null));
  }, [session]);

  useEffect(() => {
    if (!session) adoptSupabaseSession().then(s => { if (s) setSession(s); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitGoogle() {
    setError(""); setLoading(true);
    try {
      const s = await signInWithGoogle();
      if (s) setSession(s);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível entrar com o Google."); }
    finally { setLoading(false); }
  }

  const projection = useMemo(() => {
    const principal = Math.max(10, Number(amount) || 10);
    const period = Math.max(1, Number(days) || 1);
    const finalValue = principal * Math.pow(1.10, period);
    return { principal, period, gain: finalValue - principal, finalValue };
  }, [amount, days]);

  const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const theme = { "--green": settings.primary_color, "--bg": settings.background_color, "--surface": settings.surface_color, "--text": settings.text_color } as CSSProperties;

  async function submitAuth(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Informe seu nome.");
        const created = await signUp(name.trim(), email.trim(), password);
        if (!created) {
          setMode("login");
          setError("Conta criada. Entre com o e-mail e a senha cadastrados.");
        } else setSession(created);
      } else setSession(await signIn(email.trim(), password));
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível concluir."); }
    finally { setLoading(false); }
  }

  if (!session) return (
    <div className="auth-page" style={theme}>
      <div className="auth-brand">{settings.brand_name}</div>
      <div className="auth-card">
        <div className="eyebrow">{mode === "signup" ? "PRIMEIRO ACESSO" : "ENTRAR"}</div>
        <h1>{mode === "signup" ? "Crie sua conta" : "Acesse sua simulação"}</h1>
        <p>{mode === "signup" ? "Preencha nome, e-mail e senha para acessar sua área de simulação." : "Entre com seu e-mail e senha para continuar."}</p>
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
      <small className="auth-foot">A autenticação é feita pelo Lovable Cloud/Supabase. A senha não é armazenada em texto aberto.</small>
    </div>
  );

  return (
    <div className="investment-site" style={theme}>
      <header className="site-header">
        <a href="#inicio" className="brand">{settings.brand_name}</a>
        <nav><a href="#simulador">{settings.nav_simulator}</a><a href="#como-funciona">{settings.nav_how}</a><a href="#seguranca">{settings.nav_security}</a></nav>
        <div className="user-area"><span>Olá, {profile?.full_name || "cliente"}</span><button onClick={() => { signOut(); setSession(null); setProfile(null); }}>Sair</button></div>
      </header>
      <main>
        <section id="inicio" className="hero" style={settings.banner_url ? { backgroundImage: `linear-gradient(rgba(7,17,13,.78),rgba(7,17,13,.9)), url("${settings.banner_url}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          <div className="hero-copy"><div className="badge">{settings.hero_badge}</div><h1>{settings.hero_title}</h1><p>Olá, {profile?.full_name || "cliente"}. {settings.hero_description}</p><div className="hero-actions"><a className="primary" href="#simulador">{settings.hero_primary_button}</a><a className="secondary" href="#como-funciona">{settings.hero_secondary_button}</a></div></div>
          <div className="hero-card"><div className="card-top"><span>Projeção ilustrativa</span><span>↗</span></div><strong>{money(projection.finalValue)}</strong><small>valor projetado</small><div className="chart"><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="card-footer"><span>Inicial {money(projection.principal)}</span><span>+{money(projection.gain)}</span></div></div>
        </section>

        <section id="simulador" className="simulator section"><div className="section-heading"><div className="eyebrow">SIMULADOR</div><h2>{settings.simulator_title}</h2><p>{settings.simulator_description}</p></div><div className="sim-grid"><div className="controls"><label>Valor inicial <b>{money(Math.max(10, Number(amount) || 10))}</b></label><input type="number" min="10" step="10" value={amount} onChange={e => setAmount(Number(e.target.value))}/><input type="range" min="10" max="100000" step="10" value={Math.max(10, Number(amount) || 10)} onChange={e => setAmount(Number(e.target.value))}/><label>Prazo <b>{days} dias</b></label><input type="range" min="1" max="365" value={days} onChange={e => setDays(Number(e.target.value))}/><div className="note">{settings.simulator_note}</div></div><div className="result-card"><span>{settings.result_label}</span><strong>{money(projection.finalValue)}</strong><div className="result-line"><span>Valor inicial</span><b>{money(projection.principal)}</b></div><div className="result-line"><span>Ganho estimado</span><b>{money(projection.gain)}</b></div><div className="result-line"><span>Prazo</span><b>{projection.period} dias</b></div><small>{settings.result_disclaimer}</small></div></div></section>

        <section id="como-funciona" className="section steps"><div className="section-heading"><div className="eyebrow">COMO FUNCIONA</div><h2>{settings.how_title}</h2></div><div className="step-grid"><article><b>01</b><h3>{settings.step1_title}</h3><p>{settings.step1_description}</p></article><article><b>02</b><h3>{settings.step2_title}</h3><p>{settings.step2_description}</p></article><article><b>03</b><h3>{settings.step3_title}</h3><p>{settings.step3_description}</p></article></div></section>

        <section id="seguranca" className="security section"><div><div className="eyebrow">TRANSPARÊNCIA</div><h2>{settings.security_title}</h2><p>{settings.security_description}</p></div><div className="security-list"><span>✓ Conta individual</span><span>✓ Perfil salvo no banco</span><span>✓ Simulação após login</span></div></section>
      </main>
      <footer><div className="brand">{settings.brand_name}</div><p>{settings.footer_text}</p><a href="#inicio">Voltar ao topo ↑</a></footer>
    </div>
  );
}
