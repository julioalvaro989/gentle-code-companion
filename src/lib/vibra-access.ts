import type { AuthSession } from "./supabase";

export function accessDestination(
  path: "/" | "/dashboard" | "/plans",
  hasSession: boolean,
  testAdmin: boolean,
): "/" | "/plans" | "/?auth=login" | null {
  if (!hasSession) return path === "/" ? null : "/?auth=login";
  if (testAdmin) return path === "/" ? null : "/";
  return path === "/plans" ? null : "/plans";
}

export async function bounded<T>(work: Promise<T>, milliseconds = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Access verification timed out")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveVibraAccess(
  readSession: () => Promise<AuthSession | null>,
  checkAdmin: () => Promise<{ authorized: boolean }>,
) {
  const session = await bounded(readSession()).catch(() => null);
  if (!session) return { session: null, testAdmin: false };
  const testAdmin = await bounded(checkAdmin())
    .then((result) => result.authorized === true)
    .catch(() => false);
  return { session, testAdmin };
}