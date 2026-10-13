import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Activity, AlertCircle, Bot, CircleDollarSign, ClipboardList, CreditCard,
  LayoutDashboard, LogOut, Settings2, ShieldCheck, Users, Wallet, ArrowLeft,
  LockKeyhole, Database,
} from "lucide-react";
import { adoptSupabaseSession, signIn, signOut, type AuthSession } from "../lib/supabase";
import { supabase } from "../integrations/supabase/client";
import "./admin.css";

type AdminModule = "overview" | "customers" | "plans" | "ai" | "finance" | "settings" | "audit";
type AdminAccess = { admin: boolean; allowed: boolean; reason?: string };

const navigation: { id: AdminModule; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "plans", label: "Planos e assinaturas", icon: CreditCard },
  { id: "ai", label: "Vibra AI e custos", icon: Bot },
  { id: "finance", label: "Financeiro", icon: Wallet },
  { id: "settings", label: "Configurações", icon: Settings2 },
  { id: "audit", label: "Auditoria", icon: ClipboardList },
];

const moduleCopy: Record<AdminModule, { title: string; subtitle: string; kicker: string }> = {
  overview: { title: "Visão geral", subtitle: "Acompanhe a operação da Vibra em um só lugar. Métricas sem uma fonte administrativa verificada são identificadas como indisponíveis.", kicker: "RESUMO DA OPERAÇÃO" },
  customers: { title: "Clientes", subtitle: "Consulte os dados mínimos de cadastro e o estado das contas quando a API administrativa estiver configurada.", kicker: "GESTÃO DE CLIENTES" },
  plans: { title: "Planos e assinaturas", subtitle: "Visualização somente leitura dos planos e estados confirmados pela integração de cobrança.", kicker: "ASSINATURAS" },
  ai: { title: "Vibra AI e custos", subtitle: "Uso, tokens e estimativas de custo dependem de telemetria persistida no backend.", kicker: "USO DE INTELIGÊNCIA ARTIFICIAL" },
  finance: { title: "Financeiro", subtitle: "Valores financeiros devem vir de eventos de cobrança confirmados, não de estimativas inventadas.", kicker: "VISÃO FINANCEIRA" },
  settings: { title: "Configurações", subtitle: "Estado das integrações e parâmetros administrativos sem exibir segredos.", kicker: "SAÚDE DAS INTEGRAÇÕES" },
  audit: { title: "Auditoria", subtitle: "Registro de ações administrativas requer um armazenamento de auditoria protegido no servidor.", kicker: "TRILHA DE AUDITORIA" },
};

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Administração — Vibra" },
    { name: "description", content: "Painel privado de administração da Vibra." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AdminPage,
});

