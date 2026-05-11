# Resumo

## O que é o projeto

- O OmniQA Framework é um projeto de automação de testes em TypeScript.
- Ele cobre quatro frentes principais: Web, API, Mobile e Performance.
- A ideia é demonstrar uma visão completa de QA, não apenas scripts isolados.
- O projeto foi organizado como um monorepo simples, com cada frente de teste separada em sua própria pasta.

## Objetivo

- Criar uma base de automação clara, modular e fácil de executar.
- Mostrar boas práticas de organização, evidência, relatórios e rastreabilidade.
- Simular uma estratégia real de qualidade, com testes em diferentes camadas da pirâmide.
- Manter o código didático o suficiente para ser explicado em uma entrevista ou apresentação técnica.

## Stack usada

- TypeScript como linguagem principal.
- Playwright para testes Web e API.
- WebdriverIO com Appium para testes Mobile Android e iOS.
- k6 para testes de Performance.
- Node.js para scripts de orquestração e geração de relatórios.

## Estrutura principal

- `tests-api/`: testes de API e contratos.
- `tests-web/`: testes E2E Web com Page Object Model.
- `tests-mobile/android/`: testes Mobile Android com Screen Objects.
- `tests-mobile/ios/`: testes Mobile iOS com Screen Objects.
- `tests-performance/`: scripts de carga com k6.
- `tests-support/`: helpers compartilhados, como a padronização de nomes de evidências.
- `scripts/`: automações auxiliares, regressivo e geração de relatórios.
- `docs/`: estratégia, planos de teste, rastreabilidade e notas de apoio.
- `reports/`: saída local dos testes e evidências, ignorada pelo Git.

## Testes Web

- A aplicação alvo é o SauceDemo.
- Os cenários cobrem login, carrinho e checkout.
- Foi usado Page Object Model para separar a lógica de interação das validações.
- Cada etapa relevante gera evidência no relatório do Playwright.
- Existem dois testes demonstráveis de validação visual/copy no inventário, cobrindo textos técnicos indevidos como `carry.allTheThings()` e `Test.allTheThings()`.
- Esses testes podem ser ignorados com `BYPASS_SAUCE_COPY_BUGS=true` para demonstrar uma esteira verde sem remover a cobertura.
- Isso facilita manutenção, leitura do teste e análise de falhas.

## Testes de API

- A API alvo é a JSONPlaceholder.
- Os testes validam status code, comportamento e estrutura dos contratos.
- A ideia é garantir que a resposta respeite um formato esperado, não apenas que a chamada retorne sucesso.
- Essa camada é mais rápida e ajuda a pegar problemas antes dos testes E2E.

## Testes Mobile

- Os testes Mobile usam Appium com WebdriverIO.
- Android usa UiAutomator2.
- iOS usa XCUITest.
- A aplicação alvo é o app nativo de Contatos.
- Android e iOS seguem a mesma intenção de fluxo, mas têm specs, Screen Objects e seletores separados.
- Essa separação foi mantida porque as plataformas têm diferenças reais de seletor, navegação e comportamento.
- As evidências mobile são screenshots salvos por etapa.

## Testes de Performance

- Os testes de Performance usam k6.
- A proposta é validar uma carga simples contra a API JSONPlaceholder.
- O relatório mostra métricas como requisições, taxa de erro, duração média, P95 e thresholds.
- Essa frente demonstra preocupação com comportamento sob carga, mesmo em um cenário controlado.

## Relatórios e evidências

- O projeto gera relatórios HTML para facilitar análise.
- Os testes avulsos também abrem relatório automaticamente.
- O regressivo executa as suítes em sequência e abre os relatórios ao final.
- Web usa evidências anexadas ao relatório do Playwright e salvas em `reports/evidence/web`.
- Mobile salva screenshots em `reports/mobile/android` e `reports/mobile/ios`.
- Web, Android e iOS reutilizam o mesmo helper para padronizar o nome dos arquivos de evidência.
- O relatório customizado agrupa evidências por caso de teste, em vez de exibir uma galeria solta.
- Cada plataforma mantém sua própria captura de screenshot, respeitando a ferramenta usada em cada camada.
- Performance gera relatório próprio a partir do resumo do k6.

## Comandos principais

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

## Decisões técnicas importantes

- Manter os arquivos de configuração principais na raiz para facilitar execução pelas ferramentas.
- Separar documentação por finalidade: estratégia, planos de teste, rastreabilidade e notas de IA.
- Usar scripts `*:raw` internamente para evitar que o regressivo abra relatório várias vezes.
- Não criar uma camada compartilhada entre Android e iOS antes de existir necessidade real.
- Reutilizar apenas a parte comum de evidências, como nomeação e timestamp, sem misturar APIs de captura diferentes.
- Priorizar clareza, execução local simples e documentação coerente com o código.

## Como explicar em poucas frases

Este projeto é um framework de automação em TypeScript que cobre Web, API, Mobile e Performance. Eu organizei cada frente de teste em módulos separados, usei Playwright para Web/API, Appium com WebdriverIO para Mobile e k6 para Performance. Além dos testes, implementei geração automática de relatórios, evidências por etapa e documentação de estratégia, planos e rastreabilidade. A ideia foi mostrar uma visão completa de QA, com foco em arquitetura simples, manutenção e clareza para análise de falhas.

## Pontos fortes para destacar

- Cobertura multi-plataforma em um único repositório.
- Separação clara entre testes, objetos de página/tela, dados e evidências.
- Relatórios automáticos para execuções avulsas e regressivas.
- Evidência por etapa para facilitar investigação.
- Nomeação de evidências reutilizável entre Web, Android e iOS.
- Documentação organizada e alinhada com a implementação.
- Decisões técnicas pragmáticas, sem abstrações desnecessárias.

## Possíveis próximos passos

- Ampliar cenários Web, como ordenação de produtos e logout.
- Adicionar mais contratos e cenários negativos em API.
- Melhorar a galeria de evidências do relatório com filtros por plataforma ou cenário.
- Adicionar novos thresholds de Performance.
- Avaliar reaproveitamento real de fluxos Mobile somente se a duplicação crescer.
