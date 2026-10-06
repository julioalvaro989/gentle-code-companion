type AuthSession = { access_token: string; refresh_token: string; user: { id: string; email?: string; user_metadata?: { full_name?: string } } };
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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
export async function signUp(fullName: string, email: string, password: string) {
  const body = await request("auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: { full_name: fullName } }) });
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
export async function getProfile(session: AuthSession) {
  const rows = await request("rest/v1/profiles?select=id,full_name,email&limit=1", { method: "GET" }, session.access_token);
  return rows?.[0] ?? null;
}