async function verifyAdminOnServer(session: AuthSession): Promise<AdminAccess> {
  const { data, error } = await supabase.functions.invoke("vibra-admin-session", {
    body: { action: "claim" },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    const context = (error as { context?: { status?: number } }).context;
    if (context?.status === 401 || context?.status === 403) {
      throw new Error("A sessão não pôde ser autenticada pelo serviço administrativo. Entre novamente.");
    }
    throw new Error("A autorização administrativa está indisponível ou não configurada. Nenhum acesso foi concedido. Verifique a Edge Function e a configuração do Supabase.");
  }
  if (!data || typeof data.admin !== "boolean" || typeof data.allowed !== "boolean") {
    throw new Error("O serviço de autorização retornou uma resposta inválida. O painel permaneceu bloqueado.");
  }
  return { admin: data.admin, allowed: data.allowed, reason: typeof data.reason === "string" ? data.reason : undefined };
}

function AdminPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeModule, setActiveModule] = useState<AdminModule>("overview");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!current) return;
        const access = await verifyAdminOnServer(current);
        if (!alive) return;
        if (!access.admin) {
          await signOut();
          if (alive) window.location.replace("/");
          return;
        }
        if (!access.allowed) {
          setAuthNotice(access.reason === "session_limit"
            ? "O limite de sessões administrativas simultâneas foi atingido. Encerre outra sessão e tente novamente."
            : "A conta não possui autorização administrativa ativa.");
          await signOut();
          return;
        }
        setSession(current);
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "Não foi possível validar a autorização administrativa.");
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAuthNotice("");
    setLoading(true);
    try {
      const current = await signIn(email.trim(), password);
      const access = await verifyAdminOnServer(current);
      if (!access.admin) {
        await signOut();
        window.location.replace("/");
        return;
      }
      if (!access.allowed) {
        await signOut();
        setAuthNotice(access.reason === "session_limit"
          ? "O limite de sessões administrativas simultâneas foi atingido. Encerre outra sessão e tente novamente."
          : "A autorização administrativa não está ativa para esta conta.");
        return;
      }
      setSession(current);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível validar o acesso.");
    } finally {
      setLoading(false);
      setReady(true);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setSession(null);
      setPassword("");
      setLoading(false);
    }
  }

  if (!ready) {
    return <div className="admin-auth-page"><div className="admin-auth-card"><div className="admin-eyebrow"><ShieldCheck size={15}/> VIBRA · ÁREA RESTRITA</div><h1>Validando autorização</h1><p>Confirmando a sessão e as permissões no serviço administrativo.</p></div></div>;
  }

  if (!session) {
    return <div className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <div className="admin-eyebrow"><ShieldCheck size={15}/> VIBRA · ÁREA RESTRITA</div>
        <h1 id="admin-login-title">Painel administrativo</h1>
        <p>Entre com sua conta Vibra. O acesso só será concedido após validação da autorização no servidor.</p>
        <form className="admin-auth-form" onSubmit={login}>
          <label>E-mail da conta<input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@exemplo.com"/></label>
          <label>Senha<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Sua senha"/></label>
          <button className="admin-submit" type="submit" disabled={loading}>{loading ? "Validando acesso…" : <><LockKeyhole size={15}/> Entrar com segurança</>}</button>
        </form>
        {error && <div className="admin-auth-error" role="alert"><AlertCircle size={14} style={{verticalAlign:"-2px",marginRight:6}}/>{error}</div>}
        {authNotice && <div className="admin-auth-info" role="status">{authNotice}</div>}
        <a className="admin-auth-back" href="/"><ArrowLeft size={14}/> Voltar para a Vibra</a>
        <p style={{fontSize:10,margin:"22px 0 0",color:"#6f7188"}}>Acesso negado por padrão. Não há credenciais administrativas locais nem modo de demonstração.</p>
      </section>
    </div>;
  }

  const currentModule = moduleCopy[activeModule];
  return <div className="admin-shell">
    <div className="admin-frame">
      <aside className="admin-sidebar" aria-label="Navegação administrativa">
        <div className="admin-brand"><img src="/vibra-icon.svg" alt=""/><div className="admin-brand-name">vibra<span>.</span><small>ADMIN CONSOLE</small></div></div>
        <div className="admin-nav-label">ESPAÇO DE TRABALHO</div>
        <nav className="admin-nav">
          {navigation.map(item => { const Icon = item.icon; return <button key={item.id} type="button" aria-current={activeModule === item.id ? "page" : undefined} onClick={() => setActiveModule(item.id)}><Icon size={17}/><span>{item.label}</span></button>; })}
        </nav>
        <div className="admin-sidebar-foot"><strong><span className="admin-status-dot"/>Sessão verificada</strong><p>Autorização confirmada pelo serviço administrativo. Os dados operacionais continuam sujeitos às permissões do backend.</p></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-label">Vibra / Administração<strong>{currentModule.title}</strong></div>
          <div className="admin-top-actions"><span className="admin-live-pill"><span className="admin-status-dot" style={{margin:0}}/> Acesso autorizado</span><button type="button" className="admin-logout" onClick={logout} disabled={loading}><LogOut size={15}/><span>Sair</span></button></div>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading"><div><div className="admin-eyebrow"><Activity size={14}/>{currentModule.kicker}</div><h1>{currentModule.title}</h1><p>{currentModule.subtitle}</p></div><div className="admin-live-pill"><ShieldCheck size={14}/> Sessão administrativa validada</div></div>
          {activeModule === "overview" ? <Overview /> : <ModulePanel module={activeModule} />}
          <div style={{display:"flex",alignItems:"center",gap:8,color:"#686981",fontSize:10,marginTop:22}}><LockKeyhole size={13}/> Dados protegidos · sem credenciais ou segredos expostos no navegador</div>
        </div>
      </main>
    </div>
  </div>;
}

function MetricCard({ label, icon: Icon, detail }: { label: string; icon: typeof Users; detail: string }) {
  return <section className="admin-stat-card"><div className="admin-stat-top"><span>{label}</span><span className="admin-stat-icon"><Icon size={17}/></span></div><div className="admin-stat-value">Indisponível</div><div className="admin-stat-foot unavailable">{detail}</div></section>;
}

