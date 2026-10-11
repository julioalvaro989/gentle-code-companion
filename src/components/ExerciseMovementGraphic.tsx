import type { CSSProperties } from "react";

type Props = { exerciseId: string; exerciseName: string };

function kindFor(id: string, name: string) {
 const value = (id + " " + name).toLocaleLowerCase("pt-BR");
 if (/flex[aã]o|supino|prancha|mountain|burpee/.test(value)) return "floor";
 if (/agach|afundo|passada|lunge|leg-press|panturrilha|terra|good-morning|deadlift/.test(value)) return "legs";
 if (/polichinelo|corrida|pular-corda|jumping|cardio/.test(value)) return "cardio";
 if (/alongamento|mobilidade|gato-vaca|bird-dog|dead-bug|rota[cç][aã]o/.test(value)) return "mobility";
 return "upper";
}

function Figure({ kind, active }: { kind: string; active: boolean }) {
 const lime = "#B7FF35";
 const purple = "#A855F7";
 const stroke: CSSProperties = { fill: "none", stroke: lime, strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" };
 const body = (d: string) => <path d={d} style={stroke}/>;
 let shapes;
 if (kind === "floor") {
   shapes = <>{<circle cx="47" cy={active ? 56 : 49} r="10" fill={purple}/>}
    {body(active ? "M58 66 L93 78 L128 80" : "M58 59 L94 60 L128 63")}
    {body(active ? "M78 72 L69 95 L48 98" : "M78 60 L68 81 L48 83")}
    {body(active ? "M94 78 L112 94 L136 96" : "M94 60 L112 77 L136 79")}
    {body(active ? "M128 80 L149 91" : "M128 63 L150 72")}
   </>;
 } else if (kind === "legs") {
   shapes = <><circle cx="92" cy={active ? 35 : 27} r="11" fill={purple}/>
    {body(active ? "M92 48 L94 78 L73 93" : "M92 40 L92 73")}
    {body(active ? "M94 78 L117 89 L136 89" : "M92 73 L80 100 L72 124")}
    {body(active ? "M92 55 L73 69 L65 84" : "M92 52 L72 69 L65 83")}
    {body(active ? "M92 55 L111 68 L121 82" : "M92 52 L111 66 L121 82")}
   </>;
 } else if (kind === "cardio") {
   shapes = <><circle cx="92" cy="26" r="11" fill={purple}/>
    {body(active ? "M92 39 L91 72" : "M92 39 L92 72")}
    {body(active ? "M92 47 L67 28 L55 19 M92 47 L115 29 L126 19" : "M92 47 L68 61 L59 77 M92 47 L116 61 L125 77")}
    {body(active ? "M91 72 L70 93 L53 88 M91 72 L113 93 L133 88" : "M92 72 L79 104 L66 124 M92 72 L107 104 L121 124")}
   </>;
 } else if (kind === "mobility") {
   shapes = <><circle cx="83" cy="30" r="11" fill={purple}/>
    {body(active ? "M86 43 L102 68 L87 88" : "M87 43 L92 71 L89 91")}
    {body(active ? "M100 67 L125 61 L142 45" : "M92 54 L115 63 L133 57")}
    {body(active ? "M87 88 L64 100 L47 100 M87 88 L111 102 L130 102" : "M89 91 L68 108 L48 108 M89 91 L109 108 L130 108")}
   </>;
 } else {
   shapes = <><circle cx="92" cy="25" r="11" fill={purple}/>
    {body(active ? "M92 39 L94 73" : "M92 39 L92 73")}
    {body(active ? "M92 49 L69 63 L57 80" : "M92 49 L70 61 L59 75")}
    {body(active ? "M94 49 L116 61 L130 48" : "M92 49 L115 60 L130 47")}
    {body(active ? "M94 73 L78 101 L76 124 M94 73 L109 100 L112 124" : "M92 73 L82 101 L81 124 M92 73 L103 101 L105 124")}
   </>;
 }
 return <svg viewBox="0 0 184 142" role="img" aria-label={active ? "Ilustração da fase de movimento" : "Ilustração da posição inicial"}>{<path d="M16 126 H168" stroke="#29233F" strokeWidth="2" strokeLinecap="round"/>}{shapes}</svg>;
}

export function ExerciseMovementGraphic({ exerciseId, exerciseName }: Props) {
 const kind = kindFor(exerciseId, exerciseName);
 return <div className="exercise-movement-graphic" aria-label={`Guia visual ilustrativo para ${exerciseName}`}>
  <div className="exercise-movement-heading"><span>GUIA VISUAL</span><small>Referência ilustrativa · confira as instruções</small></div>
  <div className="exercise-movement-poses">
   <div className="exercise-movement-pose"><Figure kind={kind} active={false}/><strong>1. Posição inicial</strong><span>Estabilize o corpo e prepare a postura.</span></div>
   <div className="exercise-movement-arrow" aria-hidden="true">→</div>
   <div className="exercise-movement-pose"><Figure kind={kind} active={true}/><strong>2. Movimento</strong><span>Execute com controle, sem forçar a amplitude.</span></div>
  </div>
  <p>As figuras são esquemáticas e não substituem orientação profissional ou uma demonstração em vídeo.</p>
 </div>;
}
