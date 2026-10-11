// Supabase Edge Function: fitness-chat
// Required server-side configuration: OPENAI_API_KEY and ALLOWED_ORIGINS (comma-separated exact origins).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const allowedOrigins = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const requestsByUser = new Map<string, number[]>();
const MAX_BODY_BYTES = 32 * 1024;
const MAX_REQUESTS_PER_MINUTE_PER_INSTANCE = 10;

function responseHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
}

function jsonError(message: string, status: number, origin: string) {
  return new Response(JSON.stringify({ error: message }), { status, headers: responseHeaders(origin) });
}

function rateLimitExceeded(userId: string): boolean {
  const now = Date.now();
  const recent = (requestsByUser.get(userId) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE_PER_INSTANCE) {
    requestsByUser.set(userId, recent);
    return true;
  }
  recent.push(now);
  requestsByUser.set(userId, recent);
  if (requestsByUser.size > 5000) {
    for (const [id, timestamps] of requestsByUser) {
      if (!timestamps.some((time) => now - time < 60_000)) requestsByUser.delete(id);
    }
  }
  return false;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (!origin || !allowedOrigins.has(origin)) {
    return new Response("Origem não autorizada.", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!supabaseUrl || !supabaseKey || !openAiKey || allowedOrigins.size === 0) {
    return jsonError("O serviço de IA não está configurado corretamente.", 503, origin);
  }
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(origin) });
  if (req.method !== "POST") return jsonError("Método não permitido.", 405, origin);

  const tokenMatch = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+([^\s]+)$/i);
  if (!tokenMatch) return jsonError("Autenticação necessária.", 401, origin);
  const accessToken = tokenMatch[1];

  let userId: string;
  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!authResponse.ok) return jsonError("Sessão inválida ou expirada. Entre novamente.", 401, origin);
    const user = await authResponse.json();
    if (typeof user?.id !== "string" || !user.id) return jsonError("Sessão inválida.", 401, origin);
    userId = user.id;
  } catch {
    return jsonError("Não foi possível validar sua sessão agora.", 503, origin);
  }

  if (rateLimitExceeded(userId)) return jsonError("Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente.", 429, origin);

  const contentLength = Number(req.headers.get("Content-Length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) return jsonError("A mensagem excede o tamanho permitido.", 413, origin);
  let rawBody: string;
  try { rawBody = await req.text(); } catch { return jsonError("Não foi possível ler a solicitação.", 400, origin); }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return jsonError("A mensagem excede o tamanho permitido.", 413, origin);

  let body: { messages?: unknown };
  try { body = JSON.parse(rawBody); } catch { return jsonError("Solicitação inválida.", 400, origin); }
  if (!Array.isArray(body?.messages) || body.messages.length === 0 || body.messages.length > 12) {
    return jsonError("Envie até 12 mensagens para começar.", 400, origin);
  }

  const safeMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of body.messages) {
    if (!item || typeof item !== "object") return jsonError("Formato de mensagem inválido.", 400, origin);
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim() || content.length > 4000) {
      return jsonError("Mensagem inválida ou maior que o limite de 4.000 caracteres.", 400, origin);
    }
    safeMessages.push({ role, content: content.trim() });
  }
  if (safeMessages[safeMessages.length - 1].role !== "user") return jsonError("Envie uma pergunta para começar.", 400, origin);

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 900,
        messages: [
          { role: "system", content: "Você é a Vibra AI, assistente virtual do FitPro — FORMA Fitness Club, e conversa sempre em português brasileiro, salvo se o cliente pedir outro idioma. Ajude o cliente com qualquer pergunta que você consiga responder com segurança e honestidade: musculação, exercícios, execução e técnica, séries e repetições, objetivos de condicionamento, cardio, alongamento, mobilidade, recuperação, descanso, hábitos saudáveis, nutrição esportiva geral, hidratação, equipamentos, academias, motivação, organização da rotina e como usar as funcionalidades do aplicativo. Responda diretamente à pergunta, com passos práticos quando útil, e faça perguntas de esclarecimento quando faltarem informações. Não invente funcionalidades, dados pessoais, preços, horários ou serviços específicos do aplicativo. Para questões médicas, sintomas, lesões, transtornos alimentares, dietas clínicas ou medicamentos/suplementos, dê apenas informação geral, não diagnostique nem prescreva, e recomende um profissional habilitado; diante de dor forte ou emergência, oriente procurar atendimento médico. Adapte sugestões de treino ao nível informado e priorize técnica correta, progressão gradual e segurança. Se não souber ou não puder confirmar algo, diga isso claramente e ofereça uma alternativa segura. Nunca afirme que é humano." }
          ...safeMessages,
        ],
      }),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("OpenAI chat error", upstream.status);
      return jsonError("Não foi possível obter uma resposta agora. Tente novamente em instantes.", 502, origin);
    }
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return jsonError("A IA não retornou uma resposta. Tente novamente.", 502, origin);
    return new Response(JSON.stringify({ reply: reply.trim() }), { headers: responseHeaders(origin) });
  } catch {
    return jsonError("Não consegui processar sua pergunta. Tente novamente.", 502, origin);
  }
});
