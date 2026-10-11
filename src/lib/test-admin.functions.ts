import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTestAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorizeTestAdmin } = await import("./test-admin-policy.server");
    const authorized = await authorizeTestAdmin(
      context.userId,
      process.env["VIBRA_TEST_ADMIN_USER_ID"],
      async (userId) => {
        // RLS-scoped read, not a browser flag and not a service-role client.
        const { data, error } = await context.supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", userId)
          .maybeSingle();
        return !error && data?.is_admin === true;
      },
    );
    return { authorized };
  });