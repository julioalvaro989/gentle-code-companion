import { useEffect, useState } from "react";
import { exerciseCatalog } from "./exerciseCatalog";

type Props = { exerciseId: string; exerciseName: string };
type ApiExercise = { name?: string; gifUrl?: string; imageUrl?: string; exerciseId?: string };
const aliases: Record<string, string[]> = {
 "agachamento-livre": ["bodyweight squat", "squat"],
 "agachamento-goblet": ["dumbbell goblet squat", "goblet squat"],
 "flexao-bracos": ["push up", "push-up"],
 "flexao-inclinada": ["incline push up", "incline push-up"],
 "prancha": ["plank"],
 "burpee": ["burpee"],
 "polichinelo": ["jumping jack"],
 "mountain-climber": ["mountain climber"],
 "afundo": ["lunge"],
 "elevacao-pelvica": ["glute bridge", "hip thrust"],
 "rosca-direta": ["barbell curl"],
 "supino-reto-barra": ["barbell bench press", "bench press"],
 "levantamento-terra": ["barbell deadlift", "deadlift"],
 "remada-unilateral": ["dumbbell row"],
 "elevacao-lateral": ["dumbbell lateral raise"]
};
function normalize(value: string) {
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
export function ExerciseMovementGraphic({ exerciseId, exerciseName }: Props) {
 const [mediaUrl, setMediaUrl] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [failed, setFailed] = useState(false);
 useEffect(() => {
  let active = true;
  setMediaUrl(null);
  setLoading(true);
  setFailed(false);
  const catalogEntry = exerciseCatalog.find(item => item.id === exerciseId);
  const terms = [...(aliases[exerciseId] ?? []), catalogEntry?.alternativeName ?? "", exerciseName]
   .map(term => term.trim()).filter(Boolean).filter((term, index, all) => all.indexOf(term) === index);
  (async () => {
   try {
    const responses = await Promise.all(terms.slice(0, 2).map(term =>
     fetch("https://oss.exercisedb.dev/api/v1/exercises?search=" + encodeURIComponent(term) + "&limit=20")
      .then(response => response.ok ? response.json() : null).catch(() => null)
    ));
    const records: ApiExercise[] = responses.flatMap(value => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.exercises) ? value.exercises : []);
    const targetTerms = terms.map(normalize).filter(term => term.length >= 4);
    const found = records.find(item => {
     const name = normalize(item.name ?? "");
     return targetTerms.some(term => name === term || name.includes(term));
    });
    const url = found?.gifUrl || found?.imageUrl;
    if (active && url) setMediaUrl(url);
    else if (active) setFailed(true);
   } catch {
    if (active) setFailed(true);
   } finally {
    if (active) setLoading(false);
   }
  })();
  return () => { active = false; };
 }, [exerciseId, exerciseName]);
 return <div className="exercise-movement-graphic">
  <div className="exercise-movement-heading"><span>DEMONSTRAÇÃO DO MOVIMENTO</span><small>Vídeo/ animação do exercício</small></div>
  <div className="exercise-movement-player">
   {mediaUrl ? <img src={mediaUrl} alt={`Pessoa demonstrando ${exerciseName}`} loading="lazy" onError={() => { setMediaUrl(null); setFailed(true); }} /> :
    loading ? <div className="exercise-movement-loading"><span className="exercise-movement-spinner"/>Carregando demonstração…</div> :
    <div className="exercise-movement-unavailable"><span aria-hidden="true">▶</span><strong>Não foi possível carregar a demonstração deste exercício.</strong><small>Verifique sua conexão e tente novamente.</small></div>}
  </div>
  <p>Referência visual para acompanhar o movimento. Comece com carga leve e interrompa se sentir dor.</p>
 </div>;
}
