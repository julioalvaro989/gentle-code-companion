import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CircleHelp, Pause, Play, RotateCcw, ShieldCheck, TimerReset } from "lucide-react";
import { exerciseAnimationRegistry, type AnimationVerification } from "./exerciseAnimationRegistry";
import "./Exercise3DViewer.css";

type Props = { exerciseId: string; compact?: boolean };
type ModelViewerElement = HTMLElement & {
  play?: () => void; pause?: () => void; currentTime?: number;
  duration?: number; availableAnimations?: string[]; animationName?: string;
};
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
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
 if (exerciseId === "agachamento-livre") return <ProceduralSquatPrototype compact={compact} />;
 return <ExternalExercise3DViewer exerciseId={exerciseId} compact={compact} />;
}

function ExternalExercise3DViewer({ exerciseId, compact }: Props) {
 const asset: AnimationVerification | undefined = exerciseAnimationRegistry[exerciseId];
 const [ready, setReady] = useState(false);
 const [error, setError] = useState("");
 const [playing, setPlaying] = useState(false);
 const [speed, setSpeed] = useState("1");
 const modelRef = useRef<ModelViewerElement | null>(null);

 useEffect(() => {
  let active = true;
  if (asset?.status !== "available" || !asset.modelUrl || !asset.animationName) return;
  loadModelViewer().then(() => { if (active) setReady(true); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Falha no visualizador 3D."); });
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
  {!error && ready && <ModelViewer asset={asset} modelRef={modelRef} speed={speed} onError={setError} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>}
  {(!ready || error) && <div className="exercise-3d-load-state">{error ? <AlertTriangle size={25}/> : <span className="exercise-3d-spinner"/>}<strong>{error ? "Não foi possível reproduzir esta animação" : "Carregando modelo 3D verificado…"}</strong><p>{error || "A mídia é carregada somente quando esta demonstração é aberta."}</p></div>}
  <div className="exercise-3d-controls">
   <button onClick={playing ? pause : play} disabled={!ready || Boolean(error)}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? "Pausar" : "Reproduzir"}</button>
   <button onClick={restart} disabled={!ready || Boolean(error)}><RotateCcw size={16}/> Reiniciar</button>
   <label>Velocidade<select value={speed} onChange={e=>{setSpeed(e.target.value);if(modelRef.current) (modelRef.current as any).playbackRate = Number(e.target.value);}}><option value="0.5">0,5×</option><option value="0.75">0,75×</option><option value="1">1×</option></select></label>
  </div>
  <p className="exercise-3d-source"><ShieldCheck size={13}/> Fonte: {asset.sourceName} · Licença: {asset.license} · <a href={asset.sourceUrl!} target="_blank" rel="noreferrer">origem</a> · <a href={asset.licenseUrl!} target="_blank" rel="noreferrer">licença</a></p>
 </div>;
}

function ModelViewer({ asset, modelRef, speed, onError, onPlay, onPause }: {
 asset: AnimationVerification; modelRef: React.RefObject<ModelViewerElement | null>; speed: string;
 onError: (message: string) => void; onPlay: () => void; onPause: () => void;
}) {
 return React.createElement("model-viewer", {
  ref: modelRef, src: asset.modelUrl, "camera-controls": true, "auto-rotate": false,
  "shadow-intensity": "0.7", "environment-image": "neutral", ar: false,
  autoplay: false, "animation-name": asset.animationName, "animation-crossfade-duration": "150",
  "playback-rate": speed, onError: () => onError("O arquivo do modelo 3D falhou ao carregar."),
  onPlay, onPause, style: { display:"block", width:"100%", height:"100%", minHeight:"260px", background:"#070810" }
 });
}

/** A genuine WebGL 3D scene animated procedurally for the free-body squat prototype. */
function ProceduralSquatPrototype({ compact }: { compact: boolean }) {
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const sceneApi = useRef<{ setPlaying:(v:boolean)=>void; reset:()=>void; setSpeed:(v:number)=>void } | null>(null);
 const [playing,setPlaying] = useState(true);
 const [speed,setSpeed] = useState("1");
 const [error,setError] = useState("");
 useEffect(() => {
  let disposed = false;
  let renderer: any, frame = 0, resizeObserver: ResizeObserver | undefined;
  let api: {setPlaying:(v:boolean)=>void;reset:()=>void;setSpeed:(v:number)=>void} | null = null;
  (async () => {
   try {
    const THREE: any = await import(/* @vite-ignore */ THREE_URL);
    if (disposed || !canvasRef.current) return;
    const canvas=canvasRef.current;
    const scene=new THREE.Scene(); scene.background=new THREE.Color("#070810");
    scene.fog=new THREE.Fog("#070810",7,14);
    const camera=new THREE.PerspectiveCamera(34,1,.1,100); camera.position.set(3.8,2.7,6.5); camera.lookAt(0,1.25,0);
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false}); renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene.add(new THREE.HemisphereLight(0xcbd5ff,0x21112f,2.0));
    const key=new THREE.DirectionalLight(0xffffff,3); key.position.set(3,6,4); key.castShadow=true; scene.add(key);
    const rim=new THREE.PointLight(0x9a36ff,14,9); rim.position.set(-3,2.5,-2); scene.add(rim);
    const green=new THREE.PointLight(0xb7ff35,7,7); green.position.set(2,1.5,2); scene.add(green);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:"#0c0e18",roughness:.85})); floor.rotation.x=-Math.PI/2; floor.position.y=-.035; floor.receiveShadow=true; scene.add(floor);
    const grid=new THREE.GridHelper(12,24,"#38215c","#17172a"); grid.position.y=-.025; scene.add(grid);
    const mat=(color:string,roughness=.48)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.02});
    const skin=mat("#c58d72"), shirt=mat("#6f28c7"), shorts=mat("#171b2d"), shoes=mat("#b7ff35"), jointMat=mat("#d4a28a");
    const sphere=(parent:any,r:number,m:any,pos:[number,number,number])=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),m);o.position.set(...pos);o.castShadow=true;parent.add(o);return o;};
    const segment=(parent:any,r1:number,r2:number,len:number,m:any)=>{const g=new THREE.Group();parent.add(g);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,len,14),m);mesh.position.y=-len/2;mesh.castShadow=true;g.add(mesh);sphere(g,Math.max(r1,r2)*1.02,m,[0,-len,0]);return g;};
    const root=new THREE.Group();scene.add(root);
    // pelvis + articulated spine/head
    const pelvis=new THREE.Group();pelvis.position.set(0,1.05,0);root.add(pelvis);
    const pelvisMesh=new THREE.Mesh(new THREE.BoxGeometry(.42,.23,.25),shorts);pelvisMesh.castShadow=true;pelvis.add(pelvisMesh);
    const torso=new THREE.Group();torso.position.y=.08;pelvis.add(torso);
    const chest=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.48,5,12),shirt);chest.position.y=.36;chest.castShadow=true;torso.add(chest);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.07,.085,.12,12),skin);neck.position.y=.67;torso.add(neck);
    const head=sphere(torso,.155,skin,[0,.84,0]); head.scale.set(.88,1.12,.9);
    sphere(torso,.035,skin,[.145,.86,.015]); sphere(torso,.035,skin,[-.145,.86,.015]);
    // simple arms hanging beside torso
    for(const side of [-1,1]){const shoulder=new THREE.Group();shoulder.position.set(side*.27,.55,0);torso.add(shoulder);sphere(shoulder,.09,shirt,[0,0,0]);const upper=segment(shoulder,.075,.055,.3,shirt);upper.rotation.z=side*-.1;const elbow=new THREE.Group();elbow.position.y=-.3;shoulder.add(elbow);sphere(elbow,.055,jointMat,[0,0,0]);segment(elbow,.052,.035,.28,skin);}
    const legs:any[]=[];
    for(const side of [-1,1]){
     const hip=new THREE.Group();hip.position.set(side*.14,-.08,0);pelvis.add(hip);sphere(hip,.105,shorts,[0,0,0]);
     const thigh=segment(hip,.105,.075,.43,shorts);
     const knee=new THREE.Group();knee.position.y=-.43;hip.add(knee);sphere(knee,.075,jointMat,[0,0,0]);
     const shin=segment(knee,.066,.045,.4,skin);
     const ankle=new THREE.Group();ankle.position.y=-.4;knee.add(ankle);
     const foot=new THREE.Mesh(new THREE.BoxGeometry(.14,.075,.26),shoes);foot.position.set(0,-.025,.075);foot.castShadow=true;ankle.add(foot);
     legs.push({hip,knee,ankle,side});
    }
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.58,40),new THREE.MeshBasicMaterial({color:"#7900ff",transparent:true,opacity:.12}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.012;scene.add(shadow);
    let isPlaying=true,phase=0,rate=1,last=0;
    api={setPlaying:(v:boolean)=>{isPlaying=v;},reset:()=>{phase=0;},setSpeed:(v:number)=>{rate=v;}};
    sceneApi.current=api;
    const resize=()=>{if(!canvasRef.current||!renderer)return;const w=Math.max(canvas.clientWidth,240),h=Math.max(canvas.clientHeight,200);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    resize();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
    const animate=(now:number)=>{if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(isPlaying)phase=(phase+dt*rate)%3.2;
     const t=isPlaying?phase:phase;const depth=(1-Math.cos(t/3.2*Math.PI*2))/2;
     const bend=depth*.78; pelvis.position.y=1.05-depth*.23; pelvis.position.z=depth*.08; pelvis.rotation.z=-depth*.13;
     torso.rotation.z=-depth*.16; legs.forEach(({hip,knee,side})=>{hip.rotation.z=bend*.55;knee.rotation.z=-bend*.9;});
     shadow.scale.setScalar(1+depth*.13);
     renderer.render(scene,camera);
    };
    frame=requestAnimationFrame(animate);
   } catch(e) {if(!disposed)setError(e instanceof Error?e.message:"Falha ao iniciar a cena 3D.");}
  })();
  return ()=>{disposed=true;cancelAnimationFrame(frame);resizeObserver?.disconnect();renderer?.dispose?.();sceneApi.current=null;};
 },[]);
 return <div className={"exercise-3d-viewer exercise-3d-prototype"+(compact?" compact":"")}>
  <div className="exercise-3d-prototype-stage"><canvas ref={canvasRef} aria-label="Personagem tridimensional simplificado executando um ciclo de agachamento livre"/>{error&&<div className="exercise-3d-load-state"><AlertTriangle/><strong>Visualização 3D indisponível</strong><p>{error} Verifique a conexão com o CDN de Three.js.</p></div>}<span className="exercise-3d-prototype-badge">Protótipo 3D procedural</span></div>
  <div className="exercise-3d-prototype-note">Movimento ilustrativo simplificado — ainda não validado como referência biomecânica.</div>
  <div className="exercise-3d-controls">
   <button onClick={()=>{const next=!playing;setPlaying(next);sceneApi.current?.setPlaying(next);}} disabled={Boolean(error)}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?"Pausar":"Reproduzir"}</button>
   <button onClick={()=>{sceneApi.current?.reset();setPlaying(true);sceneApi.current?.setPlaying(true);}} disabled={Boolean(error)}><RotateCcw size={16}/> Reiniciar</button>
   <label>Velocidade<select value={speed} onChange={e=>{setSpeed(e.target.value);sceneApi.current?.setSpeed(Number(e.target.value));}}><option value="0.5">0,5×</option><option value="0.75">0,75×</option><option value="1">1×</option><option value="1.25">1,25×</option></select></label>
  </div>
  <p className="exercise-3d-source"><ShieldCheck size={13}/> Cena gerada em código com Three.js · <a href="https://threejs.org/" target="_blank" rel="noreferrer">Three.js</a> (MIT) · sem arquivo externo de personagem.</p>
 </div>;
}
