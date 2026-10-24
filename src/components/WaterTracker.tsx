import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Droplets, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { createHydrationEntry, createHydrationIdempotencyKey, deleteHydrationEntry, listHydrationEntries, updateHydrationEntry, type AuthSession, type HydrationEntry } from "../lib/supabase";
import { formatLocalDateInput, useLocalToday } from "../lib/date-utils";

const presets = [150, 250, 350, 500];

function localTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Horário indisponível" : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function WaterTracker({ session }: { session: AuthSession }) {
  const today = useLocalToday();
  const todayKey = formatLocalDateInput(today);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [entries, setEntries] = useState<HydrationEntry[]>([]);
  const [customAmount, setCustomAmount] = useState("200");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  useEffect(() => {
    setSelectedDate(todayKey);
  }, [todayKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await listHydrationEntries(session, selectedDate));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a hidratação.");
    } finally {
      setLoading(false);
    }
  }, [session, selectedDate]);

  useEffect(() => { void load(); }, [load]);

  const total = useMemo(() => entries.reduce((sum, entry) => sum + entry.amount_ml, 0), [entries]);
  // Until a reviewed, recognized intake reference is configured, don't invent a medical or universal goal.
  const goalMl: number | null = null;
  const progress = goalMl ? Math.min(100, Math.round(total / goalMl * 100)) : 0;

  const add = async (amount: number) => {
    if (!Number.isInteger(amount) || amount < 1 || amount > 5000) {
      setError("Informe um volume entre 1 e 5.000 mL.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      const idempotencyKey = pendingIdempotencyKey && pendingAmount === amount ? pendingIdempotencyKey : createHydrationIdempotencyKey();
      setPendingIdempotencyKey(idempotencyKey);
      setPendingAmount(amount);
      await createHydrationEntry(session, { amount_ml: amount, local_date: selectedDate, timezone: localTimezone() }, idempotencyKey);
      setPendingIdempotencyKey(null);
      setPendingAmount(null);
      setNotice(`${amount} mL registrados.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente.");
    } finally { setSaving(false); }
  };

  const saveEdit = async (entry: HydrationEntry) => {
    const amount = Number(editingAmount);
    setSaving(true); setError(""); setNotice("");
    try {
      await updateHydrationEntry(session, entry.id, { amount_ml: amount });
      setEditingId(null); setEditingAmount("");
      setNotice("Registro atualizado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o registro.");
    } finally { setSaving(false); }
  };

  const remove = async (entry: HydrationEntry) => {
    if (!window.confirm(`Excluir o registro de ${entry.amount_ml} mL?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await deleteHydrationEntry(session, entry.id);
      setNotice("Registro excluído.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir o registro.");
    } finally { setSaving(false); }
  };

  const panelStyle = { background: "#0B0C16", border: "1px solid #29233F", borderRadius: 18, padding: 20 } as const;
  const buttonStyle = { border: "1px solid #39304F", borderRadius: 12, background: "#141225", color: "#F8F9FF", padding: "11px 14px", cursor: "pointer", fontWeight: 650 } as const;

  return <section className="fit-page-section" aria-labelledby="hydration-title">
    <div className="section-kicker"><span /> HÁBITO DE HIDRATAÇÃO</div>
    <h1 id="hydration-title">Hidratação <span>com consciência.</span></h1>
    <p className="fit-page-intro">Registre a água que você bebeu e acompanhe seu histórico. O volume registrado representa água pura, não a estimativa de toda a água obtida por alimentos e outras bebidas.</p>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16, marginTop: 22 }}>
      <article style={{ ...panelStyle, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(121,0,255,.18)", color: "#C8FF58" }}><Droplets size={23} /></div>
          <div><div style={{ color: "#A8B4D8", fontSize: 12 }}>TOTAL REGISTRADO</div><div style={{ fontSize: 30, fontWeight: 800, color: "#F8F9FF" }}>{total.toLocaleString("pt-BR")} <small style={{ fontSize: 14, color: "#A8B4D8" }}>mL</small></div></div>
        </div>
        {goalMl ? <><div role="progressbar" aria-label="Progresso da meta de hidratação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ height: 9, background: "#29233F", borderRadius: 99, overflow: "hidden" }}><div style={{ width: progress + "%", height: "100%", background: "linear-gradient(90deg,#7900FF,#B7FF35)", transition: "width .2s" }} /></div><p style={{ color: "#A8B4D8", fontSize: 13 }}>{progress}% da meta de {goalMl} mL</p></> : <p style={{ color: "#A8B4D8", fontSize: 13, lineHeight: 1.6 }}>Meta diária ainda não definida. Não vamos estimar uma meta individual sem uma referência válida e os dados necessários.</p>}
        <div style={{ borderTop: "1px solid #29233F", paddingTop: 16, marginTop: 16, color: "#A8B4D8", fontSize: 13 }}><CalendarDays size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />{dateLabel(selectedDate)}</div>
      </article>

      <article style={panelStyle}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, color: "#F8F9FF" }}>Registrar água</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#A8B4D8" }}>Escolha um volume rápido ou informe a quantidade.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
          {presets.map(amount => <button type="button" key={amount} style={buttonStyle} disabled={saving || selectedDate !== todayKey} onClick={() => void add(amount)}><Plus size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />{amount} mL</button>)}
        </div>
        <form onSubmit={event => { event.preventDefault(); void add(Number(customAmount)); }} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <label style={{ flex: 1 }}><span style={{ display: "block", color: "#A8B4D8", fontSize: 12, marginBottom: 6 }}>Volume personalizado (mL)</span><input type="number" min={1} max={5000} step={1} value={customAmount} onChange={event => setCustomAmount(event.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#05060B", color: "#F8F9FF", border: "1px solid #39304F", borderRadius: 10, padding: 11 }} /></label>
          <button type="submit" disabled={saving || selectedDate !== todayKey} style={{ ...buttonStyle, alignSelf: "end", background: "#B7FF35", color: "#10120A", borderColor: "#B7FF35" }}>Adicionar</button>
        </form>
        {selectedDate !== todayKey && <p style={{ color: "#A8B4D8", fontSize: 12, marginBottom: 0 }}>Para evitar registros retroativos incorretos, a inclusão fica disponível apenas para hoje. O histórico pode ser consultado e os registros existentes podem ser editados.</p>}
      </article>
    </div>

    <article style={{ ...panelStyle, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div><h2 style={{ margin: 0, color: "#F8F9FF", fontSize: 18 }}>Registros do dia</h2><p style={{ color: "#A8B4D8", fontSize: 13, margin: "5px 0 0" }}>Histórico persistido na sua conta</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><input aria-label="Consultar histórico por data" type="date" max={todayKey} value={selectedDate} onChange={event => setSelectedDate(event.target.value)} style={{ ...buttonStyle, colorScheme: "dark", padding: 9 }} /><button type="button" aria-label="Atualizar registros" onClick={() => void load()} style={buttonStyle}><RefreshCw size={16} /></button></div>
      </div>
      {error && <div role="alert" style={{ background: "rgba(255,80,100,.1)", border: "1px solid rgba(255,80,100,.4)", borderRadius: 10, padding: 12, color: "#FFB5BF", marginBottom: 12 }}>{error}</div>}
      {notice && <div role="status" style={{ background: "rgba(183,255,53,.08)", border: "1px solid rgba(183,255,53,.25)", borderRadius: 10, padding: 12, color: "#C8FF58", marginBottom: 12 }}><Check size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />{notice}</div>}
      {loading ? <p style={{ color: "#A8B4D8" }}>Carregando registros…</p> : entries.length === 0 ? <div style={{ textAlign: "center", padding: "30px 12px", color: "#A8B4D8" }}><Droplets size={26} style={{ marginBottom: 8, opacity: .8 }} /><strong style={{ display: "block", color: "#F8F9FF" }}>Nenhum registro nesta data</strong><span style={{ fontSize: 13 }}>Quando você registrar água, ela aparecerá aqui.</span></div> : <div style={{ display: "grid", gap: 8 }}>
        {entries.map(entry => <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid #29233F", padding: "12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ color: "#C8FF58" }}><Droplets size={18} /></div><div><strong style={{ color: "#F8F9FF" }}>{entry.amount_ml.toLocaleString("pt-BR")} mL</strong><div style={{ color: "#A8B4D8", fontSize: 12, marginTop: 4 }}><Clock3 size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />{timeLabel(entry.consumed_at)}</div></div></div>
          {editingId === entry.id ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}><input aria-label="Novo volume em mL" type="number" min={1} max={5000} step={1} value={editingAmount} onChange={event => setEditingAmount(event.target.value)} style={{ ...buttonStyle, width: 105, padding: 8 }} /><button type="button" aria-label="Salvar edição" disabled={saving} onClick={() => void saveEdit(entry)} style={buttonStyle}><Check size={15} /></button><button type="button" aria-label="Cancelar edição" onClick={() => setEditingId(null)} style={buttonStyle}><X size={15} /></button></div> : <div style={{ display: "flex", gap: 7 }}><button type="button" aria-label={`Editar registro de ${entry.amount_ml} mL`} onClick={() => { setEditingId(entry.id); setEditingAmount(String(entry.amount_ml)); }} style={buttonStyle}><Pencil size={15} /></button><button type="button" aria-label={`Excluir registro de ${entry.amount_ml} mL`} disabled={saving} onClick={() => void remove(entry)} style={buttonStyle}><Trash2 size={15} /></button></div>}
        </div>)}
      </div>}
      <div style={{ borderTop: "1px solid #29233F", paddingTop: 14, marginTop: 10, color: "#A8B4D8", fontSize: 12, lineHeight: 1.6 }}>Aviso: se você recebeu orientação médica para restringir líquidos, siga a orientação do profissional responsável. Este registro não substitui aconselhamento médico.</div>
    </article>
  </section>;
}
