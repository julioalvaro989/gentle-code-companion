# Etapa 2 — plano de validação RLS (staging)

## Escopo e segurança

- Executar somente em um projeto Supabase de staging isolado, com configuração e banco separados do ambiente atual.
- Não importar dados reais. Criar duas contas fictícias A e B pela autenticação normal do Supabase.
- Usar somente a publishable/anon key no cliente e os access tokens das contas de teste. Nunca colocar service-role key no navegador, no Git ou no relatório.
- A migração `20261010000000_harden_public_table_privileges.sql` é apenas proposta; não aplicar antes de confirmar o baseline de migrações e validar em staging.

## Preparação

1. Confirmar que as tabelas e políticas em staging correspondem ao esquema auditado.
2. Criar A e B pelo fluxo de signup.
3. Autenticado como A, criar/atualizar apenas o próprio registro em `fitness_profiles` e `fitness_progress`.
4. Repetir para B, com dados sintéticos não identificáveis.
5. Preparar uma conta administrativa de teste por procedimento administrativo confiável, fora do cliente público. Não permitir que A ou B se promovam a administrador.

## Matriz de testes

| Ator | Operação | Resultado esperado |
|---|---|---|
| Sem sessão (`anon`) | SELECT/INSERT/UPDATE/DELETE em `profiles`, `fitness_profiles`, `fitness_progress` | Negado por privilégio ou sem linhas visíveis |
| Sem sessão (`anon`) | SELECT em `site_settings` | Permitido apenas para conteúdo público |
| A | SELECT do próprio perfil/progresso | Apenas dados de A |
| A | SELECT filtrado pelo ID de B | Zero linhas |
| A | UPDATE/DELETE de registros de B | Nenhuma alteração; testar com retorno de representação e confirmar zero linhas |
| A | INSERT/UPDATE de `profiles.is_admin` | Rejeitado por privilégio de coluna |
| B | Mesmos testes contra A | Mesmos resultados simétricos |
| Usuário comum A/B | INSERT/UPDATE em `site_settings` | Negado pela política RLS |
| Admin de teste | Atualizar `site_settings` e consultar lista de perfis de fitness | Permitido somente conforme políticas administrativas existentes |
| Usuário comum | Upload, substituição e exclusão no bucket `site-banners` | Negado |
| Público sem sessão | Ler banner do bucket público `site-banners` | Permitido; comportamento intencional do bucket público |

## Evidências a guardar

- Resultado HTTP e número de linhas retornadas, sem tokens nem conteúdo pessoal.
- Verificação pós-teste de que as linhas de B permaneceram inalteradas após tentativas de A, e vice-versa.
- Resultado das tentativas de acesso anônimo.
- Build, lint e testes do app depois da migração.

Não executar UPDATE/DELETE destrutivos em dados compartilhados. Usar exclusivamente linhas sintéticas de A e B no ambiente de staging.
