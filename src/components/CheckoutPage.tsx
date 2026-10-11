import { useEffect, useState } from "react";
import { Activity, ArrowLeft, CheckCircle2, Clock3, RefreshCw, ShieldAlert } from "lucide-react";
import { adoptSupabaseSession, getVibraAccess, type AuthSession, type VibraAccess } from "../lib/supabase";
import { VIBRA_PLANS, VIBRA_SELECTED_PLAN_KEY, isVibraPlanId } from "../lib/plans";

export function CheckoutPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [access, setAccess] = useState<VibraAccess | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [providerMissing, setProviderMissing] = useState(false);
  const planFromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("plan") : null;
  let storedPlan: string | null = null;
  try { storedPlan = typeof window !== "undefined" ? window.localStorage.getItem(VIBRA_SELECTED_PLAN_KEY) : null; } catch { /* URL can carry the choice. */ }
  const planId = isVibraPlanId(planFromUrl) ? planFromUrl : isVibraPlanId(storedPlan) ? storedPlan : access?.planId ?? null;
  const plan = planId ? VIBRA_PLANS[planId] : null;

  async function verify() {
    setChecking(true); setError(""); setProviderMissing(false);
    try {
      const current = await adoptSupabaseSession();
      if (!current) { window.location.replace("/?auth=login"); return; }
      setSession(current);
      const result = await getVibraAccess(current);
      setAccess(result);
      if (result.status === "active") {
        window.location.replace(result.profileCompleted ? "/" : "/fitness-profile");
        return;
      }
    } catch {
      setProviderMissing(true);
      setError("Não foi possível consultar um registro confiável de pagamento. A integração de checkout/confirmação ainda precisa ser configurada e validada no backend.");
    } finally { setChecking(false); }
  }

  useEffect(() => { void verify(); }, []);

  return <main style={{ minHeight: "100vh", padding: "24px 16px", display: "grid", placeItems: "center", background: "radial-gradient(circle at 80% 5%, #24163d 0, transparent 35%), #080810", color: "#f8f7ff" }}>
    <section style={{ width: "min(100%, 620px)", padding: "clamp(22px,5vw,40px)", border: "1px solid #302b43", borderRadius: 24, background: "rgba(18,17,29,.96)", boxShadow: "0 28px 80px #0006" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}><span style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: "#b9f35b", color: "#151521" }}><Activity size={23}/></span><strong style={{ fontSize: 23 }}>vibra<span style={{ color: "#b9f35b" }}>.</span></strong></div>
      <p style={{ color: "#b9f35b", letterSpacing: 2, fontSize: 12, fontWeight: 800 }}>ETAPA 1 · CONFIRMAÇÃO DE PAGAMENTO</p>
      <h1 style={{ fontSize: "clamp(29px,5vw,42px)", lineHeight: 1.1, margin: "10px 0 14px" }}>Seu acesso será liberado <span style={{ color: "#b9f35b" }}>após a confirmação.</span></h1>
      <p style={{ color: "#b8b4c9", lineHeight: 1.7 }}>A seleção do plano e o cadastro não confirmam pagamento. O Vibra consulta o status registrado no backend e mantém os recursos bloqueados enquanto não houver uma confirmação válida.</p>
      {plan && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 16, border: "1px solid #39334d", borderRadius: 14, margin: "22px 0" }}><div><small style={{ color: "#a9a4bc" }}>Plano selecionado</small><h2 style={{ margin: "4px 0" }}>{plan.name}</h2></div><strong style={{ fontSize: 20 }}>{plan.priceLabel}<small style={{ fontSize: 12, color: "#a9a4bc" }}>/mês</small></strong></div>}
      <div role="status" style={{ borderRadius: 14, padding: 16, background: access?.status === "pending" ? "#2b2418" : "#202033", display: "flex", gap: 12, alignItems: "flex-start", marginTop: 20 }}>
        {checking ? <RefreshCw size={20}/> : providerMissing ? <ShieldAlert size={20} color="#ffbd69"/> : access?.status === "pending" ? <Clock3 size={20} color="#ffbd69"/> : <Clock3 size={20}/>}
        <div><strong>{checking ? "Verificando status…" : providerMissing ? "Verificação indisponível" : access?.status === "pending" ? "Pagamento ainda não confirmado" : "Checkout ainda não configurado"}</strong><p style={{ margin: "6px 0 0", color: "#c3bfd2", lineHeight: 1.6, fontSize: 14 }}>{checking ? "Aguarde enquanto consultamos o registro de acesso." : error || (access?.status === "pending" ? "Existe um registro pendente. O acesso continua bloqueado até a confirmação real do provedor." : "Não foi encontrada uma integração de cobrança validada neste projeto. Nenhuma cobrança foi iniciada e não é possível marcar o pagamento como aprovado por aqui.")}</p></div>
      </div>
      <p style={{ color: "#8f8aa4", fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>Conta: {session?.user.email || "validando sessão"} · O retorno a esta página não libera acesso por si só.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
        <button type="button" onClick={() => void verify()} disabled={checking} style={{ display: "inline-flex", gap: 8, alignItems: "center", border: 0, borderRadius: 12, padding: "12px 16px", background: "#b9f35b", color: "#14141d", fontWeight: 800, cursor: checking ? "wait" : "pointer" }}><RefreshCw size={16}/> Verificar novamente</button>
        <button type="button" onClick={() => window.location.assign("/plans")} style={{ display: "inline-flex", gap: 8, alignItems: "center", border: "1px solid #413a56", borderRadius: 12, padding: "12px 16px", background: "transparent", color: "#f8f7ff", cursor: "pointer" }}><ArrowLeft size={16}/> Alterar plano</button>
      </div>
      <p style={{ color: "#a7a2b9", fontSize: 12, marginTop: 22 }}><CheckCircle2 size={14} style={{ verticalAlign: "middle" }}/> Assim que a integração real registrar a confirmação, você poderá retomar o fluxo sem refazer o cadastro.</p>
    </section>
  </main>;
}
