export type AuthSession = { access_token: string; refresh_token: string; user: { id: string; email?: string | undefined; user_metadata?: { full_name?: string; username?: string } | undefined } };

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

export async function requestPasswordReset(email: string): Promise<void> {
  if (typeof window === "undefined") throw new Error("A recuperação de senha só pode ser iniciada no navegador.");
  const { supabase } = await import("@/integrations/supabase/client");
  const redirectTo = new URL("/reset-password", window.location.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
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
  avatar_path?: string | null;
};
export type FitnessProfileInput = Omit<FitnessProfile, "id" | "created_at" | "updated_at" | "avatar_path">;
export type FitnessProgress = { user_id: string; completed_exercises: string[]; water_glasses: number; goal: string; updated_at?: string };

export type WorkoutSessionStatus = "planned" | "completed" | "partial" | "missed";
export type WorkoutSession = {
  id: string;
  user_id: string;
  title: string;
  status: WorkoutSessionStatus;
  planned_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
};

export async function listWorkoutSessions(session: AuthSession, fromDate?: string, toDate?: string): Promise<WorkoutSession[]> {
  const params = new URLSearchParams({
    select: "id,user_id,title,status,planned_for,started_at,completed_at,duration_minutes,notes,created_at",
    user_id: "eq." + session.user.id,
    order: "completed_at.desc.nullslast,created_at.desc",
    limit: "200",
  });
  if (fromDate) params.set("completed_at", "gte." + fromDate);
  if (toDate) params.set("and", "(completed_at.lte." + toDate + ")");
  const rows = await request("rest/v1/workout_sessions?" + params.toString(), {}, session.access_token);
  return Array.isArray(rows) ? rows as WorkoutSession[] : [];
}

export async function recordCompletedWorkout(
  session: AuthSession,
  input: { title: string; durationMinutes?: number | null; notes?: string | null },
): Promise<WorkoutSession> {
  const title = input.title.trim();
  if (!title || title.length > 160) throw new Error("Informe um nome de treino com até 160 caracteres.");
  const duration = input.durationMinutes ?? null;
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 600)) {
    throw new Error("A duração deve ser um número inteiro entre 1 e 600 minutos.");
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 1000) throw new Error("As observações devem ter até 1.000 caracteres.");
  const now = new Date().toISOString();
  const rows = await request("rest/v1/workout_sessions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: session.user.id,
      title,
      status: "completed",
      started_at: null,
      completed_at: now,
      duration_minutes: duration,
      notes,
      updated_at: now,
    }),
  }, session.access_token);
  if (!Array.isArray(rows) || !rows[0]?.id) throw new Error("O treino não foi confirmado pelo servidor. Tente novamente.");
  return rows[0] as WorkoutSession;
}


export type WorkoutPlanWeekRecord = {
  id: string;
  user_id: string;
  week_start: string;
  profile_snapshot: Record<string, unknown>;
  days: Array<{
    date: string;
    status: "planned" | "rest" | "in_progress" | "completed" | "rescheduled" | "cancelled";
    title: string;
    muscleGroups: string[];
    estimatedMinutes: number;
    exercises: Array<{
      exerciseId: string;
      name: string;
      primaryMuscle: string;
      equipment: string;
      instructions: string[];
      sets: number;
      reps: string;
      restSeconds: number;
      snapshot: { name: string; primaryMuscle: string; equipment: string; instructions: string[] };
    }>;
  }>;
  generation_version: number;
  created_at: string;
  updated_at: string;
};

export async function getWorkoutPlanWeek(session: AuthSession, weekStart: string): Promise<WorkoutPlanWeekRecord | null> {
  const rows = await request(
    "rest/v1/workout_plan_weeks?select=id,user_id,week_start,profile_snapshot,days,generation_version,created_at,updated_at&user_id=eq." +
    encodeURIComponent(session.user.id) + "&week_start=eq." + encodeURIComponent(weekStart) + "&limit=1",
    {}, session.access_token,
  );
  return Array.isArray(rows) && rows[0]?.id ? rows[0] as WorkoutPlanWeekRecord : null;
}

export async function saveWorkoutPlanWeek(
  session: AuthSession,
  input: { week_start: string; profile_snapshot: Record<string, unknown>; days: WorkoutPlanWeekRecord["days"]; generation_version: number },
): Promise<WorkoutPlanWeekRecord> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.week_start)) throw new Error("A data inicial do plano é inválida.");
  if (input.days.length !== 7 || input.days.some((day, index) => !day.date || !["planned", "rest"].includes(day.status) || !Array.isArray(day.exercises))) {
    throw new Error("O plano semanal precisa conter sete dias válidos.");
  }
  // The unique user/week constraint makes this idempotent. If another request
  // created the week concurrently, return that saved version instead of replacing it.
  const existing = await getWorkoutPlanWeek(session, input.week_start);
  if (existing) return existing;
  try {
    const rows = await request("rest/v1/workout_plan_weeks", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: session.user.id,
        week_start: input.week_start,
        profile_snapshot: input.profile_snapshot,
        days: input.days,
        generation_version: input.generation_version,
      }),
    }, session.access_token);
    if (Array.isArray(rows) && rows[0]?.id) return rows[0] as WorkoutPlanWeekRecord;
  } catch (error) {
    const concurrent = await getWorkoutPlanWeek(session, input.week_start).catch(() => null);
    if (concurrent) return concurrent;
    throw error;
  }
  const concurrent = await getWorkoutPlanWeek(session, input.week_start);
  if (concurrent) return concurrent;
  throw new Error("O servidor não confirmou o salvamento do plano.");
}


