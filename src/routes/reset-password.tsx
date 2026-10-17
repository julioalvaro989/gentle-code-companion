import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "../components/AuthPage.css";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        setErrorMessage("");
      } else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        setHasSession(false);
      }
      if (event === "PASSWORD_RECOVERY" && session) setHasSession(true);
      if (event === "INITIAL_SESSION") setChecking(false);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setErrorMessage("Não foi possível validar o link de recuperação. Solicite um novo link.");
        setHasSession(false);
      } else {
        setHasSession(Boolean(data.session));
        if (!data.session) setErrorMessage("Este link é inválido, expirou ou já foi utilizado. Solicite um novo link de recuperação.");
      }
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      setHasSession(false);
      setErrorMessage("Não foi possível validar o link de recuperação. Solicite um novo link.");
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!hasSession) {
      setErrorMessage("Sua sessão de recuperação não está válida. Solicite um novo link.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("A senha deve conter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas não correspondem.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setHasSession(false);
        throw new Error("Sua sessão expirou. Solicite um novo link de recuperação.");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message.includes("sessão expirou")
        ? error.message
        : "Não foi possível atualizar a senha. Confira os requisitos e solicite um novo link se necessário.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="vibra-auth-page">
    <div className="va-background va-background-purple" aria-hidden="true" />
    <div className="va-background va-background-lime" aria-hidden="true" />
    <main className="va-layout va-reset-layout">
      <section className="va-story" aria-label="Sobre o Vibra">
        <div className="va-brand"><img className="va-brand-logo va-brand-logo-lg" src="/vibra-logo-horizontal.svg" alt="Vibra — Fitness com IA" /></div>
        <div className="va-story-copy">
          <div className="va-eyebrow"><Sparkles size={14} /> ACESSO SEGURO</div>
          <h1>Uma nova senha.<br /><span>Um novo começo.</span></h1>
          <p>Defina uma senha nova para continuar sua jornada na Vibra.</p>
        </div>
      </section>
      <section className="va-auth-panel" aria-labelledby="reset-title">
        <div className="va-panel-top">
          <span className="va-mobile-brand"><img className="va-brand-logo" src="/vibra-logo-horizontal.svg" alt="Vibra — Fitness com IA" /></span>
          <span className="va-secure"><span /> RECUPERAÇÃO DE CONTA</span>
        </div>
        <div className="va-form-heading">
          <div className="va-form-eyebrow">RECUPERAÇÃO DE ACESSO</div>
          <h2 id="reset-title">{success ? <>Senha <span>atualizada.</span></> : <>Crie sua nova <span>senha.</span></>}</h2>
          <p>{success ? "Sua senha foi alterada com sucesso. Você já pode voltar ao login." : "Use uma senha que você ainda não utiliza em outros serviços."}</p>
        </div>
        {checking ? <p role="status" className="va-message">Validando o link de recuperação...</p> : success ? <div className="va-form"><div role="status" className="va-message va-success">Senha atualizada com sucesso.</div><button type="button" className="va-submit" onClick={() => window.location.assign("/?auth=login")}>Voltar ao login <ArrowRight size={17}/></button></div> : !hasSession ? <div className="va-form"><div role="alert" className="va-message va-error">{errorMessage || "Este link não está válido. Solicite um novo link de recuperação."}</div><button type="button" className="va-submit" onClick={() => window.location.assign("/?auth=login")}>Voltar ao login <ArrowLeft size={17}/></button></div> : <form className="va-form" onSubmit={submitNewPassword}>
          <label>Nova senha<div className="va-password-field"><input required minLength={6} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo de 6 caracteres" value={newPassword} onChange={event => setNewPassword(event.target.value)} /><button type="button" className="va-password-toggle" aria-label={showPassword ? "Ocultar nova senha" : "Mostrar nova senha"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>
          <label>Confirmar nova senha<input required minLength={6} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Digite a senha novamente" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
          {errorMessage && <div role="alert" className="va-message va-error">{errorMessage}</div>}
          <button disabled={busy} type="submit" className="va-submit">{busy ? <><span className="va-spinner" /> Salvando...</> : <>Atualizar senha <LockKeyhole size={17}/></>}</button>
        </form>}
      </section>
    </main>
  </div>;
}
