# Plano de Testes Mobile

## Aplicacao

Calculadora nativa em Android e iOS.

## Objetivo

Validar operacoes matematicas basicas em dispositivos moveis, com foco em estabilidade do script, seletores reutilizaveis e clareza de evidencias.

## Escopo

- Soma.
- Subtracao.
- Multiplicacao.
- Divisao.
- Limpeza do resultado entre cenarios.

## Estrategia

Os mesmos cenarios devem ser reaproveitados entre Android e iOS sempre que possivel. Os seletores devem ficar separados por plataforma, pois a implementacao nativa de cada calculadora pode mudar.

## Cenarios iniciais

| ID | Cenario | Entrada | Resultado esperado | Prioridade |
|---|---|---|---|---|
| MOB-001 | Soma | 2 + 3 | 5 | Alta |
| MOB-002 | Subtracao | 9 - 4 | 5 | Alta |
| MOB-003 | Multiplicacao | 6 x 7 | 42 | Media |
| MOB-004 | Divisao | 8 / 2 | 4 | Media |


## Automacao

Status: automatizado para Android em `tests-mobile/android/specs`.

Padroes implementados:

- Appium com driver UiAutomator2.
- WebdriverIO como runner Mobile.
- Screen Object para a calculadora.
- Seletores separados em `tests-mobile/android/support`.
- Pacote e activity configuraveis por variaveis de ambiente.

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

Caso a calculadora do ambiente use outro pacote/activity, executar com variaveis de ambiente:

```bash
ANDROID_CALCULATOR_PACKAGE=com.android.calculator2 \
ANDROID_CALCULATOR_ACTIVITY=.Calculator \
npm run test:mobile:android
```


## Validacao local

- Typecheck TypeScript executado com sucesso via `npm run typecheck`.
- Execucao Mobile Android depende de ambiente com Android SDK, `ANDROID_HOME`, adb e emulador/dispositivo ativo.
- No ambiente atual, o Appium Doctor indicou 2 ajustes obrigatorios: configurar `ANDROID_HOME` e instalar/configurar Android SDK.
