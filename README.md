# OmniQA Framework

![CI](https://github.com/BrendonWalefy/omniqa-framework/actions/workflows/regression.yml/badge.svg)
[![GitHub Pages](https://img.shields.io/badge/site-GitHub%20Pages-blue?logo=github)](https://brendonwalefy.github.io/omniqa-framework)

> 🌐 **[brendonwalefy.github.io/omniqa-framework](https://brendonwalefy.github.io/omniqa-framework)**

Framework de automação de testes multi-plataforma com TypeScript — cobrindo Web, API, Mobile e Performance em um único monorepo modular.

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
- [Estrutura de Pastas](#estrutura-de-pastas)

---

## Visao Geral

O OmniQA foi construido para validar múltiplas plataformas de forma independente, mantendo uma base de código coesa e sem acoplamento entre as camadas. Cada frente de testes vive em seu próprio módulo, compartilha convencoes de linguagem e gera evidências automáticas.

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
│   ├── support/            # Helpers de assertion e definição de contratos
│   └── *.spec.ts
│
├── tests-web/              # Testes E2E de interface Web
│   ├── pages/              # Page Objects (uma classe por página)
│   ├── specs/              # Cenários organizados por jornada
│   └── support/            # Dados de teste, evidências, utilitarios
│
├── tests-mobile/
│   ├── android/            # Testes mobile para Android
│   │   ├── screens/        # Screen Objects (equivalente ao POM para mobile)
│   │   ├── specs/          # Cenários de teste
│   │   └── support/        # Seletores, dados e evidências
│   └── ios/                # Espelho para iOS com seletores proprios
│
├── tests-performance/      # Scripts de carga com k6
│
├── scripts/                # Geradores de relatório e orquestrador de regressão
│   ├── report-styles.ts    # Design system compartilhado para os relatórios
│   ├── generate-junit-report.ts
│   ├── generate-performance-report.ts
│   └── regression.sh       # Script local de regressão completa
│
├── docs/                   # Documentação de estratégia, planos e rastreabilidade
├── reports/                # Saida dos testes (ignorada pelo git)
│
├── playwright.config.ts    # Configuração de projetos Web e API
├── wdio.android.conf.ts    # Configuração WebdriverIO para Android
└── wdio.ios.conf.ts        # Configuração WebdriverIO para iOS
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
Cada página da aplicação web tem uma classe dedicada em `tests-web/pages/`. Os testes não interagem diretamente com o DOM — toda navegacao e interacao passa pela classe de página correspondente.

**Por que usar:** Centraliza a definição de como interagir com cada tela. Se um seletor muda, a correcao e feita em um único lugar, sem tocar nos testes.

```
tests-web/pages/
├── LoginPage.ts       # encapsula o formulario de login
├── InventoryPage.ts   # encapsula a listagem de produtos
├── CartPage.ts        # encapsula o carrinho
└── CheckoutPage.ts    # encapsula o fluxo de checkout
```

### Screen Object — Mobile
Equivalente ao POM para mobile. Cada tela do app tem uma classe em `screens/` que encapsula a lógica de interacao com os elementos nativos.

**Diferencial:** Os seletores ficam em `support/contactsSelectors.ts` separados da lógica de interacao, permitindo que Android e iOS reusem o mesmo fluxo com seletores diferentes.

### Support Layer
Cada módulo tem uma pasta `support/` com três responsabilidades distintas:

| Arquivo | Responsabilidade |
|---|---|
| `*Data.ts` | Dados de teste (nomes, emails, senhas) |
| `*Selectors.ts` | Seletores de elementos (apenas mobile) |
| `evidence.ts` | Captura de screenshots e anexos nos relatórios |

### Contract Testing — API
Os testes de API validam não apenas o status code, mas a estrutura do payload via contratos definidos em `tests-api/support/contracts.ts`. Qualquer mudanca inesperada no schema da API quebra o contrato antes de chegar ao E2E.

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
# macOS
brew install k6

# Windows
winget install k6

# Linux
sudo gpg -k
curl -s https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update
sudo apt install k6
```

---

## Instalação

Clone o repositório, instale as dependências do Node pelo lockfile e baixe o browser usado pelo Playwright:

```bash
git clone https://github.com/BrendonWalefy/omniqa-framework.git
cd omniqa-framework
npm ci
npx playwright install chromium
```

Para executar performance junto com a regressão padrão, confirme também que o `k6` está instalado:

```bash
k6 version
```

---

## Como Executar

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

# Mobile Android (requer emulador rodando)
npm run test:mobile:android

# Mobile iOS (requer simulador configurado)
npm run test:mobile:ios

# Performance
npm run test:performance
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

**Mobile:** executado localmente. Requer dispositivo ou emulador — não entra na esteira por custo e instabilidade em runners compartilhados.

Os artefatos (HTML de relatório, XML JUnit) ficam disponíveis na aba Actions por 30 dias.

---

## Documentação

| Documento | Descricao |
|---|---|
| [Estratégia de QA](./docs/estratégia-qa.md) | Princípios, escolhas técnicas e pirâmide |
| [Plano de testes Web](./docs/plano-testes-web.md) | Cenários e cobertura Web |
| [Plano de testes API](./docs/plano-testes-api.md) | Cenários e contratos de API |
| [Plano de testes Mobile](./docs/plano-testes-mobile.md) | Cenários Android e iOS |
| [Plano de testes Performance](./docs/plano-testes-performance.md) | Cenários k6 e thresholds |
| [Plano de execução](./docs/plano-execução.md) | Ordem e critérios de execução |
| [Matriz de rastreabilidade](./docs/matriz-rastreabilidade.md) | IDs, plataformas e status |
