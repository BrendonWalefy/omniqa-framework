# Plano de Execução por Etapas

## Dia 1 - Fundacao do projeto

- Criar estrutura do repositorio.
- Documentar estratégia de QA.
- Definir stack técnica.
- Criar matriz inicial de rastreabilidade.
- Definir escopo dos primeiros testes.

## Dia 2 - API

- Configurar projeto TypeScript.
- Instalar Playwright.
- Criar testes para `/users`, `/posts` e `/comments`.
- Validar status code, payload mínimo e tempo de resposta.
- Gerar primeiro relatório automatizado.

## Dia 3 - Web

- Criar estrutura Page Object.
- Automatizar login valido e invalido.
- Automatizar carrinho e checkout.
- Adicionar traces e screenshots em falha.
- Consolidar evidências.

## Dia 4 - Mobile Android e iOS

- Configurar Appium e WebdriverIO.
- Mapear seletores do app Contatos Android e iOS.
- Automatizar criação e remoção de contato nas duas plataformas.
- Validar persistencia e limpeza de estado entre cenários.

## Dia 5 - Relatórios e refinamento

- Consolidar resultado manual e automatizado.
- Revisar README.
- Adicionar Allure ou relatório equivalente.
- Preparar roteiro de apresentação.

## Dia 6 - Diferenciais

- Adicionar teste de performance com k6.
- Exportar resumo de performance em `reports/performance`.
- Adicionar workflow de CI para Web e API.
- Preparar demonstração ao vivo.
