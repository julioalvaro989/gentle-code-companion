import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  getProfile,
  getSiteSettings,
  getStoredSession,
  signIn,
  signOut,
  updateSiteSettings,
  uploadBanner,
  type AuthSession,
  type SiteSettings,
} from "../lib/supabase";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const fields: Array<[keyof SiteSettings, string]> = [
  ["brand_name", "Nome da marca"],
  ["nav_simulator", "Menu: simulador"],
  ["nav_how", "Menu: como funciona"],
  ["nav_security", "Menu: segurança"],
  ["hero_badge", "Selo do topo"],
  ["hero_title", "Título principal"],
  ["hero_description", "Descrição principal"],
  ["hero_primary_button", "Botão principal"],
  ["hero_secondary_button", "Botão secundário"],
  ["simulator_title", "Título do simulador"],
  ["simulator_description", "Descrição do simulador"],
  ["simulator_note", "Aviso abaixo dos controles"],
  ["result_label", "Título do resultado"],
  ["result_disclaimer", "Aviso do resultado"],
  ["how_title", "Título: como funciona"],
  ["step1_title", "Etapa 1 - título"],
  ["step1_description", "Etapa 1 - descrição"],
  ["step2_title", "Etapa 2 - título"],
  ["step2_description", "Etapa 2 - descrição"],
  ["step3_title", "Etapa 3 - título"],
  ["step3_description", "Etapa 3 - descrição"],
  ["security_title", "Título: segurança"],
  ["security_description", "Descrição: segurança"],
  ["footer_text", "Texto do rodapé"],
];

function AdminPage() {
  const [session, setSession] = useState<AuthSession | null>(getStoredSession());
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    getProfile(session).then(setProfile).catch(() => setProfile(null));
    getSiteSettings().then(value => setSettings(value ?? null)).catch(err => setError(err instanceof Error ? err.message : "Não foi possível carregar as configurações."));
  }, [session]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const next = await signIn(email.trim(), password);
      const nextProfile = await getProfile(next);
      if (!nextProfile?.is_admin) {
        await signOut();
        throw new Error("Este usuário não possui permissão de administrador.");
      }
      setProfile(nextProfile);
      setSession(next);
      setSettings(await getSiteSettings() ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally { setLoading(false); }
  }

  async function save() {
    if (!session || !settings) return;
    setError(""); setStatus("Salvando...");
    try {
      const saved = await updateSiteSettings(session, settings);
      if (saved) setSettings(saved);
      setStatus("Salvo. O site público atualiza automaticamente.");
      window.setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setStatus("");
    }
  }

  async function changeBanner(file?: File) {
    if (!session || !file) return;
    if (!file.type.startsWith("image/")) { setError("Selecione uma imagem válida."); return; }
    setError(""); setStatus("Enviando banner...");
    try {
      const banner_url = await uploadBanner(session, file);
      setSettings(prev => prev ? { ...prev, banner_url } : prev);
      const saved = await updateSiteSettings(session, { banner_url });
      if (saved) setSettings(saved);
      setStatus("Banner publicado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o banner.");
    }
  }

  if (!session) return (
    <div className="admin-page">
      <div className="admin-card admin-login">
        <div className="eyebrow">ÁREA RESTRITA</div>
        <h1>Painel administrativo</h1>
        <p>Entre com uma conta marcada como administradora.</p>
        <form onSubmit={login}>
          <input required type="email" placeholder="E-mail do administrador" value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="auth-error">{error}</div>}
          <button className="primary full" disabled={loading}>{loading ? "Entrando..." : "Entrar no painel"}</button>
        </form>
        <a className="admin-back" href="/">← Voltar para o site</a>
      </div>
    </div>
  );

  if (!profile?.is_admin) return (
    <div className="admin-page"><div className="admin-card"><h1>Acesso negado</h1><p>Esta conta não é administradora.</p><button className="primary" onClick={() => { signOut(); setSession(null); }}>Sair</button></div></div>
  );

  if (!settings) return <div className="admin-page"><div className="admin-card"><h1>Carregando painel...</h1>{error && <div className="auth-error">{error}</div>}</div></div>;

  return (
    <div className="admin-page">
      <div className="admin-wrap">
        <header className="admin-header">
          <div><div className="eyebrow">PAINEL ADMIN</div><h1>Controle do site</h1><p>Altere textos, cores e banner sem editar o código.</p></div>
          <div className="admin-actions"><a href="/">Ver site</a><button onClick={() => { signOut(); setSession(null); }}>Sair</button></div>
        </header>

        {error && <div className="auth-error admin-message">{error}</div>}
        {status && <div className="admin-success">{status}</div>}

        <section className="admin-card">
          <h2>Textos do site</h2>
          <div className="admin-fields">
            {fields.map(([key, label]) => (
              <label key={String(key)}>{label}
                {String(settings[key] ?? "").length > 90 ? (
                  <textarea value={String(settings[key] ?? "")} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
                ) : (
                  <input value={String(settings[key] ?? "")} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <h2>Cores em tempo real</h2>
          <div className="color-grid">
            {(["primary_color", "background_color", "surface_color", "text_color"] as const).map(key => (
              <label key={key}>{key === "primary_color" ? "Cor principal" : key === "background_color" ? "Fundo" : key === "surface_color" ? "Superfícies" : "Texto"}
                <div className="color-row"><input type="color" value={settings[key]} onChange={e => setSettings({ ...settings, [key]: e.target.value })}/><input value={settings[key]} onChange={e => setSettings({ ...settings, [key]: e.target.value })}/></div>
              </label>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <h2>Banner da página inicial</h2>
          <p className="admin-help">Escolha uma imagem do computador. Ela ficará armazenada no Lovable Cloud/Supabase.</p>
          {settings.banner_url && <img className="admin-banner-preview" src={settings.banner_url} alt="Banner atual" />}
          <input type="file" accept="image/*" onChange={e => changeBanner(e.target.files?.[0])} />
          {settings.banner_url && <button className="danger-button" onClick={async () => { if (!session) return; setSettings({ ...settings, banner_url: null }); await updateSiteSettings(session, { banner_url: null }); setStatus("Banner removido."); }}>Remover banner</button>}
        </section>

        <button className="primary admin-save" onClick={save}>Salvar todas as alterações</button>
      </div>
    </div>
  );
}
