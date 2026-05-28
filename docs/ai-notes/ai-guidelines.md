# Padrões para IA ao Mexer no Framework

## Princípios

- Ler a estrutura existente antes de alterar.
- Preferir os padrões locais a novas abstrações.
- Manter o projeto didático e fácil de explicar.
- Atualizar documentação quando o comportamento do código mudar.
- Validar com `npm run typecheck` sempre que houver alteração em TypeScript.

## Estrutura de targets

O framework usa `targets/{target}/` como namespace por produto testado. Ao criar um novo target:

- Criar `targets/{target}/{target}.config.ts` na raiz do target
- Seguir estrutura: `web/pages/`, `web/specs/`, `api/specs/`, `performance/`
- Adicionar projetos Playwright em `playwright.config.ts` com nome `{target}-api`, `{target}-web-chromium`, `{target}-web-mobile`
- Adicionar scripts npm: `test:{target}`, `test:{target}:api`, `test:{target}:web`, `test:{target}:smoke`
- Scripts devem usar `node core/runners/run-with-report.mjs`

## Core compartilhado

- `core/evidence/evidenceName.ts` — nomeação padronizada de evidências, importado por todos os targets
- `core/helpers/webEvidence.ts` — `evidenceStep` e `attachSuccessEvidence`, reutilizado por specs web de qualquer target
- `core/reports/` — geradores de relatório JUnit e Performance
- `core/runners/` — `run-with-report.mjs`, `regression.mjs`, `open-reports.mjs`, `prepare-reports.mjs`
- Não duplicar lógica de slug, timestamp ou extração de ID de cenário nos helpers por plataforma

## Código de testes

- Web deve usar Playwright com Page Objects em `targets/{target}/web/pages/`
- Web deve registrar evidência por etapa usando `evidenceStep` de `core/helpers/webEvidence`
- API deve manter validação de contrato e comportamento
- Mobile usa WebdriverIO/Appium com Screen Objects em `targets/demo/mobile/{plataforma}/screens/`
- Android e iOS devem permanecer separados — seletores, specs e Screen Objects por plataforma
- Performance deve continuar simples e baseada em k6

## Relatórios e evidências

- Scripts públicos de teste devem gerar e abrir relatório automaticamente via `core/runners/run-with-report.mjs`
- Scripts `*:raw` devem ser usados apenas por orquestradores ou wrappers
- Evidências Web: anexadas ao relatório Playwright e salvas em `reports/evidence/web`
- Evidências Mobile: `reports/mobile/android` e `reports/mobile/ios`
- O relatório JUnit agrupa evidências por caso de teste quando houver imagens disponíveis

## Documentação

- `docs/strategy`: estratégia, plano de execução e decisões de abordagem
- `docs/test-plans`: planos de teste por frente
- `docs/traceability`: matriz de rastreabilidade
- `docs/targets`: documentação por target (ex: `systemops.md`)
- `docs/ai-notes`: contexto, prompts, padrões e próximos passos para sessões com IA

## Cuidados

- Não usar linguagem que prometa algo que o código ainda não entrega
- Não transformar o framework em algo complexo demais para o objetivo atual
- Não alterar fluxo mobile sem considerar dependências locais de Android SDK, Xcode, Appium e simuladores
- Não apagar mudanças do usuário sem confirmação
- Testes de targets reais (ex: systemops) devem sempre fazer skip claro quando envs necessárias não estiverem configuradas
- Nunca criar testes que disparem IA, mensagens reais de WhatsApp ou calendário real em fase inicial
