import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowLeft, LogOut, Users, ShieldCheck, RefreshCw } from "lucide-react";
import { adoptSupabaseSession, getProfile, listFitnessProfiles, signIn, signOut, type AuthSession, type FitnessProfile } from "../lib/supabase";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<FitnessProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = await adoptSupabaseSession();
        if (!current) return;
        const profile = await getProfile(current);
        if (!alive) return;
        if (!profile?.is_admin) { await signOut(); setError("Esta conta não possui permissão de administrador."); }
        else { setSession(current); await loadUsers(current, alive); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : "Não foi possível validar o acesso."); }
      finally { if (alive) setReady(true); }
    })();
    return () => { alive = false; };
  }, []);

  async function loadUsers(current: AuthSession, alive = true) {
    setLoading(true);
    try { const rows = await listFitnessProfiles(current); if (alive) setUsers(rows); }
    catch (e) { if (alive) setError(e instanceof Error ? e.message : "Não foi possível carregar os clientes."); }
    finally { if (alive) setLoading(false); }
  }

  async function login(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const current = await signIn(email.trim(), password);
      const profile = await getProfile(current);
      if (!profile?.is_admin) { await signOut(); throw new Error("Acesso negado. Esta conta ainda não foi autorizada como administradora."); }
      setSession(current);
      await loadUsers(current);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar no painel."); }
    finally { setLoading(false); setReady(true); }
  }

  async function logout() { try { await signOut(); } catch { setError("A sessão local foi encerrada, mas o provedor não confirmou o logout remoto."); } finally { setSession(null); setUsers([]); } }

  if (!ready) return <div className="admin-page"><div className="admin-card"><h1>Validando acesso...</h1></div></div>;

  if (!session) return <div className="admin-page" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"radial-gradient(ellipse at top right,#7900FF,transparent 48%),#05060B"}}>
    <div className="admin-card admin-login" style={{width:"min(100%,440px)",background:"#0B0C16",border:"1px solid #29233F",borderRadius:24,color:"#fff"}}>
      <div style={{color:"#B7FF35",fontSize:12,fontWeight:800,letterSpacing:2}}>VIBRA · ÁREA RESTRITA</div>
      <h1 style={{color:"#fff"}}>Painel administrativo</h1>
      <p style={{color:"#A8B4D8"}}>Entre com o e-mail e a senha da conta autorizada como administradora.</p>
      <form onSubmit={login} style={{display:"grid",gap:12}}>
        <input required type="email" autoComplete="username" placeholder="E-mail do administrador" value={email} onChange={e=>setEmail(e.target.value)} />
        <input required type="password" autoComplete="current-password" placeholder="Senha do administrador" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="primary full" disabled={loading}>{loading ? "Validando..." : "Entrar no painel"}</button>
      </form>
      <a className="admin-back" href="/">← Voltar para a Vibra</a>
    </div>
  </div>;

  return <div className="admin-page" style={{minHeight:"100vh",background:"#05060B",color:"#fff",padding:"28px 16px"}}>
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:28}}>
        <div><div style={{color:"#B7FF35",fontSize:12,fontWeight:800,letterSpacing:2}}>VIBRA · ADMIN</div><h1 style={{fontSize:36,margin:"8px 0"}}>Painel de controle</h1><p style={{color:"#A8B4D8",margin:0}}>Clientes e atividade cadastrados no banco de dados.</p></div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><a className="admin-back" href="/"><ArrowLeft size={16}/> Ver aplicativo</a><button className="primary" onClick={()=>loadUsers(session)} disabled={loading}><RefreshCw size={16}/> Atualizar</button><button className="danger-button" onClick={logout}><LogOut size={16}/> Sair</button></div>
      </header>
      {error && <div className="auth-error admin-message">{error}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:22}}>
        <section className="admin-card" style={{background:"#0B0C16",border:"1px solid #29233F",borderRadius:20,color:"#fff"}}><Users color="#B7FF35"/><p style={{color:"#A8B4D8"}}>Clientes cadastrados</p><strong style={{fontSize:34}}>{users.length}</strong></section>
        <section className="admin-card" style={{background:"#0B0C16",border:"1px solid #29233F",borderRadius:20,color:"#fff"}}><Activity color="#B7FF35"/><p style={{color:"#A8B4D8"}}>Banco de dados</p><strong style={{fontSize:23}}>Conectado</strong></section>
        <section className="admin-card" style={{background:"#0B0C16",border:"1px solid #29233F",borderRadius:20,color:"#fff"}}><ShieldCheck color="#B7FF35"/><p style={{color:"#A8B4D8"}}>Permissões</p><strong style={{fontSize:23}}>Protegidas</strong></section>
      </div>
      <section className="admin-card" style={{background:"#0B0C16",border:"1px solid #29233F",borderRadius:20,color:"#fff"}}>
        <h2>Clientes Vibra</h2>
        {loading && <p>Carregando clientes...</p>}
        {!loading && users.length === 0 && <p style={{color:"#A8B4D8"}}>Ainda não há clientes cadastrados ou a lista não pôde ser carregada.</p>}
        {users.length > 0 && <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:12,borderBottom:"1px solid #29233F"}}>Usuário</th><th style={{padding:12,borderBottom:"1px solid #29233F"}}>E-mail</th><th style={{padding:12,borderBottom:"1px solid #29233F"}}>Cadastro</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td style={{padding:12,borderBottom:"1px solid #29233F"}}>{u.username}</td><td style={{padding:12,borderBottom:"1px solid #29233F"}}>{u.email}</td><td style={{padding:12,borderBottom:"1px solid #29233F"}}>{u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </div>;
}
