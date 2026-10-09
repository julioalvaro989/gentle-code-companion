import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const queryClient = new QueryClient();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return <div className="error-page"><h1>Não foi possível carregar</h1><p>Atualize a página e tente novamente.</p><button onClick={reset}>Tentar novamente</button><Link to="/">Voltar ao início</Link></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [
    { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: "FitPro — Seu aplicativo fitness" },
    { name: "description", content: "Organize treinos, nutrição, progresso e acompanhamento fitness com o FitPro." },
    { property: "og:title", content: "FitPro" },
    { property: "og:description", content: "Seu treino, sua nutrição, sua evolução." }
  ], links: [{ rel: "stylesheet", href: appCss }, { rel: "icon", href: "/favicon.ico", type: "image/x-icon" }] }),
  shellComponent: ({ children }: { children: ReactNode }) => <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>,
  component: () => { const { queryClient } = Route.useRouteContext(); return <QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider>; },
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="error-page"><h1>404</h1><Link to="/">Voltar ao início</Link></div>
});
