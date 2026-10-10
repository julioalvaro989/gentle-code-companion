import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, MessageCircle, Minimize2, Sparkles, X } from "lucide-react";
import "./VibraChat.css";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const welcomeMessage: ChatMessage = {
  id: 1,
  role: "assistant",
  content: "Oi! 👋 Eu sou a Vibra AI. Este espaço está sendo preparado para ajudar você na sua jornada. Em breve, poderemos conversar por aqui!",
};

/**
 * Presentation-only chat shell. Keep network/API work out of this component;
 * connect a future secure server action and authenticated conversation store here.
 */
export function VibraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messageListRef.current?.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
      inputRef.current?.focus();
    }
  }, [isOpen, messages.length]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", content },
    ]);
    setDraft("");
    // Intentionally no generated reply or network request in this UI-only stage.
  }

  return (
    <div className="vibra-chat-root">
      {isOpen && (
        <section
          className="vibra-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="vibra-chat-title"
        >
          <header className="vibra-chat-header">
            <div className="vibra-chat-brand-mark" aria-hidden="true">
              <Sparkles size={20} />
            </div>
            <div className="vibra-chat-heading">
              <h2 id="vibra-chat-title">Vibra AI</h2>
              <span><i /> Seu espaço de conversa</span>
            </div>
            <button
              type="button"
              className="vibra-chat-icon-button"
              aria-label="Minimizar chat"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 size={18} />
            </button>
            <button
              type="button"
              className="vibra-chat-icon-button"
              aria-label="Fechar chat"
              onClick={() => setIsOpen(false)}
            >
              <X size={19} />
            </button>
          </header>

          <div className="vibra-chat-context">
            <span className="vibra-chat-context-icon"><Sparkles size={14} /></span>
            <span>Um novo espaço para sua evolução.</span>
          </div>

          <div className="vibra-chat-messages" ref={messageListRef} aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`vibra-chat-message-row ${message.role === "user" ? "is-user" : "is-assistant"}`}
              >
                {message.role === "assistant" && (
                  <span className="vibra-chat-avatar" aria-hidden="true">
                    <Sparkles size={14} />
                  </span>
                )}
                <div className="vibra-chat-bubble">{message.content}</div>
              </div>
            ))}
          </div>

          <form className="vibra-chat-composer" onSubmit={handleSubmit}>
            <label className="vibra-chat-sr-only" htmlFor="vibra-chat-input">
              Escreva sua mensagem
            </label>
            <textarea
              id="vibra-chat-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Escreva sua mensagem..."
              rows={1}
              maxLength={4000}
            />
            <button
              type="submit"
              className="vibra-chat-send"
              aria-label="Adicionar mensagem"
              disabled={!draft.trim()}
            >
              <ArrowUp size={19} />
            </button>
          </form>
          <p className="vibra-chat-disclaimer">
            Interface em preparação · respostas automáticas ainda não conectadas
          </p>
        </section>
      )}

      <button
        type="button"
        className={`vibra-chat-launcher ${isOpen ? "is-open" : ""}`}
        aria-label={isOpen ? "Fechar Vibra AI" : "Abrir chat Vibra AI"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={23} /> : <MessageCircle size={23} />}
        {!isOpen && <span className="vibra-chat-launcher-sparkle"><Sparkles size={12} /></span>}
        <span className="vibra-chat-launcher-label">{isOpen ? "Fechar chat" : "Vibra AI"}</span>
      </button>
    </div>
  );
}
