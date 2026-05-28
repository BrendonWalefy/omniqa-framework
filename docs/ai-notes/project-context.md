# Contexto do Projeto para IA

## Visão geral

O OmniQA Framework é um projeto de automação de testes em TypeScript para demonstrar uma estratégia de QA cobrindo Web, API, Mobile e Performance em um único repositório.

O objetivo principal é servir como base técnica e material de portfólio: o projeto precisa ser simples de executar, fácil de explicar e coerente entre código, documentação e relatórios.

## Estrutura

```
omniqa-framework/
├── core/
│   ├── evidence/       # Nomeação padronizada de evidências (evidenceName.ts)
│   ├── helpers/        # webEvidence.ts — helper genérico de screenshot/step
│   ├── reports/        # generate-junit-report.ts, generate-performance-report.ts, report-styles.ts
│   └── runners/        # run-with-report.mjs, regression.mjs, open-reports.mjs, prepare-reports.mjs
│
├── targets/
│   ├── demo/           # JSONPlaceholder + SauceDemo + Contatos mobile
│   │   ├── web/        # pages/, specs/, support/
│   │   ├── api/        # specs/, support/
│   │   ├── mobile/     # android/ + ios/
│   │   └── performance/
│   └── systemops/      # SystemOps — painel administrativo de clínicas
│       ├── systemops.config.ts
│       ├── web/        # pages/, specs/
│       ├── api/        # specs/
│       └── performance/
│
├── playwright.config.ts
├── wdio.android.conf.ts
├── wdio.ios.conf.ts
├── tsconfig.json
└── package.json
```

## Stack principal

| Frente | Ferramentas | Local |
|---|---|---|
| API | Playwright | `targets/demo/api/` |
| Web | Playwright + Chromium | `targets/demo/web/` |
| Mobile Android | WebdriverIO + Appium + UiAutomator2 | `targets/demo/mobile/android/` |
| Mobile iOS | WebdriverIO + Appium + XCUITest | `targets/demo/mobile/ios/` |
| Performance | k6 | `targets/demo/performance/` |
| SystemOps API | Playwright | `targets/systemops/api/` |
| SystemOps Web | Playwright + Chromium/Mobile | `targets/systemops/web/` |
| Relatórios | Scripts TypeScript/Node | `core/reports/` e `core/runners/` |

## Aplicações alvo

- **target demo**: JSONPlaceholder (API), SauceDemo (Web), app nativo de Contatos (Mobile), JSONPlaceholder (Performance)
- **target systemops**: painel administrativo de clínicas (SystemOps Core) — `/login`, `/app/dashboard`, `/app/inbox`, `/owner`

## Comandos importantes

```bash
# Demo
npm run test
npm run test:regression
npm run test:api
npm run test:web
npm run test:mobile:android
npm run test:mobile:ios
npm run test:performance

# SystemOps
npm run test:systemops
npm run test:systemops:api
npm run test:systemops:web
npm run test:systemops:smoke

# Utilitários
npm run typecheck
npm run report:all
npm run report:open
```

Os comandos públicos de teste abrem relatórios automaticamente. Os scripts com sufixo `:raw` existem para uso interno do regressivo e evitam abrir relatórios várias vezes durante uma execução completa.

## Estado atual da arquitetura

- `core/` centraliza infraestrutura compartilhada entre todos os targets: nomeação de evidências, helper de screenshot/step web, geradores de relatório e runners.
- `targets/` organiza os testes por produto/sistema testado. Cada target é autônomo e usa os utilitários do `core/`.
- Padrão de estrutura por target: `web/pages/`, `web/specs/`, `api/specs/`, `performance/`, `{target}.config.ts` na raiz.
- Web usa Page Object Model — testes não interagem com o DOM diretamente.
- Mobile usa Screen Objects separados por plataforma (android/ e ios/).
- Android e iOS seguem a mesma intenção de fluxo, mas specs, Screen Objects e seletores são separados por plataforma.
- Evidências Web são anexadas ao relatório Playwright por etapa e salvas em `reports/evidence/web`.
- Evidências Mobile são screenshots por etapa salvos em `reports/mobile/android` e `reports/mobile/ios`.
- A nomeação das evidências é centralizada em `core/evidence/evidenceName.ts`.
- O helper `core/helpers/webEvidence.ts` é reutilizado por todos os targets web.
- Testes autenticados do target `systemops` fazem skip automático quando as envs não estão configuradas.
- A esteira API/Web do GitHub Actions usa `BYPASS_SAUCE_COPY_BUGS=true` para não bloquear a main por bugs demonstráveis do SauceDemo.

## Pontos de atenção

- Mobile depende de ambiente local com emulador/simulador ativo.
- k6 precisa estar instalado no sistema.
- SystemOps requer `SYSTEMOPS_BASE_URL` para rodar — sem ela, testes de auth e smoke fazem skip.
- O projeto deve permanecer didático: evitar abstrações complexas demais apenas para parecer enterprise.
- Sempre manter README, site e docs sincronizados com a realidade do código.
- Quando um novo target entrar, criar `targets/{nome}/` espelhando a estrutura do `systemops/`.
