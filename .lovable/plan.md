# Vibra — revisão visual da landing pública

## Estado confirmado
- HEAD: `76595c77ada97884b43f678d256aeea8d7000ed0`, igual à referência solicitada; `git status --short` sem alterações pendentes.
- Inspecionados os dois arquivos da landing e os metadados da imagem referenciada. Não foram lidos arquivos de rotas, autenticação, dashboard ou planos.
- Nenhum arquivo da aplicação foi alterado nesta etapa. Apenas este plano foi registrado para aprovação.

## Inventário de assets e gráficos
| Item | Evidência disponível | Decisão proposta |
| --- | --- | --- |
| `src/assets/vibra-landing.jpg` | Único arquivo listado em `src/assets`; única imagem importada pela landing. JPEG RGB, 1536 × 1024 px, proporção 3:2, 114.474 bytes (111,79 KiB). As dimensões declaradas no JSX coincidem com o arquivo. | Manter o arquivo e a referência atual; não gerar, baixar ou substituir imagens. |
| Metadados da foto | JFIF; sem EXIF e sem perfil ICC. Não há autoria, licença ou proveniência comprovada nesses metadados. O texto alternativo descreve uma mulher com halteres em uma academia. | Tratar como imagem temática, não como evidência de usuários ou resultados da Vibra. |
| Prévia do produto | HTML/CSS, com os rótulos existentes “VISÃO DO PRODUTO” e “Prévia ilustrativa”. Mostra sessão, exercícios, hidratação, objetivo e Vibra AI dentro da conta; não apresenta dados numéricos nem controles funcionais. | Preservar a identificação explícita de ilustração e a ausência de interação. Não chamar de captura real. |
| Ilustração da Vibra AI | Ícones existentes e CSS; texto acessível informa que não é uma conversa interativa. | Harmonizar com a prévia sem adicionar chat público. |
| Marca e ícones | Marca textual e ícones já importados de `lucide-react`; sem novos arquivos de imagem. | Manter, alinhando escala, cores e tratamento gráfico. |

### Imagens genéricas ou inconsistentes
A foto é temática pelo texto alternativo, não uma captura do produto. Seus pixels não foram inspecionados nesta etapa; portanto, não há confirmação visual de que seja genérica ou inconsistente. Nenhuma alternativa confiável foi identificada no inventário limitado consultado. A proposta é mantê-la e verificar seu enquadramento no navegador após aprovação, sem presumir sua origem.

Pelo CSS, a foto recebe opacidade de 0,28 e duas camadas de sombra, enquanto a prévia usa superfície opaca. Isso será avaliado como possível competição visual, não como defeito já comprovado.

## Mudanças propostas
1. **Foto e primeira dobra:** manter a composição atual e a foto; ajustar somente enquadramento e intensidade das sombras se a inspeção mostrar perda de leitura ou excesso de ruído. Preservar título, descrição e prioridade do botão principal.
2. **Prévia honesta:** manter “Prévia ilustrativa” legível em todas as larguras. Uniformizar espaços internos, divisórias, tamanhos dos ícones e hierarquia dos textos. Não acrescentar métricas, gráficos de evolução fictícios, abas ou controles que pareçam funcionais.
3. **Linguagem gráfica:** verde para ações reais, roxo como acento secundário e superfícies escuras consistentes. Harmonizar bordas, profundidade e iconografia entre a prévia, os cards de recursos e a ilustração de IA, sem reestruturar seções ou alterar conteúdo.
4. **Mobile e acessibilidade:** conferir quebra de textos, proporção da prévia e acesso aos CTAs em 390 e 320 px; preservar foco visível, navegação por teclado, contraste e suporte a movimento reduzido.
5. **Preservação:** manter exatamente `onAuth`, destinos de scroll, menu mobile, textos factuais, avisos profissionais e informações de planos. Preservar as microinterações existentes, sem novos loops.

## Arquivos exatos autorizados para a implementação
- `src/components/PublicLanding.css`: ajustes visuais locais, usando os tokens da landing.
- `src/components/PublicLanding.tsx`: apenas se necessário para ajustar agrupamento gráfico ou apresentação do rótulo ilustrativo; sem mudanças de comportamento ou conteúdo factual.

Nenhum outro arquivo será alterado. `src/assets/vibra-landing.jpg` permanecerá intacto. Sem dependências, sincronização com GitHub, troca de branch, merge, alterações em rotas/auth/dashboard/planos/pagamentos/backend ou publicação/deploy. A regra `.vibra-auth-back`, presente no CSS, também ficará intocada.

## Testes previstos após aprovação
- Conferir HEAD, status e diff antes e depois; comprovar que somente os dois arquivos autorizados mudaram e preservar qualquer alteração que surja antes da execução.
- Executar lint direcionado, caso a ferramenta já esteja disponível, sem instalar nada. Conferir o resultado da compilação automática do preview; não executar build/typecheck manualmente.
- Usar navegador de teste em desktop 1280 px e mobile 390/320 px: inspecionar imagens e textos, ausência de overflow, menu, scroll e CTAs de login/cadastro.
- Verificar teclado/foco, emulação de `prefers-reduced-motion` e preservação do conteúdo visível antes das animações.
- Registrar capturas da própria prévia para inspeção visual, sem apresentá-las como capturas reais do produto fornecidas pelo usuário.
- Relatar separadamente verificações automáticas, inspeção visual efetivamente realizada e limitações. Não testar nem alterar o dashboard autenticado ou pagamentos.