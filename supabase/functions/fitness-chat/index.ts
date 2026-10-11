// Supabase Edge Function: fitness-chat
// Required server-side configuration: OPENAI_API_KEY and ALLOWED_ORIGINS (comma-separated exact origins).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

function buildFitnessSystemContext(profile: Record<string, unknown> | null, messages: Array<{ role: "user" | "assistant"; content: string }>): string {
  const base = "Você é a Vibra AI, assistente virtual fitness, e conversa em português brasileiro salvo se o usuário pedir outro idioma. Ajude com exercícios, treino, hábitos e nutrição esportiva geral. Não invente funcionalidades, preços ou dados pessoais. Para questões médicas, lesões, dietas clínicas ou medicamentos, não diagnostique nem prescreva e recomende profissional habilitado; em emergência, oriente buscar atendimento. Priorize técnica segura e progressão gradual. Nunca afirme que é humano. Este contexto é privado e pertence somente ao usuário autenticado desta solicitação.";
  if (!profile) return base;
  const birthDate = typeof profile.birth_date === "string" ? new Date(profile.birth_date) : null;
  let age: number | null = null;
  if (birthDate && Number.isFinite(birthDate.getTime())) {
    age = new Date().getFullYear() - birthDate.getFullYear();
    const beforeBirthday = new Date().getMonth() < birthDate.getMonth() || (new Date().getMonth() === birthDate.getMonth() && new Date().getDate() < birthDate.getDate());
    if (beforeBirthday) age -= 1;
  }
  const context = {
    objetivo: profile.primary_goal ?? null,
    idade: age !== null && age >= 13 && age <= 110 ? age : null,
    peso_kg: typeof profile.weight_kg === "number" ? profile.weight_kg : null,
    altura_cm: typeof profile.height_cm === "number" ? profile.height_cm : null,
    experiencia: profile.experience_level ?? null,
    frequencia_semanal: profile.weekly_frequency ?? null,
    local_treino: profile.training_location ?? null,
    preferencias: profile.preferences ?? null,
  };
  const latest = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const needsSafetyContext = /trein|exerc|dor|les[aã]o|limita|mobilidade|agach|supino|corrid|cardio|along|recupera/i.test(latest);
  const limitations = typeof profile.physical_limitations === "string" ? profile.physical_limitations.trim() : "";
  const safetyNote = needsSafetyContext && limitations
    ? ` Limitações físicas informadas pelo usuário (considere somente para segurança e adequação da resposta): ${limitations.slice(0, 1000)}.`
    : "";
  return `${base}\nContexto fitness autorizado para esta conversa (JSON): ${JSON.stringify(context)}.${safetyNote}`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (!origin || !allowedOrigins.has(origin)) {
    return new Response("Origem não autorizada.", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!supabaseUrl || !supabaseKey || !serviceRoleKey || !openAiKey || allowedOrigins.size === 0) {
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

  // Access is derived server-side from the authenticated identity. The browser
  // cannot create or promote subscription rows; only trusted backend code can.
  let subscription: { plan_id?: string; status?: string; current_period_end?: string | null } | null = null;
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/vibra_subscriptions?select=plan_id,status,current_period_end&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=1`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    if (!response.ok) return jsonError("Não foi possível validar seu acesso. Tente novamente mais tarde.", 503, origin);
    const rows = await response.json();
    subscription = Array.isArray(rows) ? rows[0] ?? null : null;
  } catch {
    return jsonError("Não foi possível validar seu acesso. Tente novamente mais tarde.", 503, origin);
  }
  const periodValid = !subscription?.current_period_end || new Date(subscription.current_period_end).getTime() > Date.now();
  if (!subscription || subscription.status !== "active" || !periodValid) {
    return jsonError("Seu pagamento ainda não está confirmado ou sua assinatura não está ativa. O acesso ao chat permanece bloqueado.", 402, origin);
  }
  // The Basic plan does not include Vibra AI. Do not infer Premium from a client
  // selection or a successful Basic payment.
  if (subscription.plan_id !== "premium") {
    return jsonError("O chat Vibra AI está disponível apenas no plano Premium ativo.", 403, origin);
  }

  let fitnessProfile: Record<string, unknown> | null = null;
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/fitness_profiles?select=username,birth_date,weight_kg,height_cm,primary_goal,experience_level,weekly_frequency,training_location,preferences,physical_limitations,profile_completed&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    if (!response.ok) return jsonError("Não foi possível carregar seu perfil fitness com segurança.", 503, origin);
    const rows = await response.json();
    fitnessProfile = Array.isArray(rows) ? rows[0] ?? null : null;
  } catch {
    return jsonError("Não foi possível carregar seu perfil fitness com segurança.", 503, origin);
  }
  if (!fitnessProfile || fitnessProfile.profile_completed !== true) {
    return jsonError("Conclua seu perfil fitness antes de usar o chat.", 403, origin);
  }

  if (rateLimitExceeded(userId)) return jsonError("Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente.", 429, origin);

  const contentLength = Number(req.headers.get("Content-Length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) return jsonError("A mensagem excede o tamanho permitido.", 413, origin);

  // Enforce the byte limit while reading, not after buffering an unbounded body.
  let rawBody: string;
  const reader = req.body?.getReader();
  if (!reader) {
    rawBody = "";
  } else {
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    let tooLarge = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_BODY_BYTES) {
          tooLarge = true;
          await reader.cancel().catch(() => {});
          break;
        }
        chunks.push(value);
      }
    } catch {
      return jsonError("Não foi possível ler a solicitação.", 400, origin);
    } finally {
      try { reader.releaseLock(); } catch { /* The stream may already be closed. */ }
    }
    if (tooLarge) return jsonError("A mensagem excede o tamanho permitido.", 413, origin);
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    rawBody = new TextDecoder().decode(bytes);
  }

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
          { role: "system", content: buildFitnessSystemContext(fitnessProfile, safeMessages) }
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
