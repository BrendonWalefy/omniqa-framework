# Estratégia de QA

## Objetivo

Definir uma abordagem estruturada de qualidade para três frentes de validação: Web, API e Mobile, com automação reaproveitável, relatórios executivos e critérios claros de risco.

## Princípios da abordagem

- Priorizar testes por risco de negócio, estabilidade da plataforma e custo de manutenção.
- Manter automações pequenas, legíveis e orientadas a comportamento.
- Separar responsabilidades por camada: Web, API, Mobile e Performance.
- Usar evidências automáticas por etapa e em falhas: screenshots, traces, logs e relatórios.
- Reutilizar a padronização de nome das evidências entre Web, Android e iOS, mantendo a captura de imagem específica por ferramenta.
- Evitar duplicidade entre testes E2E e testes de API quando a regra puder ser validada em camada mais baixa.

## Estratégia por plataforma

### Web

Aplicação alvo: https://www.saucedemo.com/inventory.html

Ferramenta sugerida: Playwright com TypeScript.

Motivos da escolha:

- Boa estabilidade para testes E2E modernos.
- Auto-wait nativo, reduzindo flakiness.
- Suporte a traces, screenshots, videos e relatório HTML.
- Execução paralela e suporte simples a CI.

Padrão de projeto:

- Page Object Model para páginas e componentes.
- Test data centralizado para usuários e produtos.
- Testes organizados por jornada crítica.

### API

APIs alvo iniciais:

- https://jsonplaceholder.typicode.com/users
- https://jsonplaceholder.typicode.com/posts
- https://jsonplaceholder.typicode.com/comments

Ferramenta sugerida: Playwright API com TypeScript.

Motivos da escolha:

- Mantem a mesma linguagem da automação Web.
- Baixa curva para executar, versionar e integrar com CI.
- Permite validação de status code, payload, schema básico e tempo de resposta.

Observacao técnica:

As APIs do JSONPlaceholder foram priorizadas por serem mais estáveis para demonstração. As APIs do dummy.restapiexample.com podem ser tratadas como opção complementar, pois APIs públicas gratuitas podem sofrer indisponibilidade ou limitação.

### Mobile

Aplicação alvo: Contatos nativo no Android e iOS.

Ferramenta sugerida: Appium com WebdriverIO e TypeScript.

Motivos da escolha:

- Appium e uma solução consolidada para automação mobile cross-platform.
- WebdriverIO tem boa integração com Appium e permite reutilizar a linguagem escolhida.
- Permite separar seletores por plataforma e reaproveitar a intenção dos testes.

Padrão de projeto:

- Screen Object para a tela de contatos por plataforma.
- Seletores separados para Android e iOS.
- Fluxo simples para demonstrar criação e remoção no dispositivo.

### Performance

Ferramenta sugerida: k6.

Escopo inicial:

- Teste simples de carga em endpoints de leitura do JSONPlaceholder.
- Validação de tempo de resposta, taxa de erro e throughput.
- Carga controlada e curta para evitar impacto indevido em API pública.

## Pirâmide de testes

| Camada | Exemplos | Objetivo |
|---|---|---|
| API/Contrato | GET users, GET posts, POST posts | Validar comportamento e estrutura de dados com baixo custo |
| Integração | Fluxos entre endpoints relacionados | Validar consistência entre recursos |
| E2E Web | Login, carrinho e checkout | Validar jornadas críticas do usuário |
| E2E Mobile | Criar e remover contato | Validar comportamento no dispositivo |
| Performance | Carga em endpoints publicos | Observar estabilidade sob volume controlado |

## Critérios de aceite da entrega

- Planos de teste documentados para Web, API e Mobile.
- Automações executaveis para pelo menos Web, API, Android e iOS.
- Relatório consolidado com resultado manual e automatizado.
- README com instruções claras de execução.
- Evidências salvas em `reports/`.
