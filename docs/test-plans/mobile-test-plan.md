# Plano de Testes Mobile

## Aplicação

Aplicativo nativo de Contatos no Android e iOS.

## Objetivo

Validar um fluxo simples de criação e remoção de contatos em dispositivos Android e iOS, com foco em estabilidade do script, separação clara por plataforma e clareza de evidências.

## Escopo

- Criação de contato.
- Remoção de contato.
- Evidência por etapa de cada cenário.
- Screenshot automatico em falha.

## Estratégia

O fluxo foi alterado de calculadora para contatos porque algumas imagens Android não possuem aplicativo de calculadora instalado. O app de contatos oferece um fluxo funcional simples para demonstrar criação, consulta e remoção de dados em Mobile.

Os seletores usam fallback para Google Contacts, AOSP Contacts e Contatos iOS, pois a implementação nativa pode mudar conforme a imagem do emulador ou simulador.

## Cenários iniciais

| ID | Cenário | Entrada | Resultado esperado | Prioridade |
|---|---|---|---|---|
| MOB-001 | Adicionar contato | Nome, sobrenome e telefone ficticio | Contato criado e visivel | Alta |
| MOB-002 | Remover contato | Contato criado no fluxo | Contato removido da lista | Alta |
| IOS-001 | Adicionar contato iOS | Nome, sobrenome e telefone ficticio | Contato criado e visivel | Alta |
| IOS-002 | Remover contato iOS | Contato criado no fluxo | Contato removido da lista | Alta |


## Automação

Status: automatizado para Android em `tests-mobile/android/specs` e iOS em `tests-mobile/ios/specs`.

Padrões implementados:

- Appium com driver UiAutomator2 para Android e XCUITest para iOS.
- WebdriverIO como runner Mobile.
- Screen Object para contatos separado por plataforma.
- Specs, seletores, dados e evidências separados em `tests-mobile/android` e `tests-mobile/ios`.
- Pacote e activity configuraveis por variaveis de ambiente.
- Screenshots de etapa, sucesso e falha salvos em `reports/mobile/android` e `reports/mobile/ios`.
- Nomeação de evidências compartilhada via `tests-support/evidence/evidenceName.ts`, mantendo a captura de screenshot separada por plataforma.

## Pre-requisitos locais

- Java JDK configurado.
- Android SDK configurado.
- Emulador ou dispositivo Android ativo.
- Driver UiAutomator2 disponível para o Appium.
- Xcode configurado.
- Simulador iOS ativo.
- Driver XCUITest disponível para o Appium.

Comandos principais:

```bash
npm run appium:doctor:android
npm run test:mobile:android
npm run appium:doctor:ios
npm run test:mobile:ios
```

Caso o app de contatos do ambiente use outro pacote/activity, executar com variaveis de ambiente:

```bash
ANDROID_CONTACTS_PACKAGE=com.android.contacts \
ANDROID_CONTACTS_ACTIVITY=.activities.PeopleActivity \
npm run test:mobile:android
```

Caso o simulador iOS use outro device, versão ou bundle, executar com variaveis de ambiente:

```bash
IOS_DEVICE_NAME="iPhone Air" \
IOS_PLATFORM_VERSION=26.4 \
IOS_UDID=C170FBA9-8CDC-4BE5-BB96-808D4DEB2A54 \
IOS_CONTACTS_BUNDLE_ID=com.apple.MobileAddressBook \
npm run test:mobile:ios
```


## Validação local

- Typecheck TypeScript executado com sucesso via `npm run typecheck`.
- Execução Mobile Android depende de ambiente com Android SDK, `ANDROID_HOME`, adb e emulador/dispositivo ativo.
- Execução Mobile Android validada com sucesso via `npm run test:mobile:android`, cobrindo criação e remoção de contato.
- Execução Mobile iOS depende de Xcode, simulador ativo e driver XCUITest.
- Execução Mobile iOS validada com sucesso via `npm run test:mobile:ios`, cobrindo criação e remoção de contato.
