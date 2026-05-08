# Plano de Execucao por Etapas

## Dia 1 - Fundacao do projeto

- Criar estrutura do repositorio.
- Documentar estrategia de QA.
- Definir stack tecnica.
- Criar matriz inicial de rastreabilidade.
- Definir escopo dos primeiros testes.

## Dia 2 - API

- Configurar projeto TypeScript.
- Instalar Playwright.
- Criar testes para `/users`, `/posts` e `/comments`.
- Validar status code, payload minimo e tempo de resposta.
- Gerar primeiro relatorio automatizado.

## Dia 3 - Web

- Criar estrutura Page Object.
- Automatizar login valido e invalido.
- Automatizar carrinho e checkout.
- Adicionar traces e screenshots em falha.
- Consolidar evidencias.

## Dia 4 - Mobile Android e iOS

- Configurar Appium e WebdriverIO.
- Mapear seletores do app Contatos Android e iOS.
- Automatizar criacao e remocao de contato nas duas plataformas.
- Validar persistencia e limpeza de estado entre cenarios.

## Dia 5 - Relatorios e refinamento

- Consolidar resultado manual e automatizado.
- Revisar README.
- Adicionar Allure ou relatorio equivalente.
- Preparar roteiro de apresentacao.

## Dia 6 - Diferenciais

- Adicionar teste de performance com k6.
- Exportar resumo de performance em `reports/performance`.
- Adicionar workflow de CI para Web e API.
- Preparar demonstracao ao vivo.
