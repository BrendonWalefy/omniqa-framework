# SystemOps Core - Achados E2E OmniQA - 2026-05-31

## Contexto

Objetivo: validar os ajustes recentes de menu parametrizavel, agenda, dashboard, editor de playbook/objeções, nav, migracao `menu_items`, configurações, mobile/PWA e chat sandbox antes de producao.

Ambiente usado:
- Core local: `http://localhost:3000`
- App core: `/Users/brendonwalefy/Dev/Projetos/systemops-core`
- Suite OmniQA: `/Users/brendonwalefy/Dev/Projetos/omniqa-framework`
- Flags locais usadas no servidor: `E2E_MODE=true`, `DISABLE_REAL_WHATSAPP_SEND=true`, `DISABLE_REAL_OPENAI=true`
- Credenciais admin e ids de QA foram injetados via env no comando local, sem depender do `.env.local`.

## Resultado dos testes

Comandos executados:

```sh
npm run typecheck
```

Resultado: passou.

```sh
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_ADMIN_EMAIL=qa-admin@systemops.local \
SYSTEMOPS_ADMIN_PASSWORD=qa-admin-pass \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
npx playwright test --project=systemops-web-chromium \
  targets/systemops/web/specs/dashboard.spec.ts \
  targets/systemops/web/specs/navigation.spec.ts \
  targets/systemops/web/specs/ia-settings.spec.ts \
  targets/systemops/web/specs/agenda.spec.ts \
  targets/systemops/web/specs/playbook-editor.spec.ts \
  targets/systemops/web/specs/treatments.spec.ts \
  targets/systemops/web/specs/pwa.spec.ts \
  --workers=1 --reporter=list
```

Resultado: `19 passed`.

```sh
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_E2E_SECRET=local-e2e-scheduling-secret \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
npx playwright test --project=systemops-api \
  targets/systemops/api/specs/menu.spec.ts \
  targets/systemops/api/specs/playbook-sandbox.spec.ts \
  --workers=1 --reporter=list
```

Resultado: `1 failed`, `9 skipped`, `4 did not run`.
- Falhou no setup do `SYS-MENU-001`.
- `SYS-MENU-002..005` não rodaram porque o bloco e serial e o setup quebrou.
- `SYS-PLAYBOOK-001..009` ficaram skipped porque `SYSTEMOPS_RUN_LLM_SANDBOX=true` não foi ligado de proposito.

## Cobertura nova mapeada no OmniQA

- `targets/systemops/api/specs/menu.spec.ts`: menu parametrizavel via conversa WhatsApp/E2E, slots numericos, item desativado e backward compatibility com `menu_items=null`.
- `targets/systemops/api/specs/playbook-sandbox.spec.ts`: sandbox de playbook com objeções, respostas vazias, preço, agendamento, urgencia e pedido de humano.
- `targets/systemops/web/specs/ia-settings.spec.ts`: edição de menu, toggles, preview, autosave, reload, texto de boas-vindas, horario, pausa, buffer, autoatendimento e mobile 375px.
- `targets/systemops/web/specs/agenda.spec.ts`: bloqueio invalido, criar/remover bloqueio e mobile 375px sem overflow.
- `targets/systemops/web/specs/dashboard.spec.ts`: dashboard autenticado, metricas sem `NaN`/`undefined` e loading resolvendo.
- `targets/systemops/web/specs/playbook-editor.spec.ts`: seção de objeções, sandbox lateral, criação de versão com nova estrutura e limpeza do draft.
- `targets/systemops/web/specs/navigation.spec.ts`: Dashboard primeiro, Inbox segundo e links principais funcionais.
- `targets/systemops/web/specs/treatments.spec.ts`: criação/edição/remoção de procedimentos usados pela IA e mobile sem overflow.
- `targets/systemops/web/specs/pwa.spec.ts`: manifest standalone, icones, meta manifest/theme-color e service worker.

## Achados para o agent do core

### F001 - Bloqueador: rotas E2E esperadas pelo OmniQA não existem

Severidade: bloqueador para testes de conversa/menu.

Evidencia:
- `POST /api/e2e/reset` retornou `404 Not Found`.
- `PATCH /api/e2e/clinic/settings` retornou `404 Not Found`.
- `find src/app -path '*api*e2e*'` não encontrou rotas E2E no core.
- Log do servidor durante o teste:
  - `POST /api/e2e/reset 404`
  - `PATCH /api/e2e/clinic/settings 404`

Impacto:
- O OmniQA não consegue preparar, resetar nem restaurar a clinica QA.
- Os cenarios `SYS-MENU-001..005` não conseguem validar:
  - primeiro contato com saudação + texto + menu customizado;
  - saudação isolada no meio da conversa;
  - pedido explicito de menu;
  - seleção por numero;
  - item desativado caindo no fluxo normal;
  - backward compatibility com `menu_items=null`.
- Sem essas rotas, testes destrutivos ficam mais arriscados porque não existe limpeza controlada por `runId`.

Pedido sugerido ao agent do core:
- Criar rotas E2E sob `src/app/api/e2e/...`, habilitadas somente quando `E2E_MODE=true`.
- Exigir header `x-e2e-secret` igual a `E2E_SECRET`.
- Rejeitar execução em ambiente production-like.
- Escopar tudo para `E2E_CLINIC_ID`.
- Implementar no minimo:
  - `POST /api/e2e/reset` com limpeza por `runId`;
  - `GET /api/e2e/state?runId=...`;
  - `GET/PATCH /api/e2e/clinic/settings` para `greetingMessage`, `menuItems`, `businessHours`, `takeoverTtlHours`, `postAppointmentBufferMinutes`;
  - endpoint/estado suficiente para ler mensagens do agente enviadas pela conversa.

