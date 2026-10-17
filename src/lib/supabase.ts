type AuthSession = { access_token: string; refresh_token: string; user: { id: string; email?: string | undefined; user_metadata?: { full_name?: string; username?: string } | undefined } };

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

export type SiteSettings = {
  id?: boolean;
  brand_name: string;
  nav_simulator: string;
  nav_how: string;
  nav_security: string;
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  hero_primary_button: string;
  hero_secondary_button: string;
  simulator_title: string;
  simulator_description: string;
  simulator_note: string;
  result_label: string;
  result_disclaimer: string;
  how_title: string;
  step1_title: string;
  step1_description: string;
  step2_title: string;
  step2_description: string;
  step3_title: string;
  step3_description: string;
  security_title: string;
  security_description: string;
  footer_text: string;
  primary_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  banner_url: string | null;
  updated_at?: string;
};

function headers(token?: string) {
  if (!url || !key) throw new Error("O backend do Lovable Cloud ainda não está disponível neste preview.");
  return { apikey: key, Authorization: `Bearer ${token ?? key}`, "Content-Type": "application/json" };
}

async function request(path: string, options: RequestInit = {}, token?: string) {
  let currentToken = token;
  if (token) {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
    currentToken = data.session.access_token;
  }
  const response = await fetch(`${url}/${path}`, { ...options, headers: { ...headers(currentToken), ...(options.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.msg || body?.message || body?.error_description || "Não foi possível concluir a operação.");
  return body;
}

function toAuthSession(session: { access_token: string; refresh_token: string; user: { id: string; email?: string; user_metadata?: { full_name?: string; username?: string } } }): AuthSession {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: {
      id: session.user.id,
      email: session.user.email,
      user_metadata: session.user.user_metadata,
    },
  };
}

export async function signUp(username: string, email: string, password: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: username, username },
      ...(typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {}),
    },
  });
  if (error) throw error;
  if (!data.session) return null;
  const session = toAuthSession(data.session);
  return session;
}

export async function resendSignupConfirmation(email: string): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: {
      ...(typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {}),
    },
  });
  if (error) throw error;
}

export async function signIn(email: string, password: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Não foi possível iniciar a sessão. Tente novamente.");
  const session = toAuthSession(data.session);
  return session;
}

export async function signOut() {
  const { supabase } = await import("@/integrations/supabase/client");
  // Best-effort server-side release before local/remote logout. Expiry and the
  // database cap remain the fallback if the browser is offline.
  try { await supabase.functions.invoke("vibra-admin-session", { body: { action: "release" } }); } catch { /* Server expiry is the fallback. */ }
  try { localStorage.removeItem("investe_session"); } catch { /* Storage can be unavailable. */ }
  const { error } = await supabase.auth.signOut();
  if (!error) return;

  // A remote logout can fail while the local refresh token remains stored.
  // Always attempt local cleanup before propagating the remote error.
  const { error: localError } = await supabase.auth.signOut({ scope: "local" });
  if (localError) throw new Error("Não foi possível encerrar a sessão local.");
  throw error;
}

export async function signInWithGoogle() {
  const { lovable } = await import("@/integrations/lovable/index");
  const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (result.error) throw result.error instanceof Error ? result.error : new Error("Não foi possível entrar com o Google.");
  if (result.redirected) return null;
  return adoptSupabaseSession();
}

export async function adoptSupabaseSession(): Promise<AuthSession | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  // Remove the old duplicate cache; Supabase Auth storage is the only session source.
  try { localStorage.removeItem("investe_session"); } catch { /* Storage can be unavailable. */ }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const current = data.session;
  if (!current) return null;
  const { data: verified, error: verifyError } = await supabase.auth.getUser(current.access_token);
  if (verifyError) {
    if (verifyError.status === 401 || verifyError.status === 403) {
      await supabase.auth.signOut({ scope: "local" });
      return null;
    }
    throw verifyError;
  }
  if (!verified.user) {
    await supabase.auth.signOut({ scope: "local" });
    return null;
  }
  return {
    access_token: current.access_token,
    refresh_token: current.refresh_token,
    user: { id: verified.user.id, email: verified.user.email, user_metadata: verified.user.user_metadata },
  };
}

