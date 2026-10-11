import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight,
  Dumbbell, Menu, MessageCircle, ShieldCheck, Sparkles, Target,
  TrendingUp, UserRound, X, Zap, Clock3, Salad, ClipboardCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import "./PublicLanding.css";

type Props = { onAuth: (mode: "login" | "signup") => void };

const resources = [
  { icon: Dumbbell, title: "Treinos com direção", copy: "Consulte exercícios, organize suas sessões e registre o que concluiu." },
  { icon: Salad, title: "Hábitos e alimentação", copy: "Mantenha suas metas e informações da rotina reunidas no seu espaço." },
  { icon: MessageCircle, title: "Converse com a Vibra AI", copy: "Tire dúvidas gerais sobre exercícios, treino e hábitos dentro da sua conta." },
  { icon: TrendingUp, title: "Acompanhe sua jornada", copy: "Consulte seus registros e visualize informações de consistência e progresso." },
];

const stories = [
  { name: "Luana Paiva", tag: "ROTINA E ORGANIZAÇÃO", story: "Exemplo ilustrativo: Luana queria organizar melhor os horários de treino. A ideia é mostrar como reunir sessões e objetivos em um só lugar pode ajudar a estruturar a rotina." },
  { name: "Gabriel Santos", tag: "CONSISTÊNCIA", story: "Exemplo ilustrativo: Gabriel tinha dificuldade para manter seus registros. Com uma rotina organizada, ele consegue visualizar o que planejou e o que já marcou como concluído." },
  { name: "Beatriz Oliveira", tag: "PLANEJAMENTO", story: "Exemplo ilustrativo: Beatriz buscava mais clareza para começar. A página demonstra como consultar exercícios e manter suas metas acessíveis pode apoiar o planejamento." },
  { name: "Leo Maromba", tag: "TREINO", story: "Exemplo ilustrativo: Leo queria centralizar as informações do treino. O Vibra reúne recursos de sessão e consulta de exercícios no mesmo espaço." },
  { name: "Julia Beltro", tag: "HÁBITOS", story: "Exemplo ilustrativo: Julia queria prestar mais atenção aos hábitos diários. Os registros disponíveis ajudam a manter essas informações visíveis." },
  { name: "Ana Beatriz", tag: "ACOMPANHAMENTO", story: "Exemplo ilustrativo: Ana buscava acompanhar sua rotina ao longo do tempo. O histórico permite consultar registros feitos na própria conta." },
  { name: "Thales", tag: "OBJETIVOS", story: "Exemplo ilustrativo: Thales precisava deixar os objetivos mais claros. A área pessoal permite manter o foco escolhido à vista e revisá-lo." },
  { name: "Icaro Junior", tag: "APOIO COM IA", story: "Exemplo ilustrativo: Icaro queria um lugar para dúvidas gerais sobre exercícios e hábitos. A Vibra AI está disponível dentro da conta, com as limitações de uma IA." },
];

const faqs = [
  { q: "O que é o Vibra?", a: "O Vibra é uma plataforma digital para reunir recursos de treino, exercícios, hábitos, registros de progresso e uma conversa com IA dentro da conta." },
  { q: "Como funciona a inteligência artificial?", a: "A Vibra AI responde a perguntas gerais conforme a integração disponível. Respostas podem conter erros e não substituem avaliação individual de profissionais." },
  { q: "Como são personalizados os treinos?", a: "As informações de perfil e objetivos podem ajudar a contextualizar a experiência. A disponibilidade de recomendações depende dos recursos ativos na sua conta; não é uma prescrição clínica." },
  { q: "Como funciona a assinatura mensal?", a: "Os planos e as condições comerciais ainda precisam ser confirmados na configuração oficial de cobrança. Esta página não inicia pagamentos nem ativa assinaturas." },
  { q: "Qual é a diferença entre Basic e Premium?", a: "Os preços e limites apresentados abaixo são propostas comerciais em validação, não ofertas disponíveis para contratação. Os benefícios finais serão publicados após confirmação." },
  { q: "O que acontece quando atinjo meu limite de IA?", a: "Os limites e o comportamento após atingi-los precisam ser confirmados no backend antes de serem anunciados como regras definitivas." },
  { q: "Como posso cancelar minha assinatura?", a: "A política e o procedimento de cancelamento ainda precisam ser confirmados nos termos comerciais oficiais. Não queremos informar um processo que ainda não foi validado." },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function GymScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || reducedMotion || window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = scene.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        scene.style.setProperty("--scene-rx", `${(-y * 5).toFixed(2)}deg`);
        scene.style.setProperty("--scene-ry", `${(x * 7).toFixed(2)}deg`);
      });
    };
    const reset = () => {
      scene.style.setProperty("--scene-rx", "0deg");
      scene.style.setProperty("--scene-ry", "0deg");
    };
    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerleave", reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", reset);
    };
  }, [reducedMotion]);

  return (
    <div className={`vp-scene ${reducedMotion ? "vp-scene-static" : ""}`} ref={sceneRef} aria-label="Composição gráfica animada de halteres e dados fitness em um ambiente futurista" role="img">
      <div className="vp-scene-grid" />
      <div className="vp-scene-halo vp-halo-purple" />
      <div className="vp-scene-halo vp-halo-lime" />
      <div className="vp-scene-floor" />
      <div className="vp-scene-object">
        <div className="vp-dumbbell">
          <span className="vp-db-plate vp-db-left-outer" /><span className="vp-db-plate vp-db-left-inner" />
          <span className="vp-db-bar" /><span className="vp-db-grip" />
          <span className="vp-db-plate vp-db-right-inner" /><span className="vp-db-plate vp-db-right-outer" />
        </div>
        <div className="vp-scene-ring vp-ring-one" /><div className="vp-scene-ring vp-ring-two" />
      </div>
      <div className="vp-data-chip vp-data-one"><span className="vp-chip-dot" /><span><b>VIBRA AI</b><small>Inteligência em movimento</small></span><Sparkles size={17} /></div>
      <div className="vp-data-chip vp-data-two"><Activity size={17} /><span><b>SEU RITMO</b><small>Progresso pessoal</small></span><span className="vp-chip-bars"><i /><i /><i /><i /><i /></span></div>
      <div className="vp-scene-caption"><span /> EXPERIÊNCIA VISUAL VIBRA <span>01 / MOVE</span></div>
    </div>
  );
}

