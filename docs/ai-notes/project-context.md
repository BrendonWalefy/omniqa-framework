# Contexto do Projeto para IA

## Visão geral

O OmniQA Framework é um projeto de automação de testes em TypeScript para demonstrar uma estratégia de QA cobrindo Web, API, Mobile e Performance em um único repositório.

O objetivo principal é servir como base técnica e material de portfólio: o projeto precisa ser simples de executar, fácil de explicar e coerente entre código, documentação e relatórios.

## Stack principal

| Frente | Ferramentas | Local |
|---|---|---|
| API | Playwright | `tests-api/` |
| Web | Playwright + Chromium | `tests-web/` |
| Mobile Android | WebdriverIO + Appium + UiAutomator2 | `tests-mobile/android/` |
| Mobile iOS | WebdriverIO + Appium + XCUITest | `tests-mobile/ios/` |
| Performance | k6 | `tests-performance/` |
| Relatórios | Scripts TypeScript/Node | `scripts/` e `reports/` |

## Aplicações alvo

- API: JSONPlaceholder.
- Web: SauceDemo.
- Mobile: aplicativo nativo de Contatos no Android e iOS.
- Performance: carga simples contra JSONPlaceholder.

## Comandos importantes

```bash
npm run test
npm run test:regression
npm run test:api
npm run test:web
npm run test:web:headed
npm run test:mobile:android
npm run test:mobile:ios
npm run test:performance
npm run typecheck
```

Os comandos públicos de teste abrem relatórios automaticamente. Os scripts com sufixo `:raw` existem para uso interno do regressivo e evitam abrir relatórios várias vezes durante uma execução completa.

## Estado atual da arquitetura

- Web usa Page Object Model.
- Web possui dois testes demonstráveis de validação visual/copy no SauceDemo, controlados por `BYPASS_SAUCE_COPY_BUGS=true`.
- A esteira API/Web do GitHub Actions usa `BYPASS_SAUCE_COPY_BUGS=true` para não bloquear a main por bugs demonstráveis do SauceDemo.
- Mobile usa Screen Objects separados por plataforma.
- Android e iOS seguem a mesma intenção de fluxo, mas não compartilham o mesmo spec ou Screen Object.
- Evidências Web são anexadas ao relatório Playwright por etapa e salvas em `reports/evidence/web` para a galeria do relatório JUnit.
- Evidências Mobile são screenshots por etapa salvos em `reports/mobile/android` e `reports/mobile/ios`.
- A nomeação das evidências é reutilizada por Web, Android e iOS em `tests-support/evidence/evidenceName.ts`.
- A captura da imagem continua separada por plataforma, porque Playwright e WebdriverIO/Appium usam APIs diferentes.
- O relatório JUnit customizado exibe evidências agrupadas por caso de teste, com thumbnails para Web, Android e iOS quando houver imagens disponíveis.
- O fluxo regressivo consolida execução e abertura de relatórios ao final.

## Pontos de atenção

- Mobile depende de ambiente local com emulador/simulador ativo.
- k6 precisa estar instalado no sistema.
- O projeto deve permanecer didático: evitar abstrações complexas demais apenas para parecer enterprise.
- Sempre manter README, site e docs sincronizados com a realidade do código.
