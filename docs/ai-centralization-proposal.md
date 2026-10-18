# Vibra — Proposta de arquitetura central de IA e controle de consumo

**Status:** proposta para revisão; não implementada em runtime.  
**Branch-alvo:** `main`.  
**Projeto Supabase esperado:** `pzsgfnxkzjrvskdyaxvz`.  
**Restrições:** sem migration aplicada, sem alteração do banco remoto, sem segredos, sem deploy, sem chamadas ao provedor.

## 1. Resultado da revisão do código atual

A Edge Function `supabase/functions/fitness-chat/index.ts` implementa uma chamada direta a `https://api.openai.com/v1/chat/completions`. Usa `OPENAI_API_KEY` no servidor e `OPENAI_MODEL`, com fallback para `gpt-4o-mini`. A função também:

- valida o token por `/auth/v1/user`;
- consulta `vibra_subscriptions` para validar assinatura ativa e exige `plan_id === "premium"`;
- consulta `fitness_profiles` e `fitness_onboarding_profiles`;
- tenta carregar `workout_sessions` como contexto opcional;
- valida origem CORS, método, tamanho do corpo, formato e quantidade de mensagens;
- aplica um limite em memória de 10 solicitações/minuto/usuário/instância;
- limita o timeout a 20 segundos e a saída a 900 tokens;
- não persiste, no trecho revisado, tokens, custo, reservas de quota ou histórico operacional da chamada.

O limite em memória não é global, durável nem atômico. Ele deve continuar sendo tratado apenas como defesa complementar, não como quota comercial.

O frontend `src/components/VibraChat.tsx` envia mensagens à função com a sessão atual e não contém a chave do provedor no código observado. A verificação de acesso no frontend serve à interface; a autorização deve continuar no servidor.

## 2. Limitações da evidência remota

`supabase/config.toml` declara o identificador esperado `pzsgfnxkzjrvskdyaxvz`, mas isso não comprova que a função esteja implantada nesse projeto ou que os segredos remotos existam/sejam válidos.

Os nomes `vibra_subscriptions`, `fitness_profiles`, `fitness_onboarding_profiles` e `workout_sessions` são consultados pelo código. Não se afirma aqui que as tabelas, colunas, índices, RLS e permissões remotas correspondam à branch `main`: isso exige uma inspeção somente de leitura do banco remoto.

Não foi confirmada uma tabela ou RPC persistente de quota de IA. Antes de propor nomes definitivos ou criar estruturas, inventariar as migrations versionadas e consultar o schema remoto, políticas RLS, funções RPC, triggers e permissões. Não criar uma segunda contabilidade se já existir mecanismo equivalente.

## 3. Arquitetura de destino

Todas as funcionalidades devem passar por um único orquestrador no servidor, sem chamadas diretas do navegador ao provedor:

- `chat`
- `meal_plan`
- `food_substitution`
- `meal_photo_analysis`

Esses identificadores são apenas categorias técnicas. Cada operação precisa de uma autorização de produto explícita no servidor. Conhecer ou enviar uma categoria não concede acesso.

Fluxo proposto:

1. Validar origem, método, tamanho e esquema do pedido.
2. Validar o access token com Supabase Auth e derivar o `user_id` exclusivamente da sessão.
3. Consultar no servidor a assinatura real, o ciclo vigente e a permissão específica da funcionalidade. Nunca confiar em plano, preço, quota ou custo enviado pelo cliente.
4. Aplicar rate limit rápido e reservar quota compartilhada por usuário/ciclo com uma operação atômica no banco.
5. Gerar um identificador de operação idempotente; impedir que retries do mesmo pedido reservem quota ou cobrem duas vezes.
6. Estimar um teto de custo antes da chamada, usando tarifas versionadas/configuradas no servidor e limites de entrada/saída. Se não for possível limitar a exposição, rejeitar antes da chamada.
7. Chamar o adaptador do provedor somente depois de autorização e reserva bem-sucedidas.
8. Persistir resultado, métricas de uso fornecidas pelo provedor e estimativas. Não gravar conteúdo integral de conversa ou imagem nos logs de auditoria.
9. Finalizar a reserva com uso/custo observado ou liberar/ajustar a reserva quando for comprovado que a chamada não foi processada.
10. Se ocorrer timeout ou perda de conexão após envio, marcar a operação como ambígua/pendente de reconciliação; não presumir custo zero nem repetir automaticamente sem idempotência do provedor ou política segura.
11. Devolver ao frontend apenas resposta necessária, estado e identificador não sensível da operação.