export async function getProfile(session: AuthSession) {
  const rows = await request(`rest/v1/profiles?select=id,full_name,email,is_admin&id=eq.${encodeURIComponent(session.user.id)}&limit=1`, { method: "GET" }, session.access_token);
  return rows?.[0] ?? null;
}

export async function getSiteSettings() {
  const rows = await request("rest/v1/site_settings?select=*&id=eq.true&limit=1", { method: "GET" });
  return rows?.[0] as SiteSettings | undefined;
}

export async function updateSiteSettings(session: AuthSession, changes: Partial<SiteSettings>) {
  const rows = await request("rest/v1/site_settings?id=eq.true", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...changes, updated_at: new Date().toISOString() }),
  }, session.access_token);
  return rows?.[0] as SiteSettings | undefined;
}

export async function uploadBanner(session: AuthSession, file: File) {
  if (!url || !key) throw new Error("O backend do Lovable Cloud ainda não está disponível neste preview.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `banner-${Date.now()}.${extension}`;
  const response = await fetch(`${url}/storage/v1/object/site-banners/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || body?.error || "Não foi possível enviar o banner.");
  return `${url}/storage/v1/object/public/site-banners/${path}`;
}

export type { AuthSession };


export type FitnessProfile = {
  id: string;
  username: string;
  email: string;
  goal: string;
  birth_date?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  primary_goal?: "emagrecimento" | "hipertrofia" | "condicionamento" | "saude_geral" | null;
  experience_level?: "iniciante" | "intermediario" | "avancado" | null;
  weekly_frequency?: number | null;
  training_location?: "academia" | "casa" | "outro" | null;
  preferences?: string | null;
  physical_limitations?: string | null;
  profile_completed?: boolean;
  created_at?: string;
  updated_at?: string;
};
export type FitnessProfileInput = Omit<FitnessProfile, "id" | "created_at" | "updated_at">;
export type FitnessProgress = { user_id: string; completed_exercises: string[]; water_glasses: number; goal: string; updated_at?: string };
export type VibraAccess = {
  adminSessionLimit?: boolean;
  status: "active" | "pending" | "past_due" | "canceled" | "refunded" | "failed" | "none";
  planId: "basic" | "premium" | null;
  profileCompleted: boolean;
};

export type FitnessOnboardingAnswers = Record<string, unknown>;

export type FitnessOnboardingRecord = { answers: FitnessOnboardingAnswers; updated_at: string };

export async function getFitnessOnboardingAnswers(session: AuthSession): Promise<FitnessOnboardingRecord | null> {
  const rows = await request(
    "rest/v1/fitness_onboarding_profiles?select=answers,updated_at&user_id=eq." + encodeURIComponent(session.user.id) + "&limit=1",
    {},
    session.access_token,
  );
  const row = rows?.[0];
  const answers = row?.answers;
  if (!row || typeof row.updated_at !== "string" || !answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  return { answers: answers as FitnessOnboardingAnswers, updated_at: row.updated_at };
}

export async function saveFitnessOnboardingAnswers(session: AuthSession, answers: FitnessOnboardingAnswers): Promise<void> {
  const allowedKeys = new Set(["sessionMinutes", "equipment", "foodBudget", "dietaryRestrictions", "preferredFoods", "allergies", "dislikedFoods"]);
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!allowedKeys.has(key)) throw new Error("O perfil contém um campo que não pode ser editado por esta operação.");
    patch[key] = value;
  }
  if (Object.keys(patch).length === 0) throw new Error("Nenhuma preferência foi informada para salvar.");

  if (Object.hasOwn(patch, "sessionMinutes") && patch["sessionMinutes"] !== null) {
    if (typeof patch["sessionMinutes"] !== "number" || !Number.isInteger(patch["sessionMinutes"]) || patch["sessionMinutes"] < 10 || patch["sessionMinutes"] > 240) {
      throw new Error("O tempo por sessão deve ser um número inteiro entre 10 e 240 minutos.");
    }
  }
  if (Object.hasOwn(patch, "foodBudget") && patch["foodBudget"] !== null) {
    if (typeof patch["foodBudget"] !== "number" || !Number.isFinite(patch["foodBudget"]) || patch["foodBudget"] < 0 || patch["foodBudget"] > 100000) {
      throw new Error("O orçamento mensal deve estar entre R$ 0 e R$ 100.000.");
    }
  }
  for (const key of ["equipment", "dietaryRestrictions", "preferredFoods", "allergies", "dislikedFoods"]) {
    if (!Object.hasOwn(patch, key) || patch[key] === null) continue;
    const values = patch[key];
    if (!Array.isArray(values) || values.length > 30 || values.some((item) => typeof item !== "string" || item.trim().length === 0 || item.trim().length > 100)) {
      throw new Error("Cada lista deve conter até 30 itens de texto, com 1 a 100 caracteres por item.");
    }
    patch[key] = values.map((item: string) => item.trim());
  }

  // Optimistic concurrency: the database RPC atomically merges only the allowed keys
  // if updated_at still matches this read. The server revalidates every value.
  const current = await getFitnessOnboardingAnswers(session);
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error("Sua sessão expirou. Entre novamente.");
  // Keep this RPC's contract local until generated database types include it.
  const response = await fetch(`${url}/rest/v1/rpc/update_own_fitness_onboarding_answers`, {
    method: "POST",
    headers: headers(sessionData.session.access_token),
    body: JSON.stringify({
    p_patch: patch as import("../integrations/supabase/types").Json,
    // NULL is a create-only precondition; the RPC rejects it if a row already exists.
    p_expected_updated_at: current?.updated_at ?? null,
    }),
  });
  const result = await response.json().catch(() => null);
  const error = !response.ok ? result : null;
  const data = response.ok ? result : null;
  if (!response.ok) {
    if (error?.code === "40001") throw new Error("Seu perfil foi alterado em outro dispositivo. Recarregue os dados e tente novamente.");
    if (error?.code === "P0002") throw new Error("O perfil de onboarding não existe mais. Recarregue a página e tente novamente.");
    if (error?.code === "42501") throw new Error("Sua sessão expirou ou você não tem autorização para salvar. Entre novamente.");
    throw new Error("Não foi possível salvar suas preferências com segurança. Tente novamente.");
  }
  if (data === null || data === undefined) throw new Error("A atualização não foi confirmada. Recarregue o perfil antes de continuar.");
}

export async function getFitnessProfile(session: AuthSession): Promise<FitnessProfile | null> {
  const rows = await request("rest/v1/fitness_profiles?select=*&id=eq." + encodeURIComponent(session.user.id) + "&limit=1", {}, session.access_token);
  return rows?.[0] ?? null;
}

// Patch only the legacy editable fields so saving dashboard preferences never
// overwrites the extended fitness questionnaire.
export async function saveFitnessProfile(session: AuthSession, profile: Pick<FitnessProfile, "username" | "email" | "goal">): Promise<void> {
  await request("rest/v1/fitness_profiles?id=eq." + encodeURIComponent(session.user.id), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...profile, updated_at: new Date().toISOString() }),
  }, session.access_token);
}

export async function saveFullFitnessProfile(session: AuthSession, profile: FitnessProfileInput): Promise<void> {
  await request("rest/v1/fitness_profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: session.user.id, ...profile, updated_at: new Date().toISOString() }),
  }, session.access_token);
}

async function getAdministrativeAccess(session: AuthSession): Promise<{admin:boolean;allowed:boolean;reason?:string}> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    // Use the exact, already-verified session passed by the caller. During
    // sign-in/restore, relying on the singleton client's implicit token can race
    // the auth-state update and send an absent or stale bearer to the Edge Function.
    const { data, error } = await supabase.functions.invoke("vibra-admin-session", {
      body: { action: "claim" },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      // Preserve actionable diagnostics in browser logs while never logging tokens or headers.
      const context = (error as { context?: { status?: number; statusText?: string } }).context;
      console.error("[Vibra admin authorization] Edge Function invocation failed", {
        function: "vibra-admin-session",
        status: context?.status ?? null,
        statusText: context?.statusText ?? null,
        errorName: error instanceof Error ? error.name : "FunctionsFetchError",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      if (context?.status === 401) {
        throw new Error("Sua sessão expirou. Entre novamente.");
      }
      // Admin-session tracking is an optional privilege check. If that Edge
      // Function is unavailable/misconfigured, continue with the normal
      // subscription lookup below instead of blocking every regular member.
      // This does not grant admin access or bypass subscription authorization.
      return { admin: false, allowed: false };
    }
    if (!data || typeof data.admin !== "boolean" || typeof data.allowed !== "boolean") {
      throw new Error("O serviço de autorização retornou uma resposta inválida.");
    }
    return { admin: data.admin, allowed: data.allowed, reason: typeof data.reason === "string" ? data.reason : undefined };
  } catch (error) {
    // Keep expired-session errors actionable. Other Edge Function/network errors
    // must not prevent ordinary users from reaching their subscription lookup.
    if (error instanceof Error && error.message === "Sua sessão expirou. Entre novamente.") throw error;
    console.error("[Vibra admin authorization] Falling back to subscription access check", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return { admin: false, allowed: false };
  }
}

export async function getVibraAccess(session: AuthSession): Promise<VibraAccess> {
  const administrative = await getAdministrativeAccess(session);
  if (administrative.admin && administrative.allowed) {
    const profile = await getFitnessProfile(session).catch(() => null);
    return { status: "active", planId: null, profileCompleted: profile?.profile_completed === true };
  }
  if (administrative.admin && !administrative.allowed) {
    // The server denied this authenticated session because the three-session
    // cap is full. Never fall back to paid access for a denied admin session.
    return { status: "none", planId: null, profileCompleted: false, adminSessionLimit: administrative.reason === "session_limit" };
  }
  const rows = await request(
    "rest/v1/vibra_subscriptions?select=plan_id,status,current_period_end&user_id=eq." +
      encodeURIComponent(session.user.id) + "&order=updated_at.desc&limit=1",
    {},
    session.access_token,
  );
  const subscription = rows?.[0];
  const validPeriod = !subscription?.current_period_end || new Date(subscription.current_period_end).getTime() > Date.now();
  const status: VibraAccess["status"] = subscription?.status === "active" && validPeriod
    ? "active"
    : subscription?.status === "active" && !validPeriod
      ? "past_due"
      : subscription && ["pending", "past_due", "canceled", "refunded", "failed"].includes(subscription.status)
        ? subscription.status
        : "none";
  const profile = status === "active" ? await getFitnessProfile(session) : null;
  return {
    status,
    planId: subscription?.plan_id === "basic" || subscription?.plan_id === "premium" ? subscription.plan_id : null,
    profileCompleted: profile?.profile_completed === true,
  };
}

export async function getFitnessProgress(session: AuthSession): Promise<FitnessProgress | null> {
  const rows = await request("rest/v1/fitness_progress?select=*&user_id=eq." + encodeURIComponent(session.user.id) + "&limit=1", {}, session.access_token);
  return rows?.[0] ?? null;
}
export async function saveFitnessProgress(session: AuthSession, progress: Pick<FitnessProgress, "completed_exercises" | "water_glasses" | "goal">): Promise<void> {
  await request("rest/v1/fitness_progress?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: session.user.id, ...progress, updated_at: new Date().toISOString() }),
  }, session.access_token);
}

export async function listFitnessProfiles(session: AuthSession): Promise<FitnessProfile[]> {
  return await request("rest/v1/fitness_profiles?select=*&order=created_at.desc", {}, session.access_token) as FitnessProfile[];
}
