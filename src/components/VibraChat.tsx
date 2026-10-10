import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
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
  content: "Oi! 👋 Eu sou a Vibra AI. Posso ajudar com treinos, exercícios, academia, hábitos saudáveis e dúvidas gerais. O que você gostaria de saber?",
};

const positionStorageKey = "vibra-chat-launcher-position";
type Position = { x: number; y: number };
type Drag = { pointerId: number; startX: number; startY: number; origin: Position; moved: boolean };

function readPosition(): Position | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(positionStorageKey) ?? "null");
    if (typeof stored !== "object" || stored === null) return null;
    const value = stored as Record<string, unknown>;
    if (value.version !== 1 || typeof value.x !== "number" || typeof value.y !== "number" ||
        !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
    return { x: value.x, y: value.y };
  } catch { return null; }
}

function savePosition(position: Position) {
  try { localStorage.setItem(positionStorageKey, JSON.stringify({ version: 1, ...position })); }
  catch { /* Storage may be disabled; dragging still works for this visit. */ }
}

/**
 * Chat client connected to the secure Supabase Edge Function. API secrets stay server-side.
 */
export function VibraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const positionRef = useRef<Position | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<Position | null>(null);
  const suppressClickRef = useRef(false);
  const hasSavedPositionRef = useRef(false);

  // Position updates stay outside React rendering, including panel alignment.
  const place = useCallback((desired: Position) => {
    const launcher = launcherRef.current;
    if (!launcher) return;
    const viewport = window.visualViewport;
    const style = getComputedStyle(launcher);
    const left = (viewport?.offsetLeft ?? 0) + parseFloat(style.scrollMarginLeft);
    const top = (viewport?.offsetTop ?? 0) + parseFloat(style.scrollMarginTop);
    const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - parseFloat(style.scrollMarginRight);
    const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - parseFloat(style.scrollMarginBottom);
    const width = launcher.offsetWidth;
    const height = launcher.offsetHeight;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));
    const position = { x: clamp(desired.x, left, right - width), y: clamp(desired.y, top, bottom - height) };
    positionRef.current = position;
    launcher.classList.add("is-positioned");
    launcher.style.setProperty("--vibra-launcher-x", `${position.x}px`);
    launcher.style.setProperty("--vibra-launcher-y", `${position.y}px`);

    const panel = panelRef.current;
    if (!panel) return;
    panel.classList.add("is-positioned");
    panel.style.setProperty("--vibra-panel-max-width", `${Math.max(0, right - left)}px`);
    panel.style.setProperty("--vibra-panel-max-height", `${Math.max(0, bottom - top)}px`);
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const gap = 12;
    const above = position.y - panelHeight - gap;
    const below = position.y + height + gap;
    let panelX = position.x;
    let panelY = above >= top ? above : below + panelHeight <= bottom ? below : top;
    // On tall panels, prefer beside the launcher rather than covering it.
    if (above < top && below + panelHeight > bottom) {
      if (position.x + width + gap + panelWidth <= right) panelX = position.x + width + gap;
      else if (position.x - gap - panelWidth >= left) panelX = position.x - gap - panelWidth;
      panelY = clamp(position.y, top, bottom - panelHeight);
    }
    panel.style.setProperty("--vibra-panel-x", `${clamp(panelX, left, right - panelWidth)}px`);
    panel.style.setProperty("--vibra-panel-y", `${clamp(panelY, top, bottom - panelHeight)}px`);
  }, []);

  useEffect(() => {
    const launcher = launcherRef.current;
    if (!launcher) return;
    const stored = readPosition();
    hasSavedPositionRef.current = stored !== null;
    const initial = launcher.getBoundingClientRect();
    place(stored ?? { x: initial.left, y: initial.top });
    const reflow = () => {
      if (dragRef.current) {
        dragRef.current = null;
        suppressClickRef.current = true;
        launcher.classList.remove("is-dragging");
      }
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      pendingRef.current = null;
      if (!hasSavedPositionRef.current) {
        launcher.classList.remove("is-positioned");
        const rect = launcher.getBoundingClientRect();
        place({ x: rect.left, y: rect.top });
      } else if (positionRef.current) {
        place(positionRef.current);
        if (positionRef.current) savePosition(positionRef.current);
      }
    };
    window.addEventListener("resize", reflow);
    window.addEventListener("orientationchange", reflow);
    window.visualViewport?.addEventListener("resize", reflow);
    window.visualViewport?.addEventListener("scroll", reflow);
    const observer = new ResizeObserver(() => {
      if (positionRef.current) place(positionRef.current);
    });
    observer.observe(launcher);
    return () => {
      window.removeEventListener("resize", reflow);
      window.removeEventListener("orientationchange", reflow);
      window.visualViewport?.removeEventListener("resize", reflow);
      window.visualViewport?.removeEventListener("scroll", reflow);
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [place]);

  useEffect(() => {
    if (positionRef.current) place(positionRef.current);
  }, [isOpen, place]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || !positionRef.current) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      origin: { ...positionRef.current }, moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    event.currentTarget.classList.add("is-dragging");
    pendingRef.current = { x: drag.origin.x + dx, y: drag.origin.y + dy };
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (pendingRef.current) place(pendingRef.current);
      pendingRef.current = null;
    });
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (pendingRef.current) place(pendingRef.current);
    pendingRef.current = null;
    dragRef.current = null;
    event.currentTarget.classList.remove("is-dragging");
    suppressClickRef.current = drag.moved;
    if (drag.moved && positionRef.current) {
      hasSavedPositionRef.current = true;
      savePosition(positionRef.current);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  useEffect(() => {
    if (isOpen) {
      messageListRef.current?.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
      inputRef.current?.focus();
    }
  }, [isOpen, messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    const history = [...messages, { id: Date.now(), role: "user" as const, content }];
    setMessages(history);
    setDraft("");
    setIsSending(true);
    try {
      const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
      const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
      if (!supabaseUrl || !publishableKey) {
        throw new Error("O serviço de IA não está configurado neste ambiente.");
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/fitness-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
        body: JSON.stringify({
          messages: history.filter((message) => message.role !== "assistant" || message.id !== welcomeMessage.id)
            .slice(-12).map(({ role, content }) => ({ role, content })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Não consegui responder agora. Tente novamente.");
      const answer = typeof result?.reply === "string" ? result.reply : "";
      if (!answer) throw new Error("A IA não retornou uma resposta. Tente novamente.");
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: answer }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: Date.now() + 1,
        role: "assistant",
        content: error instanceof Error ? error.message : "Ocorreu um erro ao consultar a IA. Tente novamente.",
      }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="vibra-chat-root">
      {isOpen && (
        <section
          ref={panelRef}
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
              disabled={!draft.trim() || isSending}
            >
              isSending ? <span aria-hidden="true">…</span> : <ArrowUp size={19} />
            </button>
          </form>
          <p className="vibra-chat-disclaimer">
            Respostas por IA · confira informações importantes com um profissional
          </p>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        className={`vibra-chat-launcher ${isOpen ? "is-open" : ""}`}
        aria-label={isOpen ? "Fechar Vibra AI" : "Abrir chat Vibra AI"}
        aria-expanded={isOpen}
        title="Vibra AI · arraste para reposicionar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onClick={(event) => {
          if (suppressClickRef.current && event.detail !== 0) {
            suppressClickRef.current = false;
            event.preventDefault();
            return;
          }
          suppressClickRef.current = false;
          setIsOpen((open) => !open);
        }}
      >
        <span className="vibra-chat-launcher-content">
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && <span className="vibra-chat-launcher-sparkle"><Sparkles size={10} /></span>}
        <span className="vibra-chat-launcher-label">{isOpen ? "Fechar chat" : "Vibra AI"}</span>
        </span>
      </button>
    </div>
  );
}
