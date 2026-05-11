# Padrões para IA ao Mexer no Framework

## Princípios

- Ler a estrutura existente antes de alterar.
- Preferir os padrões locais a novas abstrações.
- Manter o projeto didático e fácil de explicar.
- Atualizar documentação quando o comportamento do código mudar.
- Validar com `npm run typecheck` sempre que houver alteração em TypeScript.

## Código de testes

- Web deve usar Playwright com Page Objects em `tests-web/pages`.
- Web deve registrar evidência por etapa usando `evidenceStep`.
- API deve manter validação de contrato e comportamento.
- Mobile deve usar WebdriverIO/Appium com Screen Objects por plataforma.
- Android e iOS devem permanecer separados até existir uma camada compartilhada real.
- Performance deve continuar simples e baseada em k6.

## Relatórios e evidências

- Scripts públicos de teste devem gerar e abrir relatório automaticamente.
- Scripts `*:raw` devem ser usados apenas por orquestradores ou wrappers.
- Evidências Web devem ficar anexadas ao relatório Playwright e também salvas em `reports/evidence/web`.
- Evidências Mobile devem ser salvas em `reports/mobile/android` e `reports/mobile/ios`.
- A nomeação das evidências deve usar `tests-support/evidence/evidenceName.ts`.
- Não duplicar lógica de slug, timestamp ou extração de ID de cenário nos helpers por plataforma.
- O relatório JUnit deve listar evidências de Web, Android e iOS agrupadas por caso de teste quando houver imagens disponíveis.
- Não misturar evidências antigas com execução nova quando o wrapper puder limpar os artefatos relevantes.

## Documentação

- `docs/strategy`: estratégia, plano de execução e decisões de abordagem.
- `docs/test-plans`: planos de teste por frente.
- `docs/traceability`: matriz de rastreabilidade.
- `docs/ai-notes`: contexto, prompts, padrões e próximos passos para sessões com IA.

## Cuidados

- Não usar linguagem que prometa algo que o código ainda não entrega.
- Não transformar o framework em algo complexo demais para o objetivo atual.
- Não alterar fluxo mobile sem considerar dependências locais de Android SDK, Xcode, Appium e simuladores.
- Não apagar mudanças do usuário sem confirmação.
