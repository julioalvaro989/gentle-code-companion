import { describe, expect, test } from "bun:test";
import { authorizeTestAdmin } from "./test-admin-policy.server";
import { accessDestination, bounded, resolveVibraAccess } from "./vibra-access";

const allowedId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const session = { access_token: "synthetic", refresh_token: "synthetic", user: { id: allowedId } };

describe("server test-admin policy (synthetic, no database)", () => {
  test("requires both validated allowlisted ID and trusted admin row", async () => {
    expect(await authorizeTestAdmin(allowedId, allowedId, async () => true)).toBe(true);
    expect(await authorizeTestAdmin(allowedId, allowedId, async () => false)).toBe(false);
    expect(await authorizeTestAdmin(allowedId, allowedId, async () => { throw new Error("offline"); })).toBe(false);
  });
  test("missing, invalid and mismatched allowlist denies before reading", async () => {
    let reads = 0;
    for (const configured of [undefined, "", "invalid", otherId]) {
      expect(await authorizeTestAdmin(allowedId, configured, async () => { reads++; return true; })).toBe(false);
    }
    expect(reads).toBe(0);
    expect(await authorizeTestAdmin("forged", allowedId, async () => true)).toBe(false);
  });
});

describe("navigation", () => {
  test("all nine paths stay consistent without redirect loops", () => {
    for (const path of ["/", "/dashboard", "/plans"] as const) {
      expect(accessDestination(path, false, false)).toBe(path === "/" ? null : "/?auth=login");
      expect(accessDestination(path, true, false)).toBe(path === "/plans" ? null : "/plans");
      expect(accessDestination(path, true, true)).toBe(path === "/" ? null : "/");
    }
  });
  test("anonymous never calls protected function", async () => {
    let calls = 0;
    expect(await resolveVibraAccess(async () => null, async () => { calls++; return { authorized: true }; })).toEqual({ session: null, testAdmin: false });
    expect(calls).toBe(0);
  });
  test("authorization error denies but preserves session for plans", async () => {
    expect(await resolveVibraAccess(async () => session, async () => { throw new Error("denied"); })).toEqual({ session, testAdmin: false });
  });
  test("session error and stalled operation fail closed", async () => {
    expect(await resolveVibraAccess(async () => { throw new Error("offline"); }, async () => ({ authorized: true }))).toEqual({ session: null, testAdmin: false });
    await expect(bounded(new Promise(() => {}), 5)).rejects.toThrow("timed out");
  });
});