### Separação de responsabilidades

- **Edge Function/orquestrador:** autenticação, validação de permissão, limites de payload, chamada externa e resposta.
- **RPC transacional de quota:** reserva atômica, controle de concorrência, ciclo, idempotência e finalização. Deve validar usuário/assinatura no servidor e impedir chamadas diretas que contornem a política.
- **Adaptadores de provedor:** normalizam resposta, tokens e erros sem pressupor que todos os provedores informam as mesmas métricas.
- **Registro de uso:** fonte única de verdade compartilhada por todas as funcionalidades.
- **Rate limit distribuído:** complemento ao orçamento/ciclo; o `Map` local atual não é substituto.

Não colocar uma chave de serviço do Supabase no frontend. A chave do provedor permanece em secret de Edge Function. Nunca registrar valor de secret, token de sessão ou payload nutricional sensível.

## 4. Modelo lógico de contabilização — proposta, não schema aplicado

Primeiro verificar se já há tabelas de uso/quota e reaproveitá-las. Se não houver equivalente, discutir uma estrutura persistente com campos equivalentes a:

### Operações de IA

- identificador interno da operação;
- `user_id` obtido da sessão;
- categoria da funcionalidade;
- provedor e modelo efetivamente utilizados;
- estado: `reserved`, `running`, `succeeded`, `failed`, `unknown_pending_reconciliation`, `cancelled`;
- chave idempotente única por usuário e operação;
- ciclo da assinatura associado à reserva;
- timestamps de criação, início, conclusão e reconciliação;
- tokens de entrada/saída, apenas quando informados;
- métricas específicas de imagem, quando fornecidas;
- custo estimado e custo confirmado em campos distintos;
- código de erro normalizado e identificador de requisição do provedor, quando disponível;
- versão da política/tarifa usada na estimativa.

### Contadores/reservas de quota

Uma reserva transacional deve impedir saldo negativo sob concorrência. O modelo precisa suportar limites compartilhados por ciclo e, se aprovados, por minuto/dia, sem um contador independente por funcionalidade. As categorias podem ter pesos diferentes, mas todas debitam a mesma política central de orçamento/consumo.

### Privacidade e RLS

- usuários não podem inserir, alterar ou apagar seus próprios registros de consumo para aumentar quota;
- somente funções de servidor autorizadas podem reservar/finalizar uso;
- acessos administrativos devem ser explicitamente autorizados no servidor;
- não persistir conteúdo integral das mensagens, fotos ou dados pessoais nos registros de auditoria;
- definir retenção, acesso mínimo e auditoria antes da implementação.

## 5. Concorrência, idempotência e falhas

- **Quota esgotada:** rejeitar antes da chamada ao provedor.
- **Pedidos simultâneos:** reserva atômica no banco; apenas operações dentro da quota podem prosseguir.
- **Pedido duplicado:** chave idempotente única; devolver estado/resultado existente sem nova chamada nem nova reserva.
- **Falha antes de enviar ao provedor:** marcar falha e liberar a reserva quando for seguro comprovar que não houve envio.
- **Erro HTTP do provedor:** guardar apenas metadados necessários; reconciliar uso se houver dados confiáveis.
- **Timeout após envio:** marcar custo/estado como desconhecido e reconciliar; não afirmar custo zero.
- **Retry:** não repetir automaticamente operações potencialmente faturáveis sem estratégia de idempotência comprovada.
- **Métricas ausentes:** não inventar tokens/custo confirmado; manter estimativa separada e marcar origem/qualidade da medida.
- **Limite por minuto:** aplicar no servidor e, para consistência entre instâncias, usar mecanismo compartilhado; manter proteção local apenas como defesa adicional.

