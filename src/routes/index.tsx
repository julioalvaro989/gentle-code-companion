import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: MusicianHome,
});

const releases = [
  { title: "Recomeços", type: "Single", art: "sunset" },
  { title: "Caminhos", type: "Single", art: "forest" },
  { title: "Longe de Casa", type: "Single", art: "moon" },
  { title: "Por Enquanto", type: "Single", art: "guitar" },
];

const shows = [
  ["25 ABR", "São Paulo — SP", "Teatro B32"],
  ["10 MAI", "Campinas — SP", "Bar Opinião"],
  ["24 MAI", "Rio de Janeiro — RJ", "Circo Voador"],
  ["14 JUN", "Belo Horizonte — MG", "Música na Praça"],
];

function MusicianHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const go = () => setMenuOpen(false);

  return (
    <div className="artist-site">
      <header className="site-header">
        <a href="#inicio" className="artist-logo" onClick={go}>Júlio <em>Álvaro</em></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">☰</button>
        <nav className={menuOpen ? "site-nav open" : "site-nav"}>
          {["Início", "Sobre", "Músicas", "Shows", "Galeria", "Contato"].map((item) => (
            <a key={item} href={`#${item === "Início" ? "inicio" : item.toLowerCase()}`} onClick={go}>{item}</a>
          ))}
        </nav>
        <div className="header-socials"><span>◉</span><span>▶</span><span>◎</span><span>♪</span></div>
      </header>

      <main>
        <section id="inicio" className="hero-section">
          <div className="hero-glow" />
          <div className="hero-lines" />
          <div className="hero-content">
            <p className="eyebrow">MÚSICA QUE VEM DO CORAÇÃO</p>
            <h1>Júlio Álvaro</h1>
            <p className="hero-script">Sonhos em Canções</p>
            <p className="hero-description">Cantor e compositor, apaixonado por transformar sentimentos em música. Meu som é um convite para sentir, refletir e viver o agora.</p>
            <div className="hero-actions">
              <a className="button button-light" href="#musicas">▶&nbsp; Ouça agora</a>
              <a className="button" href="#sobre">Conheça mais</a>
            </div>
          </div>
          <div className="hero-artist" aria-hidden="true"><div className="artist-silhouette"><div className="head"/><div className="body"/><div className="guitar"/><div className="mic"/></div></div>
          <div className="scroll-note">SCROLL ↓</div>
        </section>

        <section id="musicas" className="music-section section-shell">
          <div className="section-title"><div><p className="eyebrow">DISCOGRAFIA</p><h2>Últimos lançamentos</h2></div><p>Ouça nas principais plataformas</p></div>
          <div className="release-grid">
            {releases.map((release) => (
              <article className="release-card" key={release.title}>
                <button className={`cover ${release.art}`} onClick={() => setPlaying(release.title)} aria-label={`Tocar ${release.title}`}>
                  <span className="cover-label">{release.title.toUpperCase()}</span><span className="play-icon">{playing === release.title ? "Ⅱ" : "▶"}</span>
                </button>
                <div className="release-info"><div><h3>{release.title}</h3><p>Júlio Álvaro · {release.type}</p></div><button onClick={() => setPlaying(release.title)} className="mini-play">▶</button></div>
              </article>
            ))}
          </div>
          <div className="platform-row"><span>◉ Spotify</span><span>▶ YouTube</span><span>♪ Apple Music</span><span>◌ Amazon Music</span><span>▥ Deezer</span></div>
        </section>

        <section id="sobre" className="about-section">
          <div className="about-visual"><div className="vinyl">♫</div><div className="visual-caption">JÚLIO ÁLVARO<br/><small>SONHOS EM CANÇÕES</small></div></div>
          <div className="about-copy"><p className="eyebrow">QUEM SOU</p><h2>Sobre mim</h2><p>Desde pequeno, a música sempre foi o meu refúgio. Com o tempo, ela se tornou também o meu trabalho e a minha forma de me expressar.</p><p>Minha jornada é feita de aprendizados, parcerias e muita vontade de levar boas histórias através das canções.</p><a className="button" href="#contato">Fale comigo</a></div>
        </section>

        <section id="shows" className="shows-section section-shell"><div className="shows-intro"><p className="eyebrow">AO VIVO</p><h2>Próximos shows</h2><p>Vamos nos encontrar por aí?</p></div><div className="show-list">{shows.map(([date, city, venue]) => <div className="show-row" key={date + city}><strong>{date}<small>2025</small></strong><span>{city}</span><span className="venue">{venue}</span><a href="#contato">Ingressos</a></div>)}</div></section>

        <section id="galeria" className="gallery-section section-shell"><div className="section-title"><div><p className="eyebrow">MOMENTOS</p><h2>Galeria</h2></div><p>Nos palcos, nos bastidores e na estrada.</p></div><div className="gallery-grid"><div className="gallery-tile tile-one"><span>AO VIVO</span></div><div className="gallery-tile tile-two"><span>ESTÚDIO</span></div><div className="gallery-tile tile-three"><span>ESTRADA</span></div><div className="gallery-tile tile-four"><span>ENCONTROS</span></div></div></section>

        <section id="contato" className="contact-section section-shell"><div><p className="eyebrow">CONTATO</p><h2>Vamos criar algo juntos?</h2><p>Para shows, parcerias, imprensa ou outros assuntos, envie uma mensagem.</p></div><form onSubmit={(e) => { e.preventDefault(); setSent(true); }}><input required placeholder="Seu nome"/><input required type="email" placeholder="Seu e-mail"/><textarea required rows={5} placeholder="Sua mensagem"/><button className="button button-light" type="submit">{sent ? "Mensagem enviada ✓" : "Enviar mensagem →"}</button></form></section>
      </main>

      <footer className="site-footer"><div className="artist-logo">Júlio <em>Álvaro</em></div><p>© 2026 Júlio Álvaro. Todos os direitos reservados.</p><div className="footer-links"><a href="#inicio">Início</a><a href="#musicas">Músicas</a><a href="#shows">Shows</a><a href="#contato">Contato</a></div><div className="footer-socials">◉ &nbsp; ▶ &nbsp; ◎ &nbsp; ♪</div></footer>
      {playing && <div className="now-playing"><span>▶</span><div><b>{playing}</b><small>Júlio Álvaro</small></div><button onClick={() => setPlaying(null)}>×</button></div>}
    </div>
  );
}
