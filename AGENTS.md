<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the existing authentication/dashboard component at `/`; public presentation is a separate component selected only after session verification, so existing access and dashboard URLs remain unchanged.
- Mount interactive Vibra AI inside the authenticated dashboard only, never in the shared root, to keep public and authentication screens chat-free.
- Keep public landing styles scoped to `.vibra-public` with semantic CSS tokens, so the existing dashboard appearance remains unchanged.
- Authorize the test-only internal app through a protected server function combining validated bearer claims, a server allowlist and the existing database admin flag; deny on errors because no subscription entitlement exists yet.
- Keep shared access decisions and bounded client verification separate from the server-only admin policy; public routes call protected functions after hydration, never in public loaders, to preserve SSR and avoid redirect loops.
- Register the client bearer attacher alongside existing request middleware; generated authentication modules remain untouched because integration-owned files must not be edited.
