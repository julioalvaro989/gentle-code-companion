import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Dumbbell, Filter, PlayCircle, Search, SlidersHorizontal, Video, X } from "lucide-react";
import { exerciseCatalog, type ExerciseRecord } from "./exerciseCatalog";
import "./ExerciseLibrary.css";
import { Exercise3DViewer } from "./Exercise3DViewer";

type Props = { onOpenExercise?: (id: string) => void; selectedExerciseId?: string | null; onClearSelected?: () => void };

export function ExerciseLibrary({ onOpenExercise, selectedExerciseId, onClearSelected }: Props) {
 const [search, setSearch] = useState("");
 const [muscle, setMuscle] = useState("Todos");
 const [equipment, setEquipment] = useState("Todos");
 const [location, setLocation] = useState("Todos");
 const [level, setLevel] = useState("Todos");
 const [withVideo, setWithVideo] = useState(false);
 const [sort, setSort] = useState("name");
 const [page, setPage] = useState(1);
 const [selected, setSelected] = useState<ExerciseRecord | null>(null);
 const pageSize = 18;
 const muscles = useMemo(() => [...new Set(exerciseCatalog.map(x => x.primaryMuscle))].sort(), []);
 const equipments = useMemo(() => [...new Set(exerciseCatalog.map(x => x.equipment))].sort(), []);
 const filtered = useMemo(() => {
  const q = search.trim().toLocaleLowerCase("pt-BR");
  return exerciseCatalog.filter(x =>
   (!q || [x.name,x.alternativeName,x.primaryMuscle,...x.secondaryMuscles].some(v => v.toLocaleLowerCase("pt-BR").includes(q))) &&
   (muscle === "Todos" || x.primaryMuscle === muscle || x.secondaryMuscles.includes(muscle)) &&
   (equipment === "Todos" || x.equipment === equipment) &&
   (location === "Todos" || x.location === location || x.location === "Ambos") &&
   (level === "Todos" || x.difficulty === level) &&
   (!withVideo || Boolean(x.videoUrl))
  );
 }, [search,muscle,equipment,location,level,withVideo]);
 const ordered = useMemo(() => [...filtered].sort((a,b) => sort === "category" ? a.primaryMuscle.localeCompare(b.primaryMuscle,"pt-BR") || a.name.localeCompare(b.name,"pt-BR") : a.name.localeCompare(b.name,"pt-BR")), [filtered,sort]);
 const pages = Math.max(1,Math.ceil(ordered.length/pageSize));
 const currentPage = Math.min(page,pages);
 const visible = ordered.slice((currentPage-1)*pageSize,currentPage*pageSize);
 const detail = selectedExerciseId ? exerciseCatalog.find(x=>x.id===selectedExerciseId) ?? null : selected;
 function open(item: ExerciseRecord) { setSelected(item); onOpenExercise?.(item.id); }
 function close() { setSelected(null); onClearSelected?.(); }
 return <section className="fit-page-section exercise-library">
  <div className="section-kicker"><span/> CATÁLOGO DE MOVIMENTOS</div>
  <div className="exercise-library-title"><div><h1>Biblioteca de <span>Exercícios.</span></h1><p className="fit-page-intro">Encontre movimentos para academia e casa, com instruções para consultar durante o treino.</p></div><div className="exercise-count"><BookOpen size={19}/><strong>{exerciseCatalog.length}</strong><small>exercícios cadastrados</small></div></div>
  <div className="exercise-library-search"><Search size={18}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar por exercício, apelido ou músculo..." aria-label="Buscar exercícios"/>{search && <button onClick={()=>setSearch("")} aria-label="Limpar busca"><X size={16}/></button>}</div>
  <div className="exercise-filters">
   <label>Grupo muscular<select value={muscle} onChange={e=>{setMuscle(e.target.value);setPage(1)}}><option>Todos</option>{muscles.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Equipamento<select value={equipment} onChange={e=>{setEquipment(e.target.value);setPage(1)}}><option>Todos</option>{equipments.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Local<select value={location} onChange={e=>{setLocation(e.target.value);setPage(1)}}><option>Todos</option><option>Academia</option><option>Casa</option></select></label>
   <label>Dificuldade<select value={level} onChange={e=>{setLevel(e.target.value);setPage(1)}}><option>Todos</option><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></select></label>
   <label>Ordenar por<select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="name">Nome (A–Z)</option><option value="category">Categoria</option></select></label>
   <label className="exercise-video-filter"><input type="checkbox" checked={withVideo} onChange={e=>{setWithVideo(e.target.checked);setPage(1)}}/> Somente com vídeo</label>
  </div>
  <div className="exercise-results-heading"><span><SlidersHorizontal size={16}/> {ordered.length} resultado(s)</span><span>Mostrando {visible.length} de {ordered.length}</span></div>
  <div className="exercise-library-grid">{visible.map(item=><button className="exercise-library-card" key={item.id} onClick={()=>open(item)}>
   <div className="exercise-card-art"><Dumbbell size={28}/><span>{item.videoUrl ? <PlayCircle size={18}/> : <BookOpen size={17}/>}</span></div>
   <div className="exercise-card-body"><span className="exercise-card-tag">{item.primaryMuscle}</span><strong>{item.name}</strong><small>{item.equipment} · {item.location}</small><span className="exercise-card-meta">{item.difficulty}{item.videoUrl && <Video size={14}/>}</span></div><ChevronRight className="exercise-card-arrow" size={17}/>
  </button>)}</div>
  {!ordered.length && <div className="exercise-empty"><Filter size={25}/><strong>Nenhum exercício encontrado</strong><p>Tente alterar a busca ou remover algum filtro.</p><button className="outline-button" onClick={()=>{setSearch("");setMuscle("Todos");setEquipment("Todos");setLocation("Todos");setLevel("Todos");setWithVideo(false)}}>Limpar filtros</button></div>}
  {pages>1 && <div className="exercise-pagination"><button disabled={currentPage===1} onClick={()=>setPage(p=>p-1)}><ArrowLeft size={16}/> Anterior</button><span>Página {currentPage} de {pages}</span><button disabled={currentPage===pages} onClick={()=>setPage(p=>p+1)}>Próxima <ChevronRight size={16}/></button></div>}
  {detail && <div className="exercise-detail-backdrop" role="presentation" onClick={close}><section className="exercise-detail-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title" onClick={e=>e.stopPropagation()}>
   <button className="exercise-detail-close" onClick={close} aria-label="Fechar detalhes"><X size={21}/></button>
   <div className="exercise-detail-media"><Exercise3DViewer exerciseId={detail.id}/>{detail.videoUrl && <div className="exercise-legacy-media"><span>Vídeo demonstrativo 2D</span><video controls playsInline preload="none" poster={detail.imageUrl ?? undefined}><source src={detail.videoUrl}/></video></div>}{!detail.videoUrl && detail.imageUrl && <img src={detail.imageUrl} alt={detail.name} loading="lazy"/>}</div>
   <div className="exercise-detail-content"><span className="exercise-card-tag">{detail.primaryMuscle}</span><h2 id="exercise-detail-title">{detail.name}</h2><p className="exercise-detail-alt">{detail.alternativeName} · {detail.equipment} · {detail.location}</p>
    <div className="exercise-detail-chips"><span>{detail.difficulty}</span><span>{detail.secondaryMuscles.length ? detail.secondaryMuscles.join(", ") : "Sem músculo secundário listado"}</span></div>
    <h3>Como executar</h3><ol>{detail.instructions.map((s,i)=><li key={i}>{s}</li>)}</ol>
    <h3>Dicas de execução</h3><ul>{detail.tips.map((s,i)=><li key={i}>{s}</li>)}</ul>
    <h3>Erros comuns</h3><ul>{detail.commonMistakes.map((s,i)=><li key={i}>{s}</li>)}</ul>
    <div className="exercise-precaution"><strong>Cuidados e adaptações</strong><p>{detail.precautions}</p></div>
    <h3>Alternativas semelhantes</h3><p className="exercise-detail-alt">As alternativas serão vinculadas por identificador à medida que o catálogo for revisado. Nenhuma mídia demonstrativa foi cadastrada neste lote inicial.</p>
    <button className="green-button exercise-detail-done" onClick={close}><CheckCircle2 size={17}/> Voltar à biblioteca</button>
   </div>
  </section></div>}
 </section>;
}
