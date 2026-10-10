import * as ReactNamespace from "react";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CircleHelp, Pause, Play, RotateCcw, ShieldCheck, TimerReset } from "lucide-react";
import { exerciseAnimationRegistry, type AnimationVerification } from "./exerciseAnimationRegistry";
import "./Exercise3DViewer.css";

type Props = { exerciseId: string; compact?: boolean };
type ModelViewerElement = HTMLElement & {
  play?: () => void; pause?: () => void; currentTime?: number;
  duration?: number; availableAnimations?: string[]; animationName?: string;
};

let loaderPromise: Promise<void> | null = null;
function loadModelViewer() {
  if (typeof window === "undefined") return Promise.reject(new Error("Visualizador disponível somente no navegador."));
  if (customElements.get("model-viewer")) return Promise.resolve();
  if (!loaderPromise) loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
    script.onload = () => resolve();
    script.onerror = () => { loaderPromise = null; reject(new Error("Não foi possível carregar o componente 3D.")); };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function Exercise3DViewer({ exerciseId, compact = false }: Props) {
 const asset: AnimationVerification | undefined = exerciseAnimationRegistry[exerciseId];
 const [ready, setReady] = useState(false);
 const [error, setError] = useState("");
 const [playing, setPlaying] = useState(false);
 const [speed, setSpeed] = useState("1");
 const modelRef = useRef<ModelViewerElement | null>(null);
 useEffect(() => {
  let active = true;
  if (asset?.status !== "available" || !asset.modelUrl || !asset.animationName) return;
  loadModelViewer().then(() => { if (active) setReady(true); }).catch(e => { if (active) { setError(e instanceof Error ? e.message : "Falha no visualizador 3D."); } });
  return () => { active = false; };
 }, [asset?.status, asset?.modelUrl, asset?.animationName]);
 useEffect(() => {
  const model = modelRef.current;
  if (!model || !ready || !asset?.animationName) return;
  const onLoad = () => {
   const available = model.availableAnimations ?? [];
   if (!available.includes(asset.animationName!)) setError("A animação declarada não existe dentro deste modelo 3D.");
   else setError("");
  };
  model.addEventListener("load", onLoad);
  return () => model.removeEventListener("load", onLoad);
 }, [ready, asset?.animationName]);
 const available = asset?.status === "available" && Boolean(asset.modelUrl && asset.animationName && asset.sourceUrl && asset.licenseUrl && asset.verifiedAt);
 function play() { if (modelRef.current?.play) { modelRef.current.play(); setPlaying(true); } }
 function pause() { modelRef.current?.pause?.(); setPlaying(false); }
 function restart() { if (modelRef.current) { modelRef.current.currentTime = 0; modelRef.current.pause?.(); modelRef.current.play?.(); setPlaying(true); } }
 if (!available) return <div className={"exercise-3d-pending" + (compact ? " compact" : "")}>
  <div className="exercise-3d-icon"><CircleHelp size={compact ? 20 : 30}/></div>
  <span className="exercise-3d-status"><TimerReset size={13}/> Demonstração 3D pendente</span>
  <strong>Modelo 3D compatível ainda não verificado</strong>
  <p>As instruções do exercício continuam disponíveis. Nenhum vídeo ou imagem genérica será apresentado como animação 3D.</p>
  <small>Identificador: {exerciseId}</small>
 </div>;
 return <div className={"exercise-3d-viewer" + (compact ? " compact" : "")}>
  {!error && ready && ReactModelViewer({ asset, modelRef, speed, onError: setError, onPlay:()=>setPlaying(true), onPause:()=>setPlaying(false) })}
  {(!ready || error) && <div className="exercise-3d-load-state">{error ? <AlertTriangle size={25}/> : <span className="exercise-3d-spinner"/>}<strong>{error ? "Não foi possível reproduzir esta animação" : "Carregando modelo 3D verificado…"}</strong><p>{error || "A mídia é carregada somente quando esta demonstração é aberta."}</p></div>}
  <div className="exercise-3d-controls">
   <button onClick={playing ? pause : play} disabled={!ready || Boolean(error)}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? "Pausar" : "Reproduzir"}</button>
   <button onClick={restart} disabled={!ready || Boolean(error)}><RotateCcw size={16}/> Reiniciar</button>
   <label>Velocidade<select value={speed} onChange={e=>{setSpeed(e.target.value);if(modelRef.current) (modelRef.current as any).playbackRate = Number(e.target.value);}}><option value="0.5">0,5×</option><option value="0.75">0,75×</option><option value="1">1×</option></select></label>
  </div>
  <p className="exercise-3d-source"><ShieldCheck size={13}/> Fonte: {asset.sourceName} · Licença: {asset.license} · <a href={asset.sourceUrl!} target="_blank" rel="noreferrer">origem</a> · <a href={asset.licenseUrl!} target="_blank" rel="noreferrer">licença</a></p>
 </div>;
}

function ReactModelViewer({ asset, modelRef, speed, onError, onPlay, onPause }: {
 asset: AnimationVerification; modelRef: ReactNamespace.RefObject<ModelViewerElement | null>; speed: string;
 onError: (message: string) => void; onPlay: () => void; onPause: () => void;
}) {
 const React = requireReact();
 return React.createElement("model-viewer", {
  ref: modelRef, src: asset.modelUrl, "camera-controls": true, "auto-rotate": false,
  "shadow-intensity": "0.7", "environment-image": "neutral", ar: false,
  autoplay: false, "animation-name": asset.animationName, "animation-crossfade-duration": "150",
  "playback-rate": speed, onError: () => onError("O arquivo do modelo 3D falhou ao carregar."),
  onPlay, onPause, style: { display:"block", width:"100%", height:"100%", minHeight:"260px", background:"#070810" }
 });
}
function requireReact() {
 // React is imported as a namespace to avoid JSX custom-element typings.
 return ReactNamespace;
}