## 6. Plano alimentar sem API

Podem ser desenvolvidas independentemente da IA, depois de verificar o schema existente:

- registros manuais de refeições;
- leitura de planos/histórico persistidos;
- listas de compras calculadas a partir de planos persistidos;
- relatórios determinísticos com dados reais;
- cálculos de nutrientes somente com uma fonte nutricional confiável, porções e unidades definidas.

Dependem de IA e devem permanecer indisponíveis até a integração ser validada:

- geração automática de plano personalizado;
- sugestões e substituições generativas;
- interpretação de fotografias de refeições.

Enquanto indisponíveis, mostrar uma mensagem explícita. Não produzir respostas simuladas nem números nutricionais inventados. A IA pode interpretar uma solicitação, mas a composição nutricional deve vir de uma base verificável.

## 7. Plano de testes antes da ativação

Os testes devem usar mocks/fakes de provedor e banco isolado, sem chamadas pagas. Não devem ser executados contra o banco de produção.

1. Usuário não autenticado → rejeitado, sem reserva nem chamada.
2. Assinatura ausente, expirada ou sem permissão para a funcionalidade → rejeitado.
3. Quota esgotada → rejeitado antes do provedor.
4. N requisições concorrentes no limite → nunca permitir consumo acima do saldo.
5. Mesmo pedido/chave idempotente repetido → uma única operação e uma única chamada externa.
6. Duas chaves diferentes concorrentes → ambas respeitam a reserva compartilhada.
7. Falha antes do envio → reserva liberada de forma segura.
8. Timeout depois do envio → estado ambíguo, sem assumir custo zero ou repetir cegamente.
9. Erro 429/5xx/credencial inválida do provedor → resposta segura, sem revelar segredo, com reconciliação correta.
10. Provedor sem métricas de uso → tokens/custo confirmado ficam desconhecidos; estimativa permanece separada.
11. Usuários A e B → nenhum perfil, quota, histórico ou operação cruzado.
12. Chamada direta à Edge Function com categoria arbitrária, plano ou quota falsificados → nenhuma autorização extra.
13. Tentativa de alterar registros de uso pelo cliente → negada por RPC/RLS/permissões.
14. Payload grande ou imagem inválida → rejeitado antes de reservar ou chamar o provedor.
15. Requisições repetidas após reinício de instância → quota e idempotência continuam corretas porque são persistentes.

## 8. Etapas propostas

1. **Auditoria remota somente de leitura:** schema, RLS, RPCs, tabelas de assinatura, segredos apenas por nome/configuração, estado de implantação.
2. **Revisão de schema:** mapear entidades existentes e identificar se quota/uso já existe.
3. **Proposta de migration e RPC transacional:** apresentar SQL para revisão; não aplicar remotamente nesta etapa.
4. **Implementação local do módulo compartilhado e testes isolados:** não ativar tráfego de produção.
5. **Adaptação do chat para o orquestrador:** só depois da reserva persistente estar implementada e testada; evitar deixar caminho alternativo que contorne a quota.
6. **Adicionar funcionalidades alimentares uma a uma**, reutilizando o mesmo serviço.
7. **Configuração de provedor e validação controlada:** somente após aprovação explícita de custos, segredo, limites e ambiente de teste.

## 9. Limites desta entrega

Este documento é uma proposta técnica. Não altera o comportamento do aplicativo, não cria tabela/RPC, não modifica migrations, não configura secrets, não executa chamadas externas e não declara o serviço funcional em produção. Os testes acima são casos planejados; não foram executados nesta etapa.
