# Vibra — operação segura do acesso administrativo

## Preparação obrigatória antes de habilitar

1. Revise e aplique a migration `20261012120000_vibra_admin_sessions.sql` no projeto Supabase correto.
2. Faça deploy da Edge Function `vibra-admin-session`.
3. Configure os secrets **no ambiente Supabase**, nunca no frontend:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS` com as origens exatas do app, separadas por vírgula.
4. Valide em ambiente de staging que os JWTs incluem `session_id` e que a versão do Supabase aceita as funções/roles usadas nesta migration.
5. Não considere o mecanismo ativo antes de migration, deploy e testes de RLS passarem.

## Conceder acesso ao proprietário

Primeiro crie/convide a conta do proprietário pelo fluxo normal do Supabase Auth e confirme o e-mail. Obtenha o UUID da conta autorizada em **Authentication → Users**. A autorização em runtime é decidida no backend pelo registro explícito em `vibra_admins` e pela sessão registrada; não pelo e-mail recebido no frontend. Não adicione e-mails administrativos a `VITE_*`, bundles ou respostas públicas. Depois, um operador autorizado deve executar no SQL Editor do projeto correto, usando um registro de auditoria na mesma transação.

```sql
begin;
insert into public.vibra_admins(user_id, granted_by)
values ('UUID-REAL-DO-PROPRIETARIO', 'ticket/operador autorizado');
insert into public.vibra_admin_audit(user_id, event, detail)
values ('UUID-REAL-DO-PROPRIETARIO', 'admin_granted',
        jsonb_build_object('method','manual-reviewed-sql','ticket','ID-DA-APROVACAO'));
commit;
```

Substitua os marcadores por valores reais. Não coloque o UUID, e-mail ou credenciais em código público. A tabela não concede escrita a `anon` ou `authenticated`; um usuário comum não pode se promover a administrador.

## Revogar o acesso administrativo

Execute com aprovação e registre a auditoria:

```sql
begin;
update public.vibra_admins
set revoked_at = now(), revoked_by = 'ticket/operador autorizado'
where user_id = 'UUID-REAL-DO-PROPRIETARIO' and revoked_at is null;
update public.vibra_admin_sessions
set revoked_at = now()
where user_id = 'UUID-REAL-DO-PROPRIETARIO' and revoked_at is null;
insert into public.vibra_admin_audit(user_id, event, detail)
values ('UUID-REAL-DO-PROPRIETARIO', 'admin_revoked',
        jsonb_build_object('method','manual-reviewed-sql','ticket','ID-DA-APROVACAO'));
commit;
```

## Como o limite funciona

- A Edge Function valida o bearer token com Supabase Auth e lê o `session_id` do JWT validado. A tabela `vibra_admins` e a sessão registrada no banco são a fonte autoritativa; o frontend não concede privilégios com base em e-mail ou estado local.
- A função SQL registra a sessão por UUID e expiração; uma trava consultiva por usuário serializa tentativas concorrentes.
- A transação remove registros expirados, renova sessões já registradas e só admite nova sessão se houver menos de três sessões ativas.
- A sessão administrativa só satisfaz a função RLS enquanto a função do usuário estiver ativa e o `session_id` atual constar no registro, sem revogação e antes da expiração.
- A expiração registrada é limitada a 12 horas e é renovada quando o JWT da mesma sessão é renovado e a função é chamada novamente.
- O logout tenta liberar a sessão no servidor; se o navegador estiver offline, a expiração é a alternativa.
- Os eventos de concessão/recusa/liberação são gravados em `vibra_admin_audit`. Concessão/revogação da função é auditada pelo procedimento SQL acima.

## Drift de schema encontrado no ambiente conectado

A inspeção somente leitura do banco conectado ao projeto Lovable encontrou `profiles`, `fitness_profiles` e `fitness_progress`, mas **não** encontrou `vibra_subscriptions`, `vibra_admins`, `vibra_admin_sessions`, `vibra_admin_audit` nem as RPCs `vibra_claim_admin_session`, `vibra_release_admin_session`, `vibra_is_current_admin` e `vibra_has_active_subscription`. Também faltavam as colunas estendidas do formulário fitness, incluindo `profile_completed`. Isso explica por que a validação compartilhada falha tanto no login quanto ao continuar o cadastro: a Edge Function chama a RPC administrativa ausente e devolve HTTP 503; o fluxo de cliente também depende da tabela de assinaturas ausente.

A migration de reconciliação `20261012130000_vibra_access_schema_reconciliation.sql` foi preparada para criar os objetos ausentes com RLS e grants restritos, adicionar as colunas fitness e registrar diagnósticos sanitizados da Edge Function. Ela **não foi aplicada automaticamente**. Antes de aplicar, faça backup e execute no projeto Supabase que realmente atende o app.

**Importante sobre a concessão administrativa:** a tabela legada `profiles.is_admin` tinha privilégios de INSERT/UPDATE para `authenticated`, portanto não é uma fonte segura para conceder automaticamente privilégios. A migration de reconciliação remove esses grants de escrita e usa `vibra_admins` + sessão registrada como fonte autoritativa. Depois da migration, um operador autorizado precisa inserir manualmente o UUID da conta administrativa confirmada em `vibra_admins` e registrar a concessão em `vibra_admin_audit`, conforme o procedimento acima. Não copie automaticamente `is_admin=true` para a nova tabela.

## Testes antes de produção

Executar no staging: 1, 2 e 3 sessões distintas; a 4ª sessão deve ser negada; duas tentativas concorrentes quando já existem duas sessões; renovação do mesmo `session_id`; expiração; logout; revogação da função; acesso RLS de usuário comum sem assinatura; acesso RLS de cliente com pagamento ativo; tentativa de escrita direta em `vibra_admins` e `vibra_admin_sessions` como `authenticated`. Confirmar também que uma sessão negada não consegue ler/alterar perfil, progresso ou chamar recursos pagos.

**Estado do repositório:** estes testes não foram executados nesta alteração. A migration não é aplicada automaticamente e a Edge Function não é implantada automaticamente. Não conceda a função nem habilite produção até concluir esses passos.
