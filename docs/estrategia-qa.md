# Estrategia de QA

## Objetivo

Definir uma abordagem estruturada de qualidade para tres frentes de validacao: Web, API e Mobile, com automacao reaproveitavel, relatorios executivos e criterios claros de risco.

## Principios da abordagem

- Priorizar testes por risco de negocio, estabilidade da plataforma e custo de manutencao.
- Manter automacoes pequenas, legiveis e orientadas a comportamento.
- Separar responsabilidades por camada: Web, API, Mobile e Performance.
- Usar evidencias automaticas em falhas: screenshots, traces, logs e relatorios.
- Evitar duplicidade entre testes E2E e testes de API quando a regra puder ser validada em camada mais baixa.

## Estrategia por plataforma

### Web

Aplicacao alvo: https://www.saucedemo.com/inventory.html

Ferramenta sugerida: Playwright com TypeScript.

Motivos da escolha:

- Boa estabilidade para testes E2E modernos.
- Auto-wait nativo, reduzindo flakiness.
- Suporte a traces, screenshots, videos e relatorio HTML.
- Execucao paralela e suporte simples a CI.

Padrao de projeto:

- Page Object Model para paginas e componentes.
- Test data centralizado para usuarios e produtos.
- Testes organizados por jornada critica.

### API

APIs alvo iniciais:

- https://jsonplaceholder.typicode.com/users
- https://jsonplaceholder.typicode.com/posts
- https://jsonplaceholder.typicode.com/comments

Ferramenta sugerida: Playwright API com TypeScript.

Motivos da escolha:

- Mantem a mesma linguagem da automacao Web.
- Baixa curva para executar, versionar e integrar com CI.
- Permite validacao de status code, payload, schema basico e tempo de resposta.

Observacao tecnica:

As APIs do JSONPlaceholder foram priorizadas por serem mais estaveis para demonstracao. As APIs do dummy.restapiexample.com podem ser tratadas como opcao complementar, pois APIs publicas gratuitas podem sofrer indisponibilidade ou limitacao.

### Mobile

Aplicacao alvo: Contatos nativo no Android e iOS.

Ferramenta sugerida: Appium com WebdriverIO e TypeScript.

Motivos da escolha:

- Appium e uma solucao consolidada para automacao mobile cross-platform.
- WebdriverIO tem boa integracao com Appium e permite reutilizar a linguagem escolhida.
- Permite separar seletores por plataforma e reaproveitar a intencao dos testes.

Padrao de projeto:

- Screen Object para a tela de contatos por plataforma.
- Seletores separados para Android e iOS.
- Fluxo simples para demonstrar criacao e remocao no dispositivo.

### Performance

Ferramenta sugerida: k6.

Escopo inicial:

- Teste simples de carga em endpoints de leitura do JSONPlaceholder.
- Validacao de tempo de resposta, taxa de erro e throughput.
- Carga controlada e curta para evitar impacto indevido em API publica.

## Piramide de testes

| Camada | Exemplos | Objetivo |
|---|---|---|
| API/Contrato | GET users, GET posts, POST posts | Validar comportamento e estrutura de dados com baixo custo |
| Integracao | Fluxos entre endpoints relacionados | Validar consistencia entre recursos |
| E2E Web | Login, carrinho e checkout | Validar jornadas criticas do usuario |
| E2E Mobile | Criar e remover contato | Validar comportamento no dispositivo |
| Performance | Carga em endpoints publicos | Observar estabilidade sob volume controlado |

## Criterios de aceite da entrega

- Planos de teste documentados para Web, API e Mobile.
- Automacoes executaveis para pelo menos Web, API, Android e iOS.
- Relatorio consolidado com resultado manual e automatizado.
- README com instrucoes claras de execucao.
- Evidencias salvas em `reports/`.
