import { useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Check,
  Dumbbell,
  HeartPulse,
  Menu,
  Sparkles,
  Target,
  TrendingUp,
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
    title: "Vibra AI integrada",
    copy: "Converse sobre exercícios, treinos e hábitos dentro da sua conta.",
  },
];

export function PublicLanding({ onAuth }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  function goTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  const nav = [
    { id: "vibra-como-funciona", label: "Como funciona" },
    { id: "vibra-recursos", label: "Recursos" },
    { id: "vibra-sobre", label: "Sobre" },
    { id: "vibra-ai", label: "Vibra AI" },
    { id: "vibra-faq", label: "FAQ" },
  ];
  return (
    <div className="vibra-public">
      <a className="vp-skip" href="#vibra-conteudo">
        Pular para o conteúdo
      </a>
      <header className="vp-header">
        <div className="vp-container vp-header-inner">
          <span className="vp-brand">
            <span aria-hidden="true">V</span>vibra<span className="vp-brand-dot">.</span>
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
          <img
            src={hero}
            width={1536}
            height={1024}
            alt="Mulher praticando exercício com halteres em uma academia"
            fetchPriority="high"
            className="vp-hero-image"
          />
          <div className="vp-hero-shade" />
          <div className="vp-container vp-hero-content">
            <p className="vp-eyebrow">
              <Zap size={14} /> MOVIMENTO COM PROPÓSITO
            </p>
            <h1 id="vp-title">
              Seu próximo nível começa com um plano <span>feito para você.</span>
            </h1>
            <p className="vp-hero-description">
              Mais clareza para treinar. Mais espaço para evoluir. Reúna treinos, hábitos e
              objetivos na Vibra, no seu ritmo.
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
                Conhecer a Vibra <ArrowDown />
              </Button>
            </div>
            <p className="vp-hero-note">
              <Check size={14} /> Seu objetivo. Sua rotina. Seu próximo passo.
            </p>
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
        <section id="vibra-sobre" className="vp-about-band">
          <div className="vp-container vp-about-layout">
            <div className="vp-about-orbit" aria-hidden="true"><span className="vp-orbit orbit-one" /><span className="vp-orbit orbit-two" /><span className="vp-orbit-core"><Dumbbell size={36} /></span><span className="vp-orbit-dot" /></div>
            <div><p className="vp-eyebrow"><HeartPulse size={15} /> SOBRE A VIBRA</p><h2>Feita para acompanhar <span>seu movimento.</span></h2><p>A Vibra é um espaço digital para aproximar treino, hábitos e metas. A proposta é ajudar você a se organizar, entender sua rotina e construir consistência sem prometer resultados instantâneos.</p><p>Seu ritmo importa. Respeite seus limites e procure orientação profissional sempre que precisar.</p><Button className="vp-button" onClick={() => onAuth("signup")}>Fazer parte <ArrowRight /></Button></div>
          </div>
        </section>
        <section id="vibra-ai" className="vp-ai-band">
          <div className="vp-container vp-ai-layout">
            <div>
              <p className="vp-eyebrow">
                <Sparkles size={15} /> VIBRA AI
              </p>
              <h2>
                Uma conversa.
                <br />
                <span>Novas possibilidades.</span>
              </h2>
              <p>
                Um apoio para suas dúvidas sobre treinos, exercícios e hábitos. A Vibra AI faz parte
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
              aria-label="Ilustração da Vibra AI, sem conversa interativa"
            >
              <div className="vp-ai-symbol">
                <Sparkles size={52} strokeWidth={1.4} />
              </div>
              <span className="vp-ai-name">Vibra AI</span>
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
            <HeartPulse size={20} /> A Vibra e a Vibra AI não substituem orientação de profissionais
            de educação física, nutrição ou saúde. Resultados variam conforme sua rotina e suas
            condições individuais.
          </p>
        </section>
        <section id="vibra-faq" className="vp-section vp-container vp-faq" aria-labelledby="vp-faq-title">
          <div className="vp-section-heading"><div><p className="vp-eyebrow">DÚVIDAS FREQUENTES</p><h2 id="vp-faq-title">Perguntas que <span>valem a pena.</span></h2></div><p>Veja respostas rápidas sobre o uso da plataforma.</p></div>
          <div className="vp-faq-list">
            <details><summary>Como começo a usar a Vibra?<span aria-hidden="true">+</span></summary><p>Clique em “Começar agora”, crie sua conta e entre para acessar as ferramentas disponíveis no aplicativo.</p></details>
            <details><summary>A Vibra funciona no celular?<span aria-hidden="true">+</span></summary><p>Sim. A interface é preparada para telas de celular e computador. Você pode acessar pelo navegador do seu dispositivo.</p></details>
            <details><summary>Posso acompanhar meus treinos e hábitos?<span aria-hidden="true">+</span></summary><p>Você pode consultar exercícios, registrar sessões e manter objetivos e hábitos reunidos no seu espaço pessoal, conforme os recursos disponíveis na sua conta.</p></details>
            <details><summary>A Vibra AI substitui um profissional de saúde ou educação física?<span aria-hidden="true">+</span></summary><p>Não. A IA oferece informações gerais e pode cometer erros. Para recomendações individuais, lesões, doenças ou dúvidas importantes, procure um profissional qualificado.</p></details>
            <details><summary>Quanto custa usar a Vibra?<span aria-hidden="true">+</span></summary><p>Os valores e condições dos planos ainda não estão publicados nesta página. Não há contratação ou pagamento por meio desta landing page.</p></details>
            <details><summary>Como crio minha conta?<span aria-hidden="true">+</span></summary><p>Use qualquer botão “Começar agora” para abrir o cadastro e seguir as instruções na tela.</p></details>
          </div>
        </section>
        <section id="vibra-planos" className="vp-plans-band">
          <div className="vp-container vp-plans-layout">
            <div>
              <p className="vp-eyebrow">PLANOS VIBRA</p>
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
              <span aria-hidden="true">V</span>vibra<span className="vp-brand-dot">.</span>
            </span>
            <p>Seu treino. Seu ritmo. Sua evolução.</p>
            <Button variant="ghost" onClick={() => onAuth("login")}>
              Entrar na minha conta <ArrowRight />
            </Button>
          </div>
          <div className="vp-footer-bottom">
            <span>© 2026 Vibra</span>
            <span>
              Termos de uso e política de privacidade serão disponibilizados quando publicados.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
