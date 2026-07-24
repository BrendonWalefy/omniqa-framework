# OmniQA Framework

![CI](https://github.com/BrendonWalefy/omniqa-framework/actions/workflows/regression.yml/badge.svg)
[![GitHub Pages](https://img.shields.io/badge/site-GitHub%20Pages-blue?logo=github)](https://brendonwalefy.github.io/omniqa-framework)

> 🌐 **[brendonwalefy.github.io/omniqa-framework](https://brendonwalefy.github.io/omniqa-framework)**

Framework de automação de testes multi-plataforma com TypeScript — cobrindo Web, API, Mobile e Performance em um único monorepo modular.

Projeto desenvolvido por **Brendon Walefy** como material de portfólio e demonstração técnica em automação de testes.

---

## Sumário

- [Visao Geral](#visao-geral)
- [Arquitetura](#arquitetura)
- [Padrões Aplicados](#padrões-aplicados)
- [Stack](#stack)
- [Pre-requisitos](#pre-requisitos)
- [Instalação](#instalação)
- [Como Executar](#como-executar)
- [Relatórios](#relatórios)
- [CI/CD](#cicd)
- [Autoria e Licença](#autoria-e-licença)
- [Estrutura de Pastas](#estrutura-de-pastas)

---

## Visao Geral

O OmniQA foi construido para validar múltiplas plataformas de forma independente, mantendo uma base de código coesa e sem acoplamento entre as camadas. Cada frente de testes vive em seu próprio módulo, compartilha convencoes de linguagem e gera evidências automáticas.

**Plataformas cobertas:**

| Frente | Ferramenta | Demo | SystemOps |
|---|---|---|---|
| API | Playwright | JSONPlaceholder (contrato + payload) | Auth guards + webhook Z-API |
| Web E2E | Playwright + Chromium | SauceDemo (login, carrinho, checkout) | Login, auth guards, smoke read-only |
| Mobile Android | Appium + WebdriverIO | App Contatos nativo | — |
| Mobile iOS | Appium + WebdriverIO | App Contatos nativo | — |
| Performance | k6 | JSONPlaceholder (carga controlada) | Webhook smoke |

---

## Arquitetura

O projeto segue uma arquitetura de **monorepo modular por plataforma**. Cada camada de testes e isolada e autocontida, mas todas compartilham a mesma linguagem (TypeScript), as mesmas convencoes de nomeacao e o mesmo pipeline de CI.

```
omniqa-framework/
├── core/                        # Helpers e runners compartilhados entre targets
│   ├── evidence/                # Padronização de nomes de evidências
│   ├── helpers/                 # Utilitários de captura (webEvidence)
│   ├── reports/                 # Geradores de relatório HTML (junit + performance)
│   └── runners/                 # Orquestradores de execução e abertura de relatórios
│
├── targets/                     # Um namespace por produto testado
│   ├── demo/                    # Target de demonstração
│   │   ├── api/                 # Contrato e payload (JSONPlaceholder)
│   │   │   └── support/         # contracts.ts, apiAssertions.ts
│   │   ├── web/                 # Page Object Model (SauceDemo)
│   │   │   ├── pages/           # LoginPage, InventoryPage, CartPage, CheckoutPage
│   │   │   └── specs/           # Jornadas e validações visuais de copy
│   │   ├── mobile/              # Screen Objects por plataforma (App Contatos)
│   │   │   ├── android/         # Seletores UiAutomator2
│   │   │   └── ios/             # Seletores XCUITest
│   │   └── performance/         # k6 carga JSONPlaceholder
│   │
│   └── systemops/               # Target SystemOps (produto real)
│       ├── api/                 # Auth guard + webhook Z-API
│       │   └── specs/           # auth.spec.ts, webhook-zapi.spec.ts
│       ├── web/                 # Login, navegação, smoke read-only
│       │   ├── pages/           # LoginPage, DashboardPage, InboxPage, OwnerPage
│       │   └── specs/           # auth.spec.ts, navigation.spec.ts, read-only.spec.ts
│       ├── performance/         # k6 smoke webhook
│       └── systemops.config.ts  # Credenciais e URL via env vars
│
├── docs/                        # Estratégia, planos, rastreabilidade e notas de IA
│   ├── strategy/
│   ├── test-plans/
│   ├── traceability/
│   └── ai-notes/
├── reports/                     # Saída dos testes (ignorada pelo git)
│
├── playwright.config.ts         # Projetos Playwright (demo + systemops)
├── wdio.android.conf.ts         # Configuração WebdriverIO para Android
└── wdio.ios.conf.ts             # Configuração WebdriverIO para iOS
```

### Camadas e responsabilidades

```
┌─────────────────────────────────────────────┐
│               Testes (specs)                │  Define O QUE testar
├─────────────────────────────────────────────┤
│         Page / Screen Objects               │  Define COMO interagir com a UI
├─────────────────────────────────────────────┤
│              Support Layer                  │  Dados, seletores, evidências
├─────────────────────────────────────────────┤
│         Ferramentas (Playwright/WDIO)        │  Execução e browser control
└─────────────────────────────────────────────┘
```

---

## Padrões Aplicados

### Page Object Model (POM) — Web
Cada página da aplicação web tem uma classe dedicada em `targets/{target}/web/pages/`. Os testes não interagem diretamente com o DOM — toda navegacao e interacao passa pela classe de página correspondente.

**Por que usar:** Centraliza a definição de como interagir com cada tela. Se um seletor muda, a correcao e feita em um único lugar, sem tocar nos testes.

```
targets/demo/web/pages/
├── LoginPage.ts       # encapsula o formulário de login
├── InventoryPage.ts   # encapsula a listagem de produtos
├── CartPage.ts        # encapsula o carrinho
└── CheckoutPage.ts    # encapsula o fluxo de checkout

targets/systemops/web/pages/
├── LoginPage.ts       # autenticação (admin + owner)
├── DashboardPage.ts   # tela principal pós-login
├── InboxPage.ts       # caixa de mensagens
└── OwnerPage.ts       # painel owner
```

### Screen Object — Mobile
Equivalente ao POM para mobile. Cada tela do app tem uma classe em `screens/` que encapsula a lógica de interacao com os elementos nativos.

**Diferencial:** Android e iOS seguem o mesmo desenho de automacao e a mesma intenção de fluxo, mas possuem specs, Screen Objects e seletores separados por plataforma. Essa separação deixa explícitas as diferenças reais entre UiAutomator2 e XCUITest sem esconder particularidades dos apps nativos.

### Support Layer
Cada módulo tem uma pasta `support/` com três responsabilidades distintas:

| Arquivo | Responsabilidade |
|---|---|
| `*Data.ts` | Dados de teste (nomes, emails, senhas) |
| `*Selectors.ts` | Seletores de elementos (apenas mobile) |
| `evidence.ts` | Captura de screenshots e anexos nos relatórios |

### Evidências
As evidências seguem um padrão compartilhado de nomeação em `core/evidence/evidenceName.ts`, reutilizado por Web, Android e iOS. Cada plataforma mantém apenas a responsabilidade de capturar a imagem com sua ferramenta: Playwright no Web e WebdriverIO/Appium no Mobile.

O formato gerado é:

```text
<id-do-cenario>-<nome-da-etapa>-<timestamp>.png
```

Exemplos:

```text
web-001-acessar-tela-de-login-2026-05-11-021500-123.png
mob-001-criar-contato-2026-05-11-021510-456.png
ios-001-validar-contato-visivel-2026-05-11-021520-789.png
```

Os wrappers de execução limpam as evidências antes de cada nova rodada e o relatório JUnit customizado organiza as imagens por caso de teste (`WEB-001`, `MOB-001`, `IOS-001`), evitando uma galeria única misturada.

### Contract Testing — API
Os testes de API validam não apenas o status code, mas a estrutura do payload via contratos definidos em `targets/demo/api/support/contracts.ts`. Qualquer mudanca inesperada no schema da API quebra o contrato antes de chegar ao E2E.

### Pirâmide de Testes
### Target Namespace
Cada produto testado vive em `targets/{target}/` com estrutura interna consistente: `web/pages/`, `web/specs/`, `api/specs/`, `performance/`. Scripts npm seguem o padrão `test:{target}`, `test:{target}:web`, `test:{target}:api`. `core/` agrupa apenas o que é genuinamente compartilhado entre targets.

**Por que usar:** Isola completamente as dependências de cada produto. Adicionar um novo target não polui o namespace dos demais e não exige refatoração da estrutura existente.

### Pirâmide de Testes

A distribuição dos testes segue a pirâmide classica — mais testes baratos e rápidos na base, menos E2E no topo:

```
         /\
        /E2E\         Web + Mobile (jornadas críticas)
       /──────\
      /  API   \      Contrato, schema, status code
     /──────────\
    / Performance\    Carga e throughput
   /______________\
```

---

## Stack

| Ferramenta | Versão | Finalidade |
|---|---|---|
| TypeScript | 5.x | Linguagem principal |
| Playwright | 1.52+ | Web E2E + API testing |
| Appium | 3.x | Automação mobile |
| WebdriverIO | 9.x | Runner para testes mobile |
| k6 | 1.x | Testes de performance |
| tsx | 4.x | Execução de scripts TypeScript |

---

## Pre-requisitos

### Gerais
- Node.js 20+
- npm 10+
- Git
- k6 1.x

O fluxo padrão (`npm run test`) roda API, Web e Performance. Mobile é opcional e tem setup próprio.

---

## Instalação

### macOS

Instale Git, Node.js e k6. Se você usa Homebrew:

```bash
brew install git node k6
```

Clone o repositório, instale as dependências do projeto e baixe o Chromium usado pelo Playwright:

```bash
git clone https://github.com/BrendonWalefy/omniqa-framework.git
cd omniqa-framework
npm ci
npx playwright install chromium
```

Valide as ferramentas:

```bash
git --version
node --version
npm --version
k6 version
```

### Windows

Abra o PowerShell ou Windows Terminal e instale os pré-requisitos:

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install k6
```

Feche e abra o terminal novamente para atualizar o `PATH`. Depois valide:

```powershell
git --version
node --version
npm --version
k6 version
```

Clone o repositório, instale as dependências do projeto e baixe o Chromium usado pelo Playwright:

```powershell
git clone https://github.com/BrendonWalefy/omniqa-framework.git
cd omniqa-framework
npm ci
npx playwright install chromium
```

### Mobile opcional

Mobile não faz parte do fluxo padrão porque depende de dispositivo, emulador ou simulador local.

Android:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

- Android Studio com emulador configurado, ou dispositivo físico com USB debugging ativado
- Emulador/dispositivo rodando antes de executar os testes

iOS:
- Disponível apenas em macOS
- Xcode instalado
- Simulador iOS configurado

---

## Como Executar

Os comandos de execução são os mesmos no macOS e no Windows.

### Fluxo padrão

Roda API, Web e Performance, gera os HTMLs em `reports/` e abre os relatórios automaticamente no navegador:

```bash
npm run test
```

Esse comando é equivalente a:

```bash
npm run test:regression:skip-mobile
```

### Regressão completa (sem iOS)
```bash
npm run test:regression:skip-ios
```

### Regressão completa (todas as plataformas)
```bash
npm run test:regression
```

### Por plataforma

```bash
# Playwright direto (API + Web, sem performance e sem abertura dos relatórios customizados)
npm run test:playwright

# API
npm run test:api

# Web
npm run test:web

# Web ignorando validações visuais/de copy do inventário
BYPASS_SAUCE_COPY_BUGS=true npm run test:web

# Mobile Android (requer emulador rodando)
npm run test:mobile:android

# Mobile iOS (requer simulador configurado)
npm run test:mobile:ios

# Performance
npm run test:performance

# SystemOps — Smoke completo (API + Web)
npm run test:systemops

# SystemOps — Apenas Web
npm run test:systemops:web

# SystemOps — Apenas API
npm run test:systemops:api

# SystemOps — Performance (k6 smoke webhook, executado localmente)
npm run test:systemops:performance

# SystemOps — Agenda E2E destrutiva (requer SYSTEMOPS_RUN_DESTRUCTIVE=true e E2E_SECRET configurado)
SYSTEMOPS_RUN_DESTRUCTIVE=true npm run test:systemops:scheduling

# SystemOps — Experiência de conversa E2E
SYSTEMOPS_RUN_DESTRUCTIVE=true npm run test:systemops:conversation

# SystemOps — Replay aprovado (somente local/QA; arquivo absoluto fora de Git)
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
SYSTEMOPS_REPLAY_DATASET_PATH=/caminho/dataset.approved.json \
SYSTEMOPS_REPLAY_APPROVAL_PUBLIC_KEY_PATH=/caminho/replay-approval-public.pem \
npm run test:systemops:replay

# SystemOps — Performance smoke de agendamento
npm run test:systemops:performance:scheduling
```

---

## Relatórios

Todos os relatórios sao gerados em `reports/` (ignorado pelo git).

```bash
# Gera relatório JUnit (HTML) a partir dos XMLs
npm run report:junit

# Gera relatório de performance (HTML) a partir do JSON do k6
npm run report:performance

# Gera todos os relatórios de uma vez
npm run report:all

# Abre os relatórios JUnit e Performance no navegador
npm run report:open

# Abre o relatório interativo do Playwright
npm run report
```

Os relatórios JUnit e de performance sao abertos automaticamente no navegador ao final de `npm run test` e dos scripts `test:regression:*`. A abertura usa um script cross-platform com `open` no macOS, `start` no Windows e `xdg-open` no Linux.

---

## CI/CD

O pipeline roda automaticamente em todo push e pull request para `main`.

**Job único — API / Web / Performance (ubuntu-latest, gratuito):**

```
Checkout → Node setup → Playwright install → k6 install
    → test:api → test:web → test:performance
    → report:all → upload artefatos → publicar resultado no GitHub
```

Na esteira oficial, `BYPASS_SAUCE_COPY_BUGS=true` fica habilitado para manter o pipeline verde sem remover os cenários `WEB-006` e `WEB-007`. Para demonstrar a falha localmente, execute Web ou regressivo sem essa variável.

**Mobile:** executado localmente. Requer dispositivo ou emulador — não entra na esteira por custo e instabilidade em runners compartilhados.

Os artefatos (HTML de relatório, XML JUnit) ficam disponíveis na aba Actions por 30 dias.

---

## Autoria e Licença

Desenvolvido por **Brendon Walefy**.

Este projeto é público como material de portfólio, estudo e demonstração técnica de arquitetura de automação de testes.

Licenciado sob a licença **MIT**. O uso, cópia, modificação e distribuição são permitidos conforme os termos da licença, mantendo os devidos créditos ao autor.

Copyright (c) 2026 Brendon Walefy.

---

## Documentação

| Documento | Descricao |
|---|---|
| [Índice da documentação](./docs/README.md) | Organização geral da pasta `docs` |
| [Estratégia de QA](./docs/strategy/qa-strategy.md) | Princípios, escolhas técnicas e pirâmide |
| [Plano de execução](./docs/strategy/execution-plan.md) | Ordem e critérios de execução |
| [Resumo para entrevista](./docs/strategy/interview-summary.md) | Explicação objetiva do projeto para apresentação |
| [Plano de testes Web](./docs/test-plans/web-test-plan.md) | Cenários e cobertura Web |
| [Plano de testes API](./docs/test-plans/api-test-plan.md) | Cenários e contratos de API |
| [Plano de testes Mobile](./docs/test-plans/mobile-test-plan.md) | Cenários Android e iOS |
| [Plano de testes Performance](./docs/test-plans/performance-test-plan.md) | Cenários k6 e thresholds |
| [Matriz de rastreabilidade](./docs/traceability/traceability-matrix.md) | IDs, plataformas e status |
| [Contexto para IA](./docs/ai-notes/project-context.md) | Stack, comandos e arquitetura atual |
| [Padrões para IA](./docs/ai-notes/ai-guidelines.md) | Regras para futuras alterações assistidas |
