# Etapa 1 — Landing pública Vibra
- [x] Criar apresentação pública com conteúdo fiel às funções existentes.
- [x] Conectar CTAs à autenticação atual, mantendo dashboard em / e chat privado.
- [x] Verificar telas públicas, layout mobile, lint e compilação automática; revisar diff.
- [ ] Validar dashboard com sessão real: aguarda o usuário entrar na prévia, pois não há sessão de teste disponível para sua conta.

# Acesso administrativo de teste e navegação
- [ ] Implementar autorização restrita no servidor e navegação consistente em /, /dashboard e /plans.
- [ ] Preparar migração de privilégios e rollback seguro, sem executar SQL.
- [ ] Executar testes locais, lint e conferir compilação automática/diff.
- [ ] Ativar e validar conta administrativa real: depende da migração revisada/aplicada e do UUID confirmado em VIBRA_TEST_ADMIN_USER_ID; não autorizados nesta tarefa.