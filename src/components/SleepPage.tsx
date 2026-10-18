import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Check, Clock3, MoonStar, Pencil, RefreshCw, Save, Sparkles, Trash2, X } from "lucide-react";
import type { AuthSession } from "../lib/supabase";
import { deleteSleepSession, finishSleepSession, listSleepSessions, startSleepSession, updateSleepSessionDetails } from "../lib/supabase";
import { formatSleepDate, formatSleepDuration, getLastSevenNightAverage, getSleepDurationSeconds, type SleepSession } from "../lib/sleep-utils";
import "./SleepPage.css";

type Props = { session: AuthSession; onOpenProgress?: () => void };

const feelings = [
  { value: "refrescado", label: "Refrescado" },
  { value: "normal", label: "Normal" },
  { value: "cansado", label: "Ainda cansado" },
];

export function SleepPage({ session, onOpenProgress }: Props) {
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const [quality, setQuality] = useState("3");
  const [feeling, setFeeling] = useState("normal");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuality, setEditQuality] = useState("3");
  const [editFeeling, setEditFeeling] = useState("normal");
  const [editNotes, setEditNotes] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const rows = await listSleepSessions(session);
      setSessions(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar seus registros de sono.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!sessions.some((item) => !item.ended_at)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const updateOnFocus = () => { if (document.visibilityState === "visible") { setNow(Date.now()); void refresh(); } };
    document.addEventListener("visibilitychange", updateOnFocus);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", updateOnFocus); };
  }, [sessions, refresh]);

  const active = sessions.find((item) => !item.ended_at) ?? null;
  const completed = useMemo(() => sessions.filter((item) => item.ended_at && item.duration_seconds != null), [sessions]);
  const average = useMemo(() => getLastSevenNightAverage(completed, new Date(now)), [completed, now]);
  const duration = active ? getSleepDurationSeconds(active, now) ?? 0 : 0;
  const nightsThisWeek = useMemo(() => {
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
    return completed.filter((item) => new Date(item.ended_at as string) >= start && new Date(item.ended_at as string) <= new Date(now) && (item.duration_seconds ?? 0) > 0 && (item.duration_seconds ?? 0) <= 18 * 3600).length;
  }, [completed, now]);

  const start = async () => {
    if (busy || active) return;
    setBusy(true); setError(""); setNotice("");
    try { await startSleepSession(session); await refresh(); setNotice("Seu período de sono foi iniciado e salvo na sua conta."); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível iniciar o registro."); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (busy || !active) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await finishSleepSession(session, active.id, { quality_rating: Number(quality), wake_feeling: feeling, notes: notes.trim() || null });
      await refresh(); setNotes(""); setNotice("Sono finalizado. O tempo foi calculado pelo servidor e seu registro foi salvo.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível finalizar. Sua sessão continua registrada."); }
    finally { setBusy(false); }
  };

  const saveEdit = async (item: SleepSession) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await updateSleepSessionDetails(session, item.id, { quality_rating: Number(editQuality), wake_feeling: editFeeling, notes: editNotes.trim() || null });
      setEditingId(null); await refresh(); setNotice("Detalhes atualizados.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar este registro."); }
    finally { setBusy(false); }
  };

  const remove = async (item: SleepSession) => {
    if (!window.confirm("Excluir este registro de sono? Esta ação não pode ser desfeita.")) return;
    setBusy(true); setError(""); setNotice("");
    try { await deleteSleepSession(session, item.id); await refresh(); setNotice("Registro excluído."); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir o registro."); }
    finally { setBusy(false); }
  };

  return <section className="fit-page-section sleep-page">
    <div className="sleep-eyebrow"><MoonStar size={16}/> SONO E RECUPERAÇÃO</div>
    <div className="sleep-heading">
      <div><h1>Seu descanso, <span>em equilíbrio.</span></h1><p className="fit-page-intro">Registre quando for dormir e finalize ao acordar. Seu histórico fica vinculado à sua conta.</p></div>
      <button type="button" className="sleep-secondary-button" onClick={() => { setLoading(true); void refresh(); }} disabled={loading}><RefreshCw size={16}/> Atualizar</button>
    </div>

    {error && <div className="sleep-alert sleep-alert-error" role="alert">{error}</div>}
    {notice && <div className="sleep-alert sleep-alert-success" role="status"><Check size={16}/>{notice}</div>}

    <div className="sleep-summary-grid">
      <article className="sleep-summary-card sleep-summary-feature">
        <span className="sleep-summary-icon"><MoonStar size={20}/></span>
        <span className="sleep-summary-label">MÉDIA DOS ÚLTIMOS 7 DIAS</span>
        <strong>{average == null ? "—" : formatSleepDuration(average)}</strong>
        <small>{average == null ? "Ainda não há noites válidas suficientes neste período." : "Média calculada a partir dos registros válidos encontrados."}</small>
      </article>
      <article className="sleep-summary-card"><span className="sleep-summary-icon"><Activity size={20}/></span><span className="sleep-summary-label">NOITES REGISTRADAS</span><strong>{nightsThisWeek}</strong><small>Registros válidos nos últimos 7 dias.</small></article>
      <article className="sleep-summary-card"><span className="sleep-summary-icon"><AlarmClock size={20}/></span><span className="sleep-summary-label">REFERÊNCIA GERAL</span><strong>7–9 h</strong><small>Faixa frequentemente recomendada para adultos; necessidades variam.</small></article>
    </div>

    <article className="sleep-active-card">
      <div className="sleep-active-orb"><MoonStar size={28}/></div>
      <div className="sleep-active-copy"><span className="sleep-summary-label">{active ? "SESSÃO EM ANDAMENTO" : "PRONTO PARA DESCANSAR?"}</span><h2>{active ? "Seu descanso está sendo contado." : "Comece seu registro de sono."}</h2><p>{active ? "O contador usa o horário salvo e continua correto ao voltar para esta tela." : "Toque para registrar o início. Você pode sair da tela; o horário permanece salvo."}</p>
        {active && <div className="sleep-timer" aria-live="off">{formatSleepDuration(duration)} <small>em andamento</small></div>}
        {active && <div className="sleep-active-meta"><Clock3 size={15}/> Iniciado em {formatSleepDate(active.started_at)}</div>}
      </div>
      {!active ? <button type="button" className="sleep-primary-button" onClick={() => void start()} disabled={busy || loading}><MoonStar size={17}/> {busy ? "Salvando…" : "Iniciar sono"}</button> : <div className="sleep-finish-form">
        <label>Como você acordou?<select value={feeling} onChange={(e) => setFeeling(e.target.value)}>{feelings.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Qualidade do sono<select value={quality} onChange={(e) => setQuality(e.target.value)}>{[1,2,3,4,5].map((value) => <option key={value} value={String(value)}>{value} de 5</option>)}</select></label>
        <label className="sleep-notes-label">Observações (opcional)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Como foi sua noite?"/></label>
        <button type="button" className="sleep-primary-button" onClick={() => void finish()} disabled={busy}><Check size={17}/>{busy ? "Finalizando…" : "Finalizar sono"}</button>
      </div>}
    </article>

    <section className="sleep-history-section">
      <div className="sleep-history-heading"><div><span className="sleep-summary-label">SEU HISTÓRICO</span><h2>Registros de sono</h2><p>Somente dados retornados pelo banco da sua conta são exibidos.</p></div><span className="sleep-history-count">{completed.length} finalizado{completed.length === 1 ? "" : "s"}</span></div>
      {loading ? <div className="sleep-empty"><RefreshCw size={20}/> Carregando seu histórico…</div> : sessions.length === 0 ? <div className="sleep-empty"><MoonStar size={24}/><strong>Nenhum registro por enquanto</strong><p>Quando você iniciar e finalizar um período, ele aparecerá aqui.</p></div> : <div className="sleep-history-list">
        {sessions.map((item) => <article className="sleep-history-item" key={item.id}>
          <div className="sleep-history-date"><span className="sleep-history-icon"><MoonStar size={18}/></span><div><strong>{formatSleepDate(item.started_at)}</strong><small>{item.ended_at ? "Finalizado " + formatSleepDate(item.ended_at) : "Em andamento"}</small></div></div>
          <div className="sleep-history-duration">{item.duration_seconds != null ? formatSleepDuration(item.duration_seconds) : item.ended_at ? "Duração indisponível" : formatSleepDuration(getSleepDurationSeconds(item, now) ?? 0)}</div>
          <div className="sleep-history-actions">
            {item.ended_at && <button type="button" className="sleep-icon-button" aria-label="Editar detalhes" onClick={() => { setEditingId(item.id); setEditQuality(String(item.quality_rating ?? 3)); setEditFeeling(item.wake_feeling ?? "normal"); setEditNotes(item.notes ?? ""); }}><Pencil size={15}/></button>}
            <button type="button" className="sleep-icon-button sleep-delete-button" aria-label="Excluir registro" onClick={() => void remove(item)} disabled={busy}><Trash2 size={15}/></button>
          </div>
          {editingId === item.id && <div className="sleep-edit-form">
            <label>Qualidade<select value={editQuality} onChange={(e) => setEditQuality(e.target.value)}>{[1,2,3,4,5].map((value) => <option key={value} value={String(value)}>{value} de 5</option>)}</select></label>
            <label>Como acordou?<select value={editFeeling} onChange={(e) => setEditFeeling(e.target.value)}>{feelings.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="sleep-edit-notes">Observações<textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} maxLength={1000}/></label>
            <div><button type="button" className="sleep-secondary-button" onClick={() => setEditingId(null)}><X size={15}/> Cancelar</button><button type="button" className="sleep-primary-button" onClick={() => void saveEdit(item)} disabled={busy}><Save size={15}/> Salvar</button></div>
          </div>}
        </article>)}
      </div>}
    </section>
    <div className="sleep-footer-note"><Sparkles size={16}/><p>O acompanhamento ajuda a observar seus hábitos, mas não substitui avaliação médica. A média não inclui sessões em andamento nem durações fora do intervalo válido.</p>{onOpenProgress && <button type="button" onClick={onOpenProgress}>Ver Minha evolução</button>}</div>
  </section>;
}
