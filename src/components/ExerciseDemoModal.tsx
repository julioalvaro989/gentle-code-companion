import { useEffect } from "react";
import { BookOpen, CircleHelp, Dumbbell, X } from "lucide-react";
import { exerciseCatalog } from "./exerciseCatalog";
import "./ExerciseDemoModal.css";
import { Exercise3DViewer } from "./Exercise3DViewer";

type Props = { exerciseId: string | null; workoutName?: string; onClose: () => void };

export function ExerciseDemoModal({ exerciseId, workoutName, onClose }: Props) {
 const exercise = exerciseId ? exerciseCatalog.find(item => item.id === exerciseId) : undefined;
 useEffect(() => {
  if (!exerciseId) return;
  const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, [exerciseId, onClose]);
 if (!exerciseId) return null;
 return <div className="exercise-demo-overlay" role="presentation" onClick={onClose}>
  <section className="exercise-demo-dialog" role="dialog" aria-modal="true" aria-labelledby="exercise-demo-title" onClick={event => event.stopPropagation()}>
   <button className="exercise-demo-close" onClick={onClose} aria-label="Fechar demonstração"><X size={20}/></button>
   {!exercise ? <div className="exercise-demo-missing">
    <CircleHelp size={34}/>
    <h2 id="exercise-demo-title">{workoutName || "Exercício"}</h2>
    <p>Este exercício ainda não está associado a um registro da Biblioteca de Exercícios. O treino foi mantido sem alterações.</p>
    <p className="exercise-demo-note">Situação: cadastro não encontrado. Associe o exercício a um ID estável do catálogo para disponibilizar suas instruções.</p>
   </div> : <>
    <div className="exercise-demo-visual">
     <Exercise3DViewer exerciseId={exercise.id} compact />
     {exercise.videoUrl && <div className="exercise-demo-legacy-media"><span>Vídeo demonstrativo 2D</span><video controls playsInline preload="none" poster={exercise.imageUrl ?? undefined}><source src={exercise.videoUrl}/></video></div>}
     {!exercise.videoUrl && exercise.imageUrl && <img src={exercise.imageUrl} alt={exercise.name} loading="lazy"/>}
    </div>
    <div className="exercise-demo-body">
     <span className="exercise-demo-kicker">{exercise.primaryMuscle}</span>
     <h2 id="exercise-demo-title">{exercise.name}</h2>
     <p className="exercise-demo-subtitle">{exercise.equipment} · {exercise.location} · {exercise.difficulty}</p>
     <h3>Como fazer</h3>
     <ol>{exercise.instructions.map((step,index)=><li key={index}>{step}</li>)}</ol>
     <h3>Dicas de postura</h3><ul>{exercise.tips.map((tip,index)=><li key={index}>{tip}</li>)}</ul>
     <h3>Erros comuns</h3><ul>{exercise.commonMistakes.map((mistake,index)=><li key={index}>{mistake}</li>)}</ul>
     <p className="exercise-demo-note">{exercise.precautions}</p>
     <button className="green-button exercise-demo-return" onClick={onClose}><BookOpen size={17}/> Voltar ao treino</button>
    </div>
   </>}
  </section>
 </div>;
}
