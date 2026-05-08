# OmniQA Framework

Projeto base para automacao de testes multi-plataforma, com foco em reuso, clareza arquitetural e evidencias executaveis.

O objetivo e demonstrar uma abordagem moderna para testes em diferentes plataformas: Web, API, Mobile e Performance.

## Estrutura

```text
.
├── docs/
│   ├── estrategia-qa.md
│   ├── matriz-rastreabilidade.md
│   ├── plano-execucao.md
│   ├── plano-testes-api.md
│   ├── plano-testes-mobile.md
│   ├── plano-testes-web.md
│   └── roteiro-apresentacao.md
├── tests-api/
│   ├── support/
│   └── jsonplaceholder.spec.ts
├── tests-mobile/
│   └── android/
│       ├── screens/
│       ├── specs/
│       └── support/
├── tests-performance/
├── tests-web/
│   ├── pages/
│   ├── specs/
│   └── support/
└── reports/
```

## Stack proposta

| Frente | Ferramenta | Linguagem | Objetivo |
|---|---|---|---|
| Web | Playwright | TypeScript | Automatizar jornadas criticas do SauceDemo |
| API | Playwright API | TypeScript | Validar contrato, status code e payload |
| Mobile | Appium + WebdriverIO | TypeScript | Automatizar criacao e remocao no app Contatos Android e iOS |
| Performance | k6 | JavaScript | Executar carga controlada em APIs |
| Relatorio | Allure/HTML Reports | - | Consolidar evidencias |

## Ordem de implementacao

1. Documentacao e estrategia de QA.
2. Automacao de API.
3. Automacao Web.
4. Automacao Mobile Android e iOS.
5. Relatorios e evidencias.
6. Diferenciais: performance com k6 e CI.

## Materiais principais

- [Estrategia de QA](./docs/estrategia-qa.md)
- [Plano de execucao](./docs/plano-execucao.md)
- [Matriz de rastreabilidade](./docs/matriz-rastreabilidade.md)
- [Plano de testes Web](./docs/plano-testes-web.md)
- [Plano de testes API](./docs/plano-testes-api.md)
- [Plano de testes Mobile](./docs/plano-testes-mobile.md)
- [Roteiro de apresentacao](./docs/roteiro-apresentacao.md)

## Decisoes tecnicas

- Usar monorepo modular para manter tudo em um unico projeto sem misturar responsabilidades.
- Priorizar TypeScript para reduzir troca de contexto entre Web, API e Mobile.
- Comecar por API por ser a camada mais rapida e estavel para obter retorno.
- Usar Web E2E apenas para jornadas criticas.
- Tratar Mobile como automacao cross-platform, separando seletores por sistema operacional.

## Proximo passo

Consolidar relatorios e preparar os diferenciais: performance com k6 e CI.

## Comandos

Instalar dependencias:

```bash
npm install
```

Executar testes de API:

```bash
npm run test:api
```

Executar testes Web:

```bash
npm run test:web
```

Validar tipagem TypeScript:

```bash
npm run typecheck
```

Validar pre-requisitos Android/Appium:

```bash
npm run appium:doctor:android
```

Executar testes Mobile Android:

```bash
npm run test:mobile:android
```

Validar pre-requisitos iOS/Appium:

```bash
npm run appium:doctor:ios
```

Executar testes Mobile iOS:

```bash
npm run test:mobile:ios
```

Abrir relatorio HTML:

```bash
npm run report
```
