// Supabase Edge Function: fitness-chat
// Configure OPENAI_API_KEY as a server-side Supabase secret before deploying.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers: corsHeaders });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "A IA ainda não foi ativada: configure o segredo OPENAI_API_KEY no Supabase e publique a função fitness-chat." }, { status: 503, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const safeMessages = messages
      .filter((item: unknown) => item && typeof item === "object" &&
        ["user", "assistant"].includes((item as { role?: string }).role ?? "") &&
        typeof (item as { content?: unknown }).content === "string")
      .slice(-12)
      .map((item: { role: "user" | "assistant"; content: string }) => ({
        role: item.role,
        content: item.content.slice(0, 4000),
      }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return Response.json({ error: "Envie uma pergunta para começar." }, { status: 400, headers: corsHeaders });
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 900,
        messages: [
          { role: "system", content: "Você é a Vibra AI, assistente virtual do FitPro — FORMA Fitness Club, e conversa sempre em português brasileiro, salvo se o cliente pedir outro idioma. Ajude o cliente com qualquer pergunta que você consiga responder com segurança e honestidade: musculação, exercícios, execução e técnica, séries e repetições, objetivos de condicionamento, cardio, alongamento, mobilidade, recuperação, descanso, hábitos saudáveis, nutrição esportiva geral, hidratação, equipamentos, academias, motivação, organização da rotina e como usar as funcionalidades do aplicativo. Responda diretamente à pergunta, com passos práticos quando útil, e faça perguntas de esclarecimento quando faltarem informações. Não invente funcionalidades, dados pessoais, preços, horários ou serviços específicos do aplicativo. Para questões médicas, sintomas, lesões, transtornos alimentares, dietas clínicas ou medicamentos/suplementos, dê apenas informação geral, não diagnostique nem prescreva, e recomende um profissional habilitado; diante de dor forte ou emergência, oriente procurar atendimento médico. Adapte sugestões de treino ao nível informado e priorize técnica correta, progressão gradual e segurança. Se não souber ou não puder confirmar algo, diga isso claramente e ofereça uma alternativa segura. Nunca afirme que é humano." },
          ...safeMessages,
        ],
      }),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("OpenAI chat error", upstream.status, result?.error?.type ?? "unknown");
      return Response.json({ error: "Não foi possível obter uma resposta agora. Tente novamente em instantes." }, { status: 502, headers: corsHeaders });
    }
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return Response.json({ error: "A IA não retornou uma resposta. Tente novamente." }, { status: 502, headers: corsHeaders });
    }
    return Response.json({ reply: reply.trim() }, { headers: corsHeaders });
  } catch (error) {
    console.error("fitness-chat request failed", error);
    return Response.json({ error: "Não consegui processar sua pergunta. Tente novamente." }, { status: 500, headers: corsHeaders });
  }
});
