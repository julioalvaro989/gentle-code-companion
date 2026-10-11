import { createMiddleware } from "@tanstack/react-start";

// Attach a bearer only in the browser; the server middleware validates it.
export const vibraAuthAttacher = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return next({
      headers: data.session
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {},
    });
  },
);