### F002 - Alto: sandbox de playbook depende de OpenAI real e não respeita mock local

Severidade: alta para validação pre-producao do playbook.

Evidencia no codigo lido:
- `src/app/api/playbook/simulate/route.ts` instancia `new IntentClassifier()` e `new ResponseComposer()`.
- `src/core/intelligence/IntentClassifier.ts` usa `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`.
- `src/core/intelligence/ResponseComposer.ts` usa `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`.
- Não há referencia encontrada a `DISABLE_REAL_OPENAI` nesses caminhos.

Impacto:
- Os testes `SYS-PLAYBOOK-001..009` não foram executados por segurança.
- Sem `OPENAI_API_KEY`, o sandbox tende a falhar.
- Com `OPENAI_API_KEY`, o sandbox/teste pode gerar custo, latencia e não determinismo.
- Isso bloqueia validar com segurança se objeções cadastradas entram no prompt e influenciam a resposta antes de publicar em produção.

Pedido sugerido ao agent do core:
- Adicionar modo deterministico para `/api/playbook/simulate` quando `DISABLE_REAL_OPENAI=true` ou `E2E_MODE=true`.
- Preferir injeção de dependencia para `IntentClassifier` e `ResponseComposer`, ou um adapter mockado no sandbox.
- Expor no retorno de debug, somente em E2E, quais blocos de playbook entraram no contexto.
- Garantir que objeções com resposta vazia não gerem linha vazia do tipo `Resposta:`.

### F003 - Medio: `.env.local` do core não tem variaveis minimas de QA local

Severidade: media, por repetibilidade de testes.

Chaves presentes no `.env.local` inspecionado:
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `VERCEL_OIDC_TOKEN`
- `DATABASE_URL`
- `CRON_SECRET`

Chaves ausentes para rodar QA local sem comando gigante:
- `PILOT_CLINIC_ID`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `E2E_MODE`
- `E2E_SECRET`
- `E2E_CLINIC_ID`
- `DISABLE_REAL_WHATSAPP_SEND`
- `DISABLE_REAL_OPENAI`
- `OPENAI_API_KEY` ou mock equivalente

Impacto:
- A tela admin depende de envs injetados manualmente para login e clinica piloto.
- A suite fica dificil de reproduzir por outro agente ou em CI local.

Pedido sugerido ao agent do core:
- Criar `.env.e2e.example` ou documentar um bloco de env local QA.
- Padronizar nomes entre core e OmniQA, ou aceitar aliases `SYSTEMOPS_*` quando fizer sentido.
- Nunca exigir credenciais reais para rodar smoke local.

### F004 - Baixo: validação de bloqueio invalido aparece como 500 no server log

Severidade: baixa.

Evidencia:
- Ao testar fim antes do inicio, a UI exibiu o erro esperado e o teste passou.
- O server action `createBlock` lançou `Error("Horario de fim deve ser apos o inicio")`, aparecendo como `POST /app/agenda 500` no log.

Impacto:
- Não quebrou a experiencia testada.
- Pode gerar ruido em logs/observabilidade e parecer incidente real.

Pedido sugerido ao agent do core:
- Considerar retornar estado de validação controlado em vez de exception 500 para erro esperado de formulario.

## Itens que passaram na UI

- Menu de opções na UI: edição de rotulo, toggle, preview, autosave e persistencia apos reload.
- Texto de boas-vindas vazio/customizado.
- Configurações de horario, pausa automatica e buffer.
- Autoatendimento liga/desliga e restaura.
- Mobile 375px em IA, Agenda e Procedimentos sem overflow horizontal.
- Agenda cria e remove bloqueio pela UI.
- Dashboard carrega e não mostra `NaN`/`undefined`.
- Nav esta em ordem: Dashboard primeiro, Inbox segundo.
- Editor de playbook mostra objeções e sandbox lateral.
- Criação de nova versão de playbook com política comercial, diferenciais, objeções, FAQ e follow-up.
- PWA publica manifest, icones, `standalone`, meta tags e service worker.
- Procedimentos podem ser criados, editados e removidos.

## Itens ainda não validados ponta a ponta

- Conversa WhatsApp real/semimock com menu parametrizavel, por falta das rotas E2E (`F001`).
- Slot bloqueado não sendo oferecido pela IA ao lead, porque a validação conversacional depende das rotas E2E e do orquestrador mockado.
- Sandbox LLM com objeções gerando resposta final, por falta de modo deterministic/mock seguro (`F002`).
- Dashboard com clinica explicitamente zerada/sem leads, por falta de seed/reset E2E confiavel (`F001`).
- Migração `0020_late_mister_sinister.sql` em produção Neon. Não rodei `npm run db:migrate` em produção por ser operação de banco real.

## Proximo comando esperado apos correção do core

Depois de corrigir `F001` e `F002`, rodar:

```sh
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_E2E_SECRET=local-e2e-scheduling-secret \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
SYSTEMOPS_RUN_LLM_SANDBOX=true \
npm run test:systemops:daily
```

Esperado:
- `SYS-MENU-001..005` passam.
- `SYS-PLAYBOOK-001..009` passam em modo mock/deterministico ou ambiente LLM explicitamente autorizado.
- Suite web continua `19 passed`.