export async function completeWorkoutPlanDay(session: AuthSession, planWeekId: string, plannedDate: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(planWeekId) || !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) {
    throw new Error("A sessão planejada é inválida.");
  }
  await request("rest/v1/rpc/complete_workout_plan_day", {
    method: "POST",
    body: JSON.stringify({ p_plan_week_id: planWeekId, p_planned_date: plannedDate }),
  }, session.access_token);
}

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


export async function getFitnessAvatarUrl(session: AuthSession, avatarPath?: string | null): Promise<string | null> {
  if (!avatarPath) return null;
  const expectedPath = `${session.user.id}/avatar.webp`;
  if (avatarPath !== expectedPath) throw new Error("A referência da foto não corresponde à conta autenticada.");
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError || !authData.session || authData.session.user.id !== session.user.id) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }
  const { data, error } = await supabase.storage.from("user-avatars").createSignedUrl(avatarPath, 60 * 60);
  if (error || !data?.signedUrl) throw new Error("Não foi possível carregar a foto do perfil.");
  return data.signedUrl;
}

export async function saveFitnessAvatar(session: AuthSession, file: File): Promise<string> {
  if (!url || !key) throw new Error("O backend do Supabase não está disponível.");
  if (file.type !== "image/webp" || file.size > 1024 * 1024) {
    throw new Error("A imagem otimizada precisa estar em WebP e ter até 1 MB.");
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError || !authData.session) throw new Error("Sua sessão expirou. Entre novamente.");
  const { data: verified, error: verifyError } = await supabase.auth.getUser(authData.session.access_token);
  if (verifyError || !verified.user || verified.user.id !== session.user.id) {
    throw new Error("Sua sessão expirou ou não corresponde à conta ativa. Entre novamente.");
  }

  const path = `${verified.user.id}/avatar.webp`;
  const { error: uploadError } = await supabase.storage.from("user-avatars").upload(path, file, {
    cacheControl: "0",
    contentType: "image/webp",
    upsert: true,
  });
  if (uploadError) {
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Sem conexão com a internet. Verifique sua conexão e tente novamente.");
    if (uploadError.message.toLowerCase().includes("jwt") || uploadError.message.toLowerCase().includes("auth")) {
      throw new Error("Sua sessão expirou. Entre novamente.");
    }
    throw new Error("Não foi possível enviar a foto. Tente novamente.");
  }

  const rows = await request("rest/v1/fitness_profiles?id=eq." + encodeURIComponent(verified.user.id) + "&select=id", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ avatar_path: path, updated_at: new Date().toISOString() }),
  }, authData.session.access_token);
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error("A foto foi enviada, mas o perfil não confirmou a atualização. Tente salvar novamente.");
  }
  const { data: signed, error: signedError } = await supabase.storage.from("user-avatars").createSignedUrl(path, 60 * 60);
  if (signedError || !signed?.signedUrl) throw new Error("A foto foi salva, mas não foi possível carregá-la agora. Reabra o perfil.");
  return signed.signedUrl;
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

export async function listSleepSessions(session: AuthSession) {
  const params = new URLSearchParams({
    select: "id,user_id,started_at,ended_at,duration_seconds,quality_rating,wake_feeling,notes,created_at,updated_at",
    user_id: "eq." + session.user.id,
    order: "started_at.desc",
    limit: "100",
  });
  return await request("rest/v1/sleep_sessions?" + params.toString(), {}, session.access_token) as import("./sleep-utils").SleepSession[];
}

export async function startSleepSession(session: AuthSession): Promise<void> {
  await request("rest/v1/rpc/start_sleep_session", {
    method: "POST",
    body: JSON.stringify({}),
  }, session.access_token);
}

export async function finishSleepSession(
  session: AuthSession,
  id: string,
  details: { quality_rating: number; wake_feeling: string; notes: string | null },
): Promise<void> {
  await request("rest/v1/rpc/finish_sleep_session", {
    method: "POST",
    body: JSON.stringify({
      p_session_id: id,
      p_quality_rating: details.quality_rating,
      p_wake_feeling: details.wake_feeling,
      p_notes: details.notes,
    }),
  }, session.access_token);
}

export async function updateSleepSessionDetails(
  session: AuthSession,
  id: string,
  details: { quality_rating: number; wake_feeling: string; notes: string | null },
): Promise<void> {
  await request("rest/v1/rpc/update_sleep_session_details", {
    method: "POST",
    body: JSON.stringify({
      p_session_id: id,
      p_quality_rating: details.quality_rating,
      p_wake_feeling: details.wake_feeling,
      p_notes: details.notes,
    }),
  }, session.access_token);
}

export async function deleteSleepSession(session: AuthSession, id: string): Promise<void> {
  await request("rest/v1/sleep_sessions?id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(session.user.id), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  }, session.access_token);
}

export async function listFitnessProfiles(session: AuthSession): Promise<FitnessProfile[]> {
  return await request("rest/v1/fitness_profiles?select=*&order=created_at.desc", {}, session.access_token) as FitnessProfile[];
}
