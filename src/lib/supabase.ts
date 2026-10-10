type AuthSession = { access_token: string; refresh_token: string; user: { id: string; email?: string; user_metadata?: { full_name?: string } } };

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
  const response = await fetch(`${url}/${path}`, { ...options, headers: { ...headers(token), ...(options.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.msg || body?.message || body?.error_description || "Não foi possível concluir a operação.");
  return body;
}

export function getStoredSession(): AuthSession | null {
  try { return JSON.parse(localStorage.getItem("investe_session") || "null"); } catch { return null; }
}

export async function signUp(username: string, email: string, password: string) {
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const signupPath = redirectTo ? `auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}` : "auth/v1/signup";
  const body = await request(signupPath, { method: "POST", body: JSON.stringify({ email, password, data: { full_name: username, username } }) });
  if (body?.access_token) {
    const session = body as AuthSession;
    localStorage.setItem("investe_session", JSON.stringify(session));
    return session;
  }
  return null;
}

export async function signIn(email: string, password: string) {
  const session = await request("auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }) as AuthSession;
  localStorage.setItem("investe_session", JSON.stringify(session));
  return session;
}

export async function signOut() {
  const session = getStoredSession();
  if (session) await request("auth/v1/logout", { method: "POST" }, session.access_token).catch(() => {});
  localStorage.removeItem("investe_session");
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
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return null;
  const session: AuthSession = {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    user: { id: s.user.id, email: s.user.email, user_metadata: s.user.user_metadata },
  };
  localStorage.setItem("investe_session", JSON.stringify(session));
  return session;
}

export async function getProfile(session: AuthSession) {
  const rows = await request("rest/v1/profiles?select=id,full_name,email,is_admin&limit=1", { method: "GET" }, session.access_token);
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


export type FitnessProfile = { id: string; username: string; email: string; goal: string; created_at?: string };
export type FitnessProgress = { user_id: string; completed_exercises: string[]; water_glasses: number; goal: string; updated_at?: string };

export async function getFitnessProfile(session: AuthSession): Promise<FitnessProfile | null> {
  const rows = await request("rest/v1/fitness_profiles?select=*&id=eq." + encodeURIComponent(session.user.id) + "&limit=1", {}, session.access_token);
  return rows?.[0] ?? null;
}
export async function saveFitnessProfile(session: AuthSession, profile: Pick<FitnessProfile, "username" | "email" | "goal">): Promise<void> {
  await request("rest/v1/fitness_profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: session.user.id, ...profile, updated_at: new Date().toISOString() }),
  }, session.access_token);
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
