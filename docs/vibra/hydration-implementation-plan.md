# Vibra — implementação de hidratação (plano de entrega)

## Estado
- Auditoria do código e consulta somente de leitura concluídas.
- O sistema atual armazena apenas `fitness_progress.water_glasses`; não há histórico por ingestão na estrutura pública consultada.
- Migração `20261018180000_hydration_entries.sql` preparada para revisão. **Não aplicar automaticamente.**
- Nenhuma alteração no banco remoto e nenhum deploy foram executados.

## Estrutura proposta
`public.hydration_entries` armazena usuário, volume inteiro em mL, instante de consumo, data civil local, fuso horário, chave de idempotência e timestamps. RLS restringe CRUD ao dono; a tabela mantém o contador legado sem conversão inventada.

## Pontos que precisam ser resolvidos antes de aplicar
1. Confirmar independentemente que a conexão SQL ativa e a aplicação publicada apontam para `pzsgfnxkzjrvskdyaxvz`. A consulta de `app.settings.project_ref` retornou NULL, então o aceite verbal ainda não foi confirmado tecnicamente pela sessão.
2. Revisar a regra de data local. A validação baseada em `now() at time zone timezone` requer validar também o nome do fuso e tratar edições de registros antigos explicitamente; recomenda-se mover essa validação para uma função RPC segura para evitar que o cliente escolha um fuso arbitrário.
3. Decidir se CRUD deve ser via RPC transacional ou via REST com validação no banco. Idempotência está coberta pela chave única por usuário.
4. Meta hídrica: usar apenas fonte reconhecida e dados válidos; até que a regra seja aprovada, a UI deve pedir meta/manual ou mostrar “meta não definida”, sem inventar meta clínica.
5. Testar em staging: RLS entre usuários, volume/date validation, duplicação por retry, edição/exclusão, meia-noite, DST, recarga, falhas de rede e compatibilidade do contador legado.

## Próxima etapa
Após revisão da migração, implementar os métodos tipados em `src/lib/supabase.ts`, um componente responsivo dedicado e a integração na página Nutrição, sem apagar o contador legado. Executar build/testes em ambiente de desenvolvimento. Não aplicar migração nem publicar sem autorização separada.
