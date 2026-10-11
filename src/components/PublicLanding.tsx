import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Check,
  Dumbbell,
  Droplets,
  HeartPulse,
  Menu,
  Sparkles,
  Target,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import hero from "../assets/vibra-landing.jpg";
import "./PublicLanding.css";

type Props = { onAuth: (mode: "login" | "signup") => void };
const resources = [
  {
    icon: Dumbbell,
    title: "Treinos com direção",
    copy: "Organize sua sessão, consulte exercícios e marque o que concluiu.",
  },
  {
    icon: Activity,
    title: "Seu progresso, à vista",
    copy: "Acompanhe a sessão e mantenha seus registros de evolução por perto.",
  },
  {
    icon: Target,
    title: "Hábitos e objetivos",
    copy: "Registre sua hidratação e escolha o objetivo que faz sentido para você.",
  },
  {
    icon: UserRound,
    title: "Um espaço que é seu",
    copy: "Reúna seu perfil, suas preferências e seu foco em um só lugar.",
  },
  {
    icon: Sparkles,
    title: "Avirafit AI integrada",
    copy: "Converse sobre exercícios, treinos e hábitos dentro da sua conta.",
  },
];

export function PublicLanding({ onAuth }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const publicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = publicRef.current;
    if (!root) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targets = root.querySelectorAll<HTMLElement>(
      ".vp-section-heading, .vp-resource, .vp-ai-layout > div, " +
        ".vp-benefit-grid > article, .vp-care-note, .vp-plans-layout > div, " +
        ".vp-final > *, .vp-section > .vp-eyebrow, .vp-section > h2",
    );
    const revealed = new Set<Element>();
    let observer: IntersectionObserver | undefined;

    function enableMotion() {
      observer?.disconnect();
      root?.classList.remove("vp-motion-enabled");
      if (preference.matches || !("IntersectionObserver" in window)) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("vp-revealed");
            revealed.add(entry.target);
            observer?.unobserve(entry.target);
          }
        },
        { threshold: 0.08 },
      );
      root?.classList.add("vp-motion-enabled");
      targets.forEach((target) => {
        if (!revealed.has(target)) observer?.observe(target);
      });
    }

    enableMotion();
    preference.addEventListener("change", enableMotion);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", enableMotion);
      root.classList.remove("vp-motion-enabled");
      targets.forEach((target) => target.classList.remove("vp-revealed"));
    };
  }, []);

  function goTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  const nav = [
    { id: "vibra-recursos", label: "Recursos" },
    { id: "vibra-ai", label: "Avirafit AI" },
    { id: "vibra-planos", label: "Planos" },
  ];
  return (
    <div className="vibra-public" ref={publicRef}>
      <a className="vp-skip" href="#vibra-conteudo">
        Pular para o conteúdo
      </a>
      <header className="vp-header">
        <div className="vp-container vp-header-inner">
          <span className="vp-brand">
            <span aria-hidden="true">A</span>avirafit<span className="vp-brand-dot">.</span>
          </span>
          <nav className="vp-desktop-nav" aria-label="Menu principal">
            {nav.map((item) => (
              <Button variant="ghost" key={item.id} onClick={() => goTo(item.id)}>
                {item.label}
              </Button>
            ))}
          </nav>
          <div className="vp-header-actions">
            <Button variant="ghost" onClick={() => onAuth("login")}>
              Entrar <ArrowRight />
            </Button>
            <Button className="vp-button vp-header-cta" onClick={() => onAuth("signup")}>
              Começar agora
            </Button>
            <Button
              ref={menuRef}
              size="icon"
              variant="ghost"
              className="vp-menu-toggle"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="vibra-menu-mobile"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="vibra-menu-mobile"
            className="vp-mobile-nav"
            aria-label="Menu mobile"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMenuOpen(false);
                menuRef.current?.focus();
              }
            }}
          >
            {nav.map((item) => (
              <Button variant="ghost" key={item.id} onClick={() => goTo(item.id)}>
                {item.label}
              </Button>
            ))}
            <Button className="vp-button" onClick={() => onAuth("signup")}>
              Começar agora <ArrowRight />
            </Button>
          </nav>
        )}
      </header>
      <main id="vibra-conteudo">
        <section className="vp-hero" aria-labelledby="vp-title">
          <div className="vp-container vp-hero-content">
            <div className="vp-hero-copy">
              <p className="vp-eyebrow">
                <Zap size={14} /> AVIRAFIT / MOVIMENTO COM PROPÓSITO
              </p>
              <h1 id="vp-title">
                Seu próximo nível começa com um plano <span>feito para você.</span>
              </h1>
              <p className="vp-hero-description">
                Mais clareza para treinar. Mais espaço para evoluir. Reúna treinos, hábitos e
                objetivos na Avirafit, no seu ritmo.
              </p>
              <div className="vp-hero-actions">
                <Button className="vp-button" size="lg" onClick={() => onAuth("signup")}>
                  Começar agora <ArrowRight />
                </Button>
                <Button
                  variant="ghost"
                  className="vp-discover"
                  onClick={() => goTo("vibra-recursos")}
                >
                  Conhecer a Avirafit <ArrowDown />
                </Button>
              </div>
              <p className="vp-hero-note">
                <Check size={14} /> Seu objetivo. Sua rotina. Seu próximo passo.
              </p>
            </div>
            <div className="vp-hero-media">
              <img
                src={hero}
                width={1536}
                height={1024}
                alt="Mulher praticando exercício com halteres em uma academia"
                fetchPriority="high"
                className="vp-hero-image"
              />
              <figure className="vp-product-preview" aria-labelledby="vp-preview-caption">
                <figcaption id="vp-preview-caption" className="vp-preview-caption">
                  <span>VISÃO DO PRODUTO</span>
                  <span>Prévia ilustrativa</span>
                </figcaption>
                <div className="vp-preview-top">
                  <span className="vp-preview-wordmark">
                    avirafit<span>.</span>
                  </span>
                  <UserRound size={18} aria-hidden="true" />
                </div>
                <div className="vp-preview-session">
                  <span className="vp-preview-kicker">SEU ESPAÇO DE TREINO</span>
                  <p className="vp-preview-title">
                    {"Sua sessão. "}
                    <br />
                    Seu ritmo.
                  </p>
                  <p>Organize o treino e acompanhe o que concluiu.</p>
                  <div className="vp-preview-exercises">
                    <Dumbbell size={22} aria-hidden="true" />
                    <div>
                      <strong>Exercícios</strong>
                      <span>Consulte sua sessão</span>
                    </div>
                    <ArrowRight size={18} aria-hidden="true" />
                  </div>
                </div>
                <dl className="vp-preview-habits">
                  <div>
                    <dt>
                      <Droplets size={18} aria-hidden="true" /> Hidratação
                    </dt>
                    <dd>Seu registro de hábitos</dd>
                  </div>
                  <div>
                    <dt>
                      <Target size={18} aria-hidden="true" /> Objetivo
                    </dt>
                    <dd>Seu foco, por perto</dd>
                  </div>
                </dl>
                <div className="vp-preview-ai">
                  <Sparkles size={21} aria-hidden="true" />
                  <div>
                    <strong>Avirafit AI</strong>
                    <span>Conversa dentro da sua conta</span>
                  </div>
                </div>
              </figure>
            </div>
          </div>
          <div className="vp-hero-footer vp-container">
            <span>CONSISTÊNCIA É UM COMEÇO.</span>
            <span>
              EVOLUÇÃO É UMA JORNADA. <ArrowDown size={15} />
            </span>
          </div>
        </section>
        <section
          id="vibra-recursos"
          className="vp-section vp-container"
          aria-labelledby="vp-resources-title"
        >
          <div className="vp-section-heading">
            <div>
              <p className="vp-eyebrow">SEU ESPAÇO DE EVOLUÇÃO</p>
              <h2 id="vp-resources-title">
                Menos dispersão.
                <br />
                <span>Mais direção.</span>
              </h2>
            </div>
            <p>
              O que importa para sua rotina, reunido em um lugar. Sem promessas mágicas. Um passo
              possível de cada vez.
            </p>
          </div>
          <div className="vp-resource-grid">
            {resources.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="vp-resource">
                <span className="vp-resource-icon">
                  <Icon size={23} />
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="vibra-ai" className="vp-ai-band">
          <div className="vp-container vp-ai-layout">
            <div>
              <p className="vp-eyebrow">
                <Sparkles size={15} /> AVIRAFIT AI
              </p>
              <h2>
                Uma conversa.
                <br />
                <span>Novas possibilidades.</span>
              </h2>
              <p>
                Um apoio para suas dúvidas sobre treinos, exercícios e hábitos. A Avirafit AI faz parte
                do seu espaço autenticado, quando você precisar de uma conversa para seguir em
                frente.
              </p>
              <Button variant="ghost" className="vp-text-cta" onClick={() => onAuth("login")}>
                Entrar para conversar <ArrowRight />
              </Button>
              <small>
                Respostas por IA podem conter erros. Confira informações importantes com um
                profissional.
              </small>
            </div>
            <div
              className="vp-ai-visual"
              aria-label="Ilustração da Avirafit AI, sem conversa interativa"
            >
              <div className="vp-ai-symbol">
                <Sparkles size={52} strokeWidth={1.4} />
              </div>
              <span className="vp-ai-name">Avirafit AI</span>
              <p>Seu espaço de conversa.</p>
              <div className="vp-ai-topics">
                <span>Treinos</span>
                <span>Exercícios</span>
                <span>Hábitos</span>
              </div>
              <div className="vp-ai-private">
                <UserRound size={14} /> Disponível dentro da sua conta
              </div>
            </div>
          </div>
        </section>
        <section className="vp-section vp-container" aria-labelledby="vp-benefits-title">
          <p className="vp-eyebrow">EVOLUÇÃO NA VIDA REAL</p>
          <h2 id="vp-benefits-title">
            No seu ritmo.
            <br />
            <span>Com mais intenção.</span>
          </h2>
          <div className="vp-benefit-grid">
            <article>
              <Check />
              <h3>Clareza para começar</h3>
              <p>Tenha sua sessão organizada e saiba o que já concluiu.</p>
            </article>
            <article>
              <Check />
              <h3>Espaço para consistência</h3>
              <p>Mantenha seus hábitos e seu objetivo presentes na rotina.</p>
            </article>
            <article>
              <Check />
              <h3>Autonomia com cuidado</h3>
              <p>Use informações como apoio, respeitando seus limites e sua condição.</p>
            </article>
          </div>
          <p className="vp-care-note">
            <HeartPulse size={20} /> A Avirafit e a Avirafit AI não substituem orientação de profissionais
            de educação física, nutrição ou saúde. Resultados variam conforme sua rotina e suas
            condições individuais.
          </p>
        </section>
        <section id="vibra-planos" className="vp-plans-band">
          <div className="vp-container vp-plans-layout">
            <div>
              <p className="vp-eyebrow">PLANOS AVIRAFIT</p>
              <h2>
                Seu próximo passo,
                <br />
                <span>sem atalhos.</span>
              </h2>
              <p>Conheça seu espaço de treinos, progresso e hábitos criando uma conta.</p>
            </div>
            <div className="vp-plan-info">
              <span className="vp-status">INFORMAÇÕES EM BREVE</span>
              <h3>Planos e condições</h3>
              <p>
                Detalhes de planos, valores e condições serão disponibilizados quando publicados.
                Nenhuma contratação ou pagamento acontece nesta página.
              </p>
              <Button className="vp-button" onClick={() => onAuth("signup")}>
                Criar minha conta <ArrowRight />
              </Button>
            </div>
          </div>
        </section>
        <section className="vp-final vp-container">
          <p className="vp-eyebrow">O COMEÇO É SEU</p>
          <h2>
            Transforme intenção
            <br />
            em <span>movimento.</span>
          </h2>
          <p>Seu próximo passo pode começar hoje.</p>
          <Button className="vp-button" size="lg" onClick={() => onAuth("signup")}>
            Começar agora <ArrowRight />
          </Button>
        </section>
      </main>
      <footer className="vp-footer">
        <div className="vp-container">
          <div className="vp-footer-top">
            <span className="vp-brand">
              <span aria-hidden="true">A</span>avirafit<span className="vp-brand-dot">.</span>
            </span>
            <p>Seu treino. Seu ritmo. Sua evolução.</p>
            <Button variant="ghost" onClick={() => onAuth("login")}>
              Entrar na minha conta <ArrowRight />
            </Button>
          </div>
          <div className="vp-footer-bottom">
            <span>© 2026 Avirafit</span>
            <span>
              Termos de uso e política de privacidade serão disponibilizados quando publicados.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
