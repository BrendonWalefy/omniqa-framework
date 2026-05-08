# OmniQA Framework

![CI](https://github.com/BrendonWalefy/omniqa-framework/actions/workflows/regression.yml/badge.svg)
[![GitHub Pages](https://img.shields.io/badge/site-GitHub%20Pages-blue?logo=github)](https://brendonwalefy.github.io/omniqa-framework)

> 🌐 **[brendonwalefy.github.io/omniqa-framework](https://brendonwalefy.github.io/omniqa-framework)**

Framework de automacao de testes multi-plataforma com TypeScript — cobrindo Web, API, Mobile e Performance em um unico monorepo modular.

---

## Sumario

- [Visao Geral](#visao-geral)
- [Arquitetura](#arquitetura)
- [Padroes Aplicados](#padroes-aplicados)
- [Stack](#stack)
- [Pre-requisitos](#pre-requisitos)
- [Instalacao](#instalacao)
- [Como Executar](#como-executar)
- [Relatorios](#relatorios)
- [CI/CD](#cicd)
- [Estrutura de Pastas](#estrutura-de-pastas)

---

## Visao Geral

O OmniQA foi construido para validar multiplas plataformas de forma independente, mantendo uma base de codigo coesa e sem acoplamento entre as camadas. Cada frente de testes vive em seu proprio modulo, compartilha convencoes de linguagem e gera evidencias automaticas.

**Plataformas cobertas:**

| Frente | Ferramenta | Alvo |
|---|---|---|
| API | Playwright | JSONPlaceholder API |
| Web E2E | Playwright + Chromium | SauceDemo |
| Mobile Android | Appium + WebdriverIO | App Contatos nativo |
| Mobile iOS | Appium + WebdriverIO | App Contatos nativo |
| Performance | k6 | JSONPlaceholder API |

---

## Arquitetura

O projeto segue uma arquitetura de **monorepo modular por plataforma**. Cada camada de testes e isolada e autocontida, mas todas compartilham a mesma linguagem (TypeScript), as mesmas convencoes de nomeacao e o mesmo pipeline de CI.

```
omniqa-framework/
├── tests-api/              # Testes de contrato e comportamento de API
│   ├── support/            # Helpers de assertion e definicao de contratos
│   └── *.spec.ts
│
├── tests-web/              # Testes E2E de interface Web
│   ├── pages/              # Page Objects (uma classe por pagina)
│   ├── specs/              # Cenarios organizados por jornada
│   └── support/            # Dados de teste, evidencias, utilitarios
│
├── tests-mobile/
│   ├── android/            # Testes mobile para Android
│   │   ├── screens/        # Screen Objects (equivalente ao POM para mobile)
│   │   ├── specs/          # Cenarios de teste
│   │   └── support/        # Seletores, dados e evidencias
│   └── ios/                # Espelho para iOS com seletores proprios
│
├── tests-performance/      # Scripts de carga com k6
│
├── scripts/                # Geradores de relatorio e orquestrador de regressao
│   ├── report-styles.ts    # Design system compartilhado para os relatorios
│   ├── generate-junit-report.ts
│   ├── generate-performance-report.ts
│   └── regression.sh       # Script local de regressao completa
│
├── docs/                   # Documentacao de estrategia, planos e rastreabilidade
├── reports/                # Saida dos testes (ignorada pelo git)
│
├── playwright.config.ts    # Configuracao de projetos Web e API
├── wdio.android.conf.ts    # Configuracao WebdriverIO para Android
└── wdio.ios.conf.ts        # Configuracao WebdriverIO para iOS
```

### Camadas e responsabilidades

```
┌─────────────────────────────────────────────┐
│               Testes (specs)                │  Define O QUE testar
├─────────────────────────────────────────────┤
│         Page / Screen Objects               │  Define COMO interagir com a UI
├─────────────────────────────────────────────┤
│              Support Layer                  │  Dados, seletores, evidencias
├─────────────────────────────────────────────┤
│         Ferramentas (Playwright/WDIO)        │  Execucao e browser control
└─────────────────────────────────────────────┘
```

---

## Padroes Aplicados

### Page Object Model (POM) — Web
Cada pagina da aplicacao web tem uma classe dedicada em `tests-web/pages/`. Os testes nao interagem diretamente com o DOM — toda navegacao e interacao passa pela classe de pagina correspondente.

**Por que usar:** Centraliza a definicao de como interagir com cada tela. Se um seletor muda, a correcao e feita em um unico lugar, sem tocar nos testes.

```
tests-web/pages/
├── LoginPage.ts       # encapsula o formulario de login
├── InventoryPage.ts   # encapsula a listagem de produtos
├── CartPage.ts        # encapsula o carrinho
└── CheckoutPage.ts    # encapsula o fluxo de checkout
```

### Screen Object — Mobile
Equivalente ao POM para mobile. Cada tela do app tem uma classe em `screens/` que encapsula a logica de interacao com os elementos nativos.

**Diferencial:** Os seletores ficam em `support/contactsSelectors.ts` separados da logica de interacao, permitindo que Android e iOS reusem o mesmo fluxo com seletores diferentes.

### Support Layer
Cada modulo tem uma pasta `support/` com tres responsabilidades distintas:

| Arquivo | Responsabilidade |
|---|---|
| `*Data.ts` | Dados de teste (nomes, emails, senhas) |
| `*Selectors.ts` | Seletores de elementos (apenas mobile) |
| `evidence.ts` | Captura de screenshots e anexos nos relatorios |

### Contract Testing — API
Os testes de API validam nao apenas o status code, mas a estrutura do payload via contratos definidos em `tests-api/support/contracts.ts`. Qualquer mudanca inesperada no schema da API quebra o contrato antes de chegar ao E2E.

### Piramide de Testes
A distribuicao dos testes segue a piramide classica — mais testes baratos e rapidos na base, menos E2E no topo:

```
         /\
        /E2E\         Web + Mobile (jornadas criticas)
       /──────\
      /  API   \      Contrato, schema, status code
     /──────────\
    / Performance\    Carga e throughput
   /______________\
```

---

## Stack

| Ferramenta | Versao | Finalidade |
|---|---|---|
| TypeScript | 5.x | Linguagem principal |
| Playwright | 1.52+ | Web E2E + API testing |
| Appium | 3.x | Automacao mobile |
| WebdriverIO | 9.x | Runner para testes mobile |
| k6 | 1.x | Testes de performance |
| tsx | 4.x | Execucao de scripts TypeScript |

---

## Pre-requisitos

### Todos os ambientes
- Node.js 20+
- npm 10+

### Mobile Android
- Android Studio com emulador configurado, ou dispositivo fisico com USB debugging ativado
- Variavel de ambiente configurada:
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```
- Emulador rodando antes de executar os testes

### Mobile iOS
- Xcode instalado (App Store)
- Simulador iOS configurado

### Performance
- k6 instalado globalmente:
```bash
brew install k6
```

---

## Instalacao

```bash
npm install
npx playwright install chromium
```

---

## Como Executar

### Regressao completa (sem mobile)
```bash
npm run test:regression:skip-mobile
```

### Regressao completa (sem iOS)
```bash
npm run test:regression:skip-ios
```

### Regressao completa (todas as plataformas)
```bash
npm run test:regression
```

### Por plataforma

```bash
# API
npm run test:api

# Web
npm run test:web

# Mobile Android (requer emulador rodando)
npm run test:mobile:android

# Mobile iOS (requer simulador configurado)
npm run test:mobile:ios

# Performance
npm run test:performance
```

---

## Relatorios

Todos os relatorios sao gerados em `reports/` (ignorado pelo git).

```bash
# Gera relatorio JUnit (HTML) a partir dos XMLs
npm run report:junit

# Gera relatorio de performance (HTML) a partir do JSON do k6
npm run report:performance

# Gera todos os relatorios de uma vez
npm run report:all

# Abre o relatorio interativo do Playwright
npm run report
```

Os relatorios JUnit e de performance sao abertos automaticamente no navegador ao final de `npm run test:regression`.

---

## CI/CD

O pipeline roda automaticamente em todo push e pull request para `main`.

**Job unico — API / Web / Performance (ubuntu-latest, gratuito):**

```
Checkout → Node setup → Playwright install → k6 install
    → test:api → test:web → test:performance
    → report:all → upload artefatos → publicar resultado no GitHub
```

**Mobile:** executado localmente. Requer dispositivo ou emulador — nao entra na esteira por custo e instabilidade em runners compartilhados.

Os artefatos (HTML de relatorio, XML JUnit) ficam disponiveis na aba Actions por 30 dias.

---

## Documentacao

| Documento | Descricao |
|---|---|
| [Estrategia de QA](./docs/estrategia-qa.md) | Principios, escolhas tecnicas e piramide |
| [Plano de testes Web](./docs/plano-testes-web.md) | Cenarios e cobertura Web |
| [Plano de testes API](./docs/plano-testes-api.md) | Cenarios e contratos de API |
| [Plano de testes Mobile](./docs/plano-testes-mobile.md) | Cenarios Android e iOS |
| [Plano de testes Performance](./docs/plano-testes-performance.md) | Cenarios k6 e thresholds |
| [Plano de execucao](./docs/plano-execucao.md) | Ordem e criterios de execucao |
| [Matriz de rastreabilidade](./docs/matriz-rastreabilidade.md) | IDs, plataformas e status |