export function PublicLanding({ onAuth }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const menuRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!autoPlay || reducedMotion) return;
    const timer = window.setInterval(() => setStoryIndex((current) => (current + 1) % stories.length), 6500);
    return () => window.clearInterval(timer);
  }, [autoPlay, reducedMotion]);

  function goTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  const nav = [
    { id: "vibra-como-funciona", label: "Como funciona" },
    { id: "vibra-recursos", label: "Recursos" },
    { id: "vibra-historias", label: "Histórias" },
    { id: "vibra-planos", label: "Planos" },
    { id: "vibra-faq", label: "FAQ" },
  ];

  const currentStory = stories[storyIndex];

  return (
    <div className="vibra-public vp-premium">
      <a className="vp-skip" href="#vibra-conteudo">Pular para o conteúdo</a>
      <header className="vp-header">
        <div className="vp-container vp-header-inner">
          <a className="vp-brand" href="#inicio" aria-label="Vibra, início" onClick={(event) => { event.preventDefault(); goTo("inicio"); }}>
            <span aria-hidden="true">V</span>vibra<span className="vp-brand-dot">.</span>
          </a>
          <nav className="vp-desktop-nav" aria-label="Menu principal">
            {nav.map((item) => <Button variant="ghost" key={item.id} onClick={() => goTo(item.id)}>{item.label}</Button>)}
          </nav>
          <div className="vp-header-actions">
            <Button variant="ghost" onClick={() => onAuth("login")}>Já tenho conta <ArrowRight aria-hidden="true" /></Button>
            <Button className="vp-button vp-header-cta" onClick={() => onAuth("signup")}>Começar agora</Button>
            <Button ref={menuRef} size="icon" variant="ghost" className="vp-menu-toggle" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="vibra-menu-mobile" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menuOpen && <nav id="vibra-menu-mobile" className="vp-mobile-nav" aria-label="Menu mobile" onKeyDown={(event) => {
          if (event.key === "Escape") { setMenuOpen(false); menuRef.current?.focus(); }
        }}>
          {nav.map((item) => <Button variant="ghost" key={item.id} onClick={() => goTo(item.id)}>{item.label}</Button>)}
          <Button className="vp-button" onClick={() => onAuth("signup")}>Começar agora <ArrowRight /></Button>
        </nav>}
      </header>

      <main id="vibra-conteudo">
        <section id="inicio" className="vp-hero vp-hero-premium" aria-labelledby="vp-title">
          <div className="vp-container vp-hero-layout">
            <div className="vp-hero-content">
              <p className="vp-eyebrow"><Zap size={14} aria-hidden="true" /> FITNESS, COM INTELIGÊNCIA</p>
              <h1 id="vp-title">Seu próximo nível começa com <span>inteligência.</span></h1>
              <p className="vp-hero-description">Treinos personalizados, orientação para sua rotina e acompanhamento da evolução com a inteligência artificial do Vibra — no seu ritmo e com os recursos disponíveis na sua conta.</p>
              <div className="vp-hero-actions">
                <Button className="vp-button" size="lg" onClick={() => onAuth("signup")}>Começar agora <ArrowRight aria-hidden="true" /></Button>
                <Button variant="ghost" className="vp-discover" onClick={() => onAuth("login")}>Já tenho conta <ArrowDown aria-hidden="true" /></Button>
              </div>
              <div className="vp-hero-trust"><span><ShieldCheck size={16} /> Sua rotina, no seu espaço</span><span><Sparkles size={16} /> Vibra AI integrada</span></div>
            </div>
            <div className="vp-hero-art"><GymScene /><div className="vp-hero-art-note"><span className="vp-note-pulse" /><span><b>MENOS RUÍDO.</b><small>Mais direção para sua rotina.</small></span></div></div>
          </div>
          <div className="vp-container vp-hero-footer"><span>SEU OBJETIVO. SUA ROTINA.</span><span>UM PASSO DE CADA VEZ. <ArrowDown size={15} /></span></div>
        </section>

        <section id="vibra-recursos" className="vp-section vp-container" aria-labelledby="vp-resources-title">
          <div className="vp-section-heading"><div><p className="vp-eyebrow">SEU ESPAÇO DE EVOLUÇÃO</p><h2 id="vp-resources-title">Mais direção.<br /><span>Menos dispersão.</span></h2></div><p>Ferramentas para organizar treino, hábitos e objetivos em um só lugar. Tecnologia como apoio para construir uma rotina possível.</p></div>
          <div className="vp-resource-grid vp-resource-grid-premium">
            {resources.map(({ icon: Icon, title, copy }, index) => <article key={title} className="vp-resource vp-premium-resource">
              <span className="vp-resource-index">0{index + 1}</span><span className="vp-resource-icon"><Icon size={23} aria-hidden="true" /></span><h3>{title}</h3><p>{copy}</p><span className="vp-resource-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
            </article>)}
          </div>
          <div className="vp-feature-note"><span className="vp-feature-note-icon"><ClipboardCheck size={19} /></span><p><b>Feito para acompanhar sua rotina.</b><br />Os registros refletem as informações inseridas e os recursos habilitados na sua conta.</p><Button variant="ghost" onClick={() => onAuth("signup")}>Conhecer por dentro <ArrowRight size={16} /></Button></div>
        </section>

        <section id="vibra-como-funciona" className="vp-how vp-section vp-how-premium" aria-labelledby="vp-how-title">
          <div className="vp-container">
            <div className="vp-section-heading"><div><p className="vp-eyebrow">SIMPLES PARA COMEÇAR</p><h2 id="vp-how-title">Sua jornada em <span>três passos.</span></h2></div><p>Uma experiência para ajudar você a organizar o que importa, sem promessas instantâneas.</p></div>
            <div className="vp-steps">
              <article className="vp-step"><span className="vp-step-number">01</span><span className="vp-step-icon"><UserRound size={23} /></span><h3>Crie sua conta</h3><p>Informe seus dados e objetivos nas etapas disponíveis para o seu perfil.</p><span className="vp-step-line" /></article>
              <article className="vp-step"><span className="vp-step-number">02</span><span className="vp-step-icon"><Target size={23} /></span><h3>Organize seu plano</h3><p>Consulte os recursos e recomendações disponibilizados conforme sua conta e os dados que você informar.</p><span className="vp-step-line" /></article>
              <article className="vp-step"><span className="vp-step-number">03</span><span className="vp-step-icon"><TrendingUp size={23} /></span><h3>Acompanhe sua rotina</h3><p>Registre suas sessões, consulte seu histórico e use a Vibra AI para dúvidas gerais.</p></article>
            </div>
          </div>
        </section>

        <section id="vibra-ai" className="vp-ai-band vp-ai-premium">
          <div className="vp-container vp-ai-layout">
            <div><p className="vp-eyebrow"><Sparkles size={15} /> VIBRA AI</p><h2>Uma conversa.<br /><span>Mais clareza para seguir.</span></h2><p>Um espaço de conversa para dúvidas gerais sobre exercícios, treinos e hábitos. A IA pode cometer erros e não substitui profissionais de educação física, nutrição ou saúde.</p><Button variant="ghost" className="vp-text-cta" onClick={() => onAuth("login")}>Entrar para conversar <ArrowRight /></Button><small>Disponível dentro da sua conta, conforme os recursos ativos.</small></div>
            <div className="vp-ai-visual vp-ai-visual-premium" aria-label="Ilustração decorativa da Vibra AI, sem conversa interativa"><div className="vp-ai-orbit"><span /><span /><span /></div><div className="vp-ai-symbol"><Sparkles size={46} strokeWidth={1.4} /></div><span className="vp-ai-name">Vibra AI</span><p>Seu espaço de conversa.</p><div className="vp-ai-topics"><span>Treinos</span><span>Exercícios</span><span>Hábitos</span></div><div className="vp-ai-private"><ShieldCheck size={14} /> Disponível dentro da sua conta</div></div>
          </div>
        </section>

        <section id="vibra-historias" className="vp-section vp-stories-section" aria-labelledby="vp-stories-title">
          <div className="vp-container">
            <div className="vp-section-heading"><div><p className="vp-eyebrow">ROTINA, NÃO MILAGRE</p><h2 id="vp-stories-title">Evolução que vai <span>além do treino.</span></h2></div><p>Conheça histórias de pessoas que buscam uma rotina mais saudável com o apoio do Vibra.</p></div>
            <div className="vp-testimonial-disclaimer"><ShieldCheck size={17} /><p><b>Conteúdo demonstrativo.</b> Os relatos abaixo são exemplos ilustrativos, não depoimentos ou avaliações reais de clientes. Substitua-os por histórias autorizadas antes de publicar.</p></div>
            <div className="vp-testimonial-shell" onMouseEnter={() => setAutoPlay(false)} onMouseLeave={() => setAutoPlay(true)} onFocusCapture={() => setAutoPlay(false)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAutoPlay(true); }}>
              <div className="vp-testimonial-card" aria-live="polite" aria-atomic="true">
                <div className="vp-testimonial-mark" aria-hidden="true">“</div>
                <div className="vp-testimonial-content"><span className="vp-testimonial-tag">{currentStory.tag}</span><blockquote>{currentStory.story}</blockquote><div className="vp-testimonial-person"><span className="vp-testimonial-avatar" aria-hidden="true">{currentStory.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><b>{currentStory.name}</b><small>Personagem ilustrativo · relato fictício</small></span></div></div>
                <div className="vp-testimonial-side"><span className="vp-quote-lines" /><span className="vp-testimonial-counter">{String(storyIndex + 1).padStart(2, "0")} <i>/ {String(stories.length).padStart(2, "0")}</i></span><div className="vp-carousel-controls"><Button variant="ghost" size="icon" aria-label="Depoimento anterior" onClick={() => { setAutoPlay(false); setStoryIndex((storyIndex - 1 + stories.length) % stories.length); }}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Próximo depoimento" onClick={() => { setAutoPlay(false); setStoryIndex((storyIndex + 1) % stories.length); }}><ChevronRight /></Button></div></div>
              </div>
              <div className="vp-carousel-dots" role="group" aria-label="Selecionar história">
                {stories.map((story, index) => <button key={story.name} type="button" className={index === storyIndex ? "is-active" : ""} aria-label={`Mostrar história ilustrativa de ${story.name}`} aria-pressed={index === storyIndex} onClick={() => { setAutoPlay(false); setStoryIndex(index); }} />)}
              </div>
              <p className="vp-carousel-status" aria-live="polite">História ilustrativa {storyIndex + 1} de {stories.length}</p>
            </div>
          </div>
        </section>

        <section id="vibra-planos" className="vp-section vp-plans-premium" aria-labelledby="vp-plans-title">
          <div className="vp-container">
            <div className="vp-section-heading"><div><p className="vp-eyebrow">PLANOS VIBRA</p><h2 id="vp-plans-title">Escolha o ritmo.<br /><span>Construa sua rotina.</span></h2></div><p>Preços e limites propostos para planejamento comercial. A contratação só deve ser liberada depois da validação oficial.</p></div>
            <div className="vp-pricing-notice"><Clock3 size={18} /><p><b>Valores em validação — não disponíveis para contratação.</b><br />Os preços, limites de mensagens e condições precisam ser confirmados na Cakto e no backend. Nenhum pagamento é iniciado nesta página.</p></div>
            <div className="vp-pricing-grid">
              <article className="vp-price-card"><span className="vp-price-kicker">PARA COMEÇAR</span><h3>Vibra Basic</h3><p className="vp-price-description">Uma base para organizar sua rotina fitness.</p><div className="vp-price"><strong>R$ 29,90</strong><span>/ mês planejado</span></div><ul><li><Check size={16} /> Recursos disponíveis na conta</li><li><Check size={16} /> Registros e organização pessoal</li><li><MessageCircle size={16} /> Até 50 mensagens por ciclo <small>(proposta, não confirmada)</small></li></ul><Button className="vp-price-cta vp-price-cta-outline" onClick={() => onAuth("signup")}>Tenho interesse <ArrowRight size={16} /></Button><small className="vp-price-footnote">Preço e limite sujeitos à validação. Sem checkout nesta página.</small></article>
              <article className="vp-price-card vp-price-featured"><span className="vp-price-recommended">OPÇÃO EM DESTAQUE</span><span className="vp-price-kicker">PARA MAIS ESPAÇO</span><h3>Vibra Premium</h3><p className="vp-price-description">Mais capacidade de conversa, se confirmada na configuração final.</p><div className="vp-price"><strong>R$ 49,90</strong><span>/ mês planejado</span></div><ul><li><Check size={16} /> Recursos disponíveis na conta</li><li><Check size={16} /> Registros e organização pessoal</li><li><MessageCircle size={16} /> Até 200 mensagens por ciclo <small>(proposta, não confirmada)</small></li></ul><Button className="vp-button vp-price-cta" onClick={() => onAuth("signup")}>Começar pelo cadastro <ArrowRight size={16} /></Button><small className="vp-price-footnote">Preço e limite sujeitos à validação. Sem checkout nesta página.</small></article>
            </div>
            <p className="vp-pricing-terms">Cobrança mensal planejada. Valores, recursos, limites, renovação e cancelamento precisam ser confirmados nos termos oficiais antes da oferta ao público.</p>
          </div>
        </section>

        <section id="vibra-faq" className="vp-section vp-container vp-faq vp-faq-premium" aria-labelledby="vp-faq-title">
          <div className="vp-section-heading"><div><p className="vp-eyebrow">DÚVIDAS FREQUENTES</p><h2 id="vp-faq-title">Perguntas que <span>valem a pena.</span></h2></div><p>Informações claras para você conhecer a plataforma.</p></div>
          <div className="vp-faq-list">
            {faqs.map((faq, index) => <details key={faq.q} open={expandedFaq === index} onToggle={(event) => { if ((event.currentTarget as HTMLDetailsElement).open) setExpandedFaq(index); }}><summary onClick={(event) => { event.preventDefault(); setExpandedFaq(expandedFaq === index ? null : index); }}>{faq.q}<span aria-hidden="true">{expandedFaq === index ? "−" : "+"}</span></summary>{expandedFaq === index && <p>{faq.a}</p>}</details>)}
          </div>
        </section>

        <section className="vp-final vp-container vp-final-premium">
          <p className="vp-eyebrow">O COMEÇO É SEU</p><h2>Transforme intenção<br />em <span>movimento.</span></h2><p>Organize sua rotina com o Vibra, no seu ritmo.</p><Button className="vp-button" size="lg" onClick={() => onAuth("signup")}>Começar agora <ArrowRight /></Button>
        </section>
      </main>
      <footer className="vp-footer vp-footer-premium"><div className="vp-container"><div className="vp-footer-top"><a className="vp-brand" href="#inicio" onClick={(event) => { event.preventDefault(); goTo("inicio"); }}><span aria-hidden="true">V</span>vibra<span className="vp-brand-dot">.</span></a><p>Seu treino. Seu ritmo. Sua evolução.</p><Button variant="ghost" onClick={() => onAuth("login")}>Entrar na minha conta <ArrowRight /></Button></div><div className="vp-footer-bottom"><span>© 2026 Vibra</span><span>Conteúdo informativo. A Vibra AI não substitui orientação profissional.</span></div></div></footer>
    </div>
  );
}
