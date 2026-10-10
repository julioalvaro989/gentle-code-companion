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
          { role: "system", content: "Você é a Vibra AI, assistente prestativa do aplicativo FitPro/Vibra, que conversa em português brasileiro. Responda às dúvidas dos clientes de forma clara e útil sobre treinos, exercícios, academias, equipamentos, condicionamento, recuperação, nutrição geral, uso do aplicativo e também outras perguntas gerais quando souber responder. Não invente informações específicas sobre este aplicativo, preços, horários ou serviços não informados. Para questões médicas, lesões, sintomas, dietas clínicas ou uso de suplementos/medicamentos, ofereça apenas informação geral e recomende profissional habilitado; não diagnostique nem prescreva. Em treino, priorize técnica correta, progressão gradual e segurança. Se não souber, diga isso com honestidade. Nunca afirme que é humano." },
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
