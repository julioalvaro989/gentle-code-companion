import { useEffect, useState } from "react";
import { ArrowRight, MoonStar, RefreshCw } from "lucide-react";
import type { AuthSession } from "../lib/supabase";
import { listSleepSessions } from "../lib/supabase";
import { formatSleepDuration, getLastSevenNightAverage } from "../lib/sleep-utils";
import "./SleepProgressCard.css";

type Props = { session: AuthSession; onOpen: () => void };

export function SleepProgressCard({ session, onOpen }: Props) {
  const [average, setAverage] = useState<number | null>(null);
  const [validNights, setValidNights] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSleepSessions(session).then((rows) => {
      if (cancelled) return;
      const now = new Date();
      const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
      const valid = rows.filter((item) => item.ended_at && item.duration_seconds != null &&
        new Date(item.ended_at) >= start && new Date(item.ended_at) <= now &&
        item.duration_seconds > 0 && item.duration_seconds <= 18 * 3600);
      setAverage(getLastSevenNightAverage(rows, now));
      setValidNights(valid.length);
      setFailed(false);
    }).catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session]);

  return <section className="sleep-progress-card" aria-labelledby="sleep-progress-title">
    <span className="sleep-progress-icon"><MoonStar size={20}/></span>
    <div className="sleep-progress-copy">
      <div className="section-kicker">SONO E RECUPERAÇÃO</div>
      <h2 id="sleep-progress-title">Seu descanso também faz parte da evolução</h2>
      {loading ? <p>Consultando os registros de sono da sua conta…</p>
        : failed ? <p>Não foi possível carregar os registros agora. Tente abrir o acompanhamento novamente.</p>
        : average == null ? <p>Ainda não há registros válidos nos últimos 7 dias para calcular uma média.</p>
        : <p>Média dos últimos 7 dias: <strong>{formatSleepDuration(average)}</strong>, com {validNights} noite{validNights === 1 ? "" : "s"} válida{validNights === 1 ? "" : "s"} registrada{validNights === 1 ? "" : "s"}.</p>}
    </div>
    <button type="button" onClick={onOpen}>Acompanhar sono <ArrowRight size={16}/></button>
    {failed && <RefreshCw className="sleep-progress-status" size={15} aria-hidden="true"/>}
  </section>;
}
