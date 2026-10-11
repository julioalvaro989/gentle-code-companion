// Server-only policy. Both inputs originate on the server, never from RPC data.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function authorizeTestAdmin(
  validatedUserId: string,
  configuredUserId: string | undefined,
  readAdmin: (userId: string) => Promise<boolean>,
): Promise<boolean> {
  if (!configuredUserId || !uuidPattern.test(configuredUserId)) return false;
  if (!uuidPattern.test(validatedUserId)) return false;
  if (validatedUserId.toLowerCase() !== configuredUserId.toLowerCase()) return false;
  try {
    return (await readAdmin(validatedUserId)) === true;
  } catch {
    return false;
  }
}