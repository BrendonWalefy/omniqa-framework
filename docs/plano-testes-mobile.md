# Plano de Testes Mobile

## Aplicacao

Aplicativo nativo de Contatos no Android.

## Objetivo

Validar um fluxo simples de criacao e remocao de contatos em dispositivo Android, com foco em estabilidade do script, seletores reutilizaveis e clareza de evidencias.

## Escopo

- Criacao de contato.
- Remocao de contato.
- Evidencia final de sucesso por cenario.
- Screenshot automatico em falha.

## Estrategia

O fluxo foi alterado de calculadora para contatos porque algumas imagens Android nao possuem aplicativo de calculadora instalado. O app de contatos oferece um fluxo funcional simples para demonstrar criacao, consulta e remocao de dados em Mobile.

Os seletores usam fallback para Google Contacts e AOSP Contacts, pois a implementacao nativa pode mudar conforme a imagem do emulador.

## Cenarios iniciais

| ID | Cenario | Entrada | Resultado esperado | Prioridade |
|---|---|---|---|---|
| MOB-001 | Adicionar contato | Nome, sobrenome e telefone ficticio | Contato criado e visivel | Alta |
| MOB-002 | Remover contato | Contato criado no fluxo | Contato removido da lista | Alta |


## Automacao

Status: automatizado para Android em `tests-mobile/android/specs`.

Padroes implementados:

- Appium com driver UiAutomator2.
- WebdriverIO como runner Mobile.
- Screen Object para contatos.
- Seletores separados em `tests-mobile/android/support`.
- Pacote e activity configuraveis por variaveis de ambiente.
- Screenshots de sucesso e falha salvos em `reports/mobile/android`.

## Pre-requisitos locais

- Java JDK configurado.
- Android SDK configurado.
- Emulador ou dispositivo Android ativo.
- Driver UiAutomator2 disponivel para o Appium.

Comandos principais:

```bash
npm run appium:doctor:android
npm run test:mobile:android
```

Caso o app de contatos do ambiente use outro pacote/activity, executar com variaveis de ambiente:

```bash
ANDROID_CONTACTS_PACKAGE=com.android.contacts \
ANDROID_CONTACTS_ACTIVITY=.activities.PeopleActivity \
npm run test:mobile:android
```


## Validacao local

- Typecheck TypeScript executado com sucesso via `npm run typecheck`.
- Execucao Mobile Android depende de ambiente com Android SDK, `ANDROID_HOME`, adb e emulador/dispositivo ativo.
- Execucao Mobile Android validada com sucesso via `npm run test:mobile:android`, cobrindo criacao e remocao de contato.