function EmptyState({ title, children }: { title: string; children: string }) {
  return <div className="admin-empty-state"><div className="admin-empty-icon"><Database size={17}/></div><div><strong>{title}</strong><p>{children}</p></div></div>;
}

function Overview() {
  return <>
    <div className="admin-stat-grid">
      <MetricCard label="Usuários cadastrados" icon={Users} detail="API administrativa não configurada"/>
      <MetricCard label="Assinaturas ativas" icon={CreditCard} detail="Fonte de assinatura não conectada"/>
      <MetricCard label="Receita do período" icon={CircleDollarSign} detail="Eventos financeiros não agregados"/>
      <MetricCard label="Uso da Vibra AI" icon={Bot} detail="Telemetria de tokens indisponível"/>
    </div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Resumo operacional</h2><p>Indicadores aparecem somente quando houver uma fonte real e autorizada.</p></div><span className="admin-live-pill">Somente leitura</span></div><EmptyState title="Integração de métricas pendente">Não há, nesta interface, um endpoint administrativo verificado que agregue clientes, assinaturas, cancelamentos e receita. Nenhum número de demonstração é apresentado como real.</EmptyState></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Integrações</h2><p>Estado conhecido a partir do código do painel; não representa uma verificação remota de saúde.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Serviço</th><th>Estado nesta interface</th><th>Próximo passo</th></tr></thead><tbody><tr><td>Supabase Auth</td><td>Usado para autenticação</td><td className="muted">Autorização administrativa validada pelo endpoint</td></tr><tr><td>Assinaturas / cobrança</td><td className="muted">Não conectado ao painel</td><td className="muted">Criar endpoint administrativo somente leitura</td></tr><tr><td>Vibra AI / custos</td><td className="muted">Não conectado ao painel</td><td className="muted">Persistir uso e custo no backend</td></tr></tbody></table></div></section>
  </>;
}

function ModulePanel({ module }: { module: Exclude<AdminModule, "overview"> }) {
  const content: Record<Exclude<AdminModule, "overview">, { icon: typeof Users; title: string; description: string; columns: string[] }> = {
    customers: { icon: Users, title: "Diretório de clientes", description: "A listagem não é consultada diretamente do navegador porque ainda não foi comprovado um endpoint de listagem protegido por autorização administrativa.", columns: ["Identificador", "Cadastro", "Status", "Assinatura"] },
    plans: { icon: CreditCard, title: "Planos e assinaturas", description: "A leitura será conectada a uma API administrativa somente leitura, preservando os fluxos atuais de cobrança.", columns: ["Plano", "Status", "Atualização", "Origem"] },
    ai: { icon: Bot, title: "Consumo da IA", description: "Tokens, mensagens e custo precisam vir de telemetria persistida e agregada no servidor. A chave do provedor nunca será exposta.", columns: ["Período", "Mensagens", "Tokens", "Custo estimado"] },
    finance: { icon: Wallet, title: "Resumo financeiro", description: "Receita bruta, taxas, despesas e resultado líquido dependem de eventos financeiros confirmados e critérios contábeis definidos.", columns: ["Indicador", "Valor confirmado", "Estimativa", "Período"] },
    settings: { icon: Settings2, title: "Estado das integrações", description: "A interface não lê nem exibe valores secretos e não altera configurações remotas nesta etapa.", columns: ["Integração", "Estado", "Última verificação", "Ação"] },
    audit: { icon: ClipboardList, title: "Eventos administrativos", description: "Para uma trilha confiável, os eventos precisam ser gravados no servidor com responsável autenticado, resultado e timestamp.", columns: ["Data", "Responsável", "Ação", "Resultado"] },
  };
  const item = content[module];
  const Icon = item.icon;
  return <section className="admin-panel"><div className="admin-panel-heading"><div><h2 style={{display:"flex",alignItems:"center",gap:9}}><Icon size={17} color="#b7ff35"/>{item.title}</h2><p>{item.description}</p></div><span className="admin-live-pill">Integração pendente</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{item.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody><tr><td colSpan={item.columns.length}><EmptyState title="Nenhum dado exibido">O backend administrativo necessário ainda não está configurado/verificado. Por segurança, esta tela não faz consultas amplas a tabelas pelo token do navegador e não mostra dados fictícios.</EmptyState></td></tr></tbody></table></div></section>;
}
