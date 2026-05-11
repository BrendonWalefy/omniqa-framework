# Plano de Testes Web

## Aplicação

SauceDemo: https://www.saucedemo.com/inventory.html

## Objetivo

Validar as jornadas críticas de compra, desde autenticacao ate checkout, priorizando fluxos de maior impacto para o usuário.

## Escopo

- Login.
- Listagem de produtos.
- Carrinho.
- Checkout.
- Ordenacao de produtos.

## Fora de escopo inicial

- Testes visuais pixel a pixel.
- Cross-browser completo.
- Acessibilidade automatizada profunda.

## Cenários iniciais

| ID | Cenário | Resultado esperado | Tipo | Prioridade |
|---|---|---|---|---|
| WEB-001 | Login com usuário valido | Usuário acessa inventario | E2E | Alta |
| WEB-002 | Login com senha invalida | Mensagem de erro exibida | E2E | Alta |
| WEB-003 | Adicionar produto ao carrinho | Produto aparece no carrinho | E2E | Alta |
| WEB-004 | Remover produto do carrinho | Produto deixa de aparecer no carrinho | E2E | Media |
| WEB-005 | Checkout completo | Pedido finalizado com sucesso | E2E | Alta |
| WEB-006 | Validar descrição sem erro técnico no inventário | Descrição não exibe texto técnico ao usuário | UI Visual/Copy | Media |
| WEB-007 | Validar título sem erro técnico no inventário | Título não exibe texto técnico ao usuário | UI Visual/Copy | Media |



## Automação

Status: automatizado em `tests-web/specs`.

Padrões implementados:

- Page Object Model para Login, Inventario, Carrinho e Checkout.
- Massa de dados separada em `tests-web/support`.
- Evidências por etapa salvas no relatório Playwright e em `reports/evidence/web`.
- Nomeação de evidências compartilhada via `tests-support/evidence/evidenceName.ts`.
- Execução dedicada por `npm run test:web`.

### Bugs conhecidos demonstráveis

Os cenários `WEB-006` e `WEB-007` validam problemas visuais/de copy na página de inventário do SauceDemo. Eles mapeiam textos técnicos que não deveriam aparecer para o usuário:

- `carry.allTheThings()`
- `Test.allTheThings()`

Por padrão, esses testes falham quando os textos aparecem. Para demonstrar uma execução verde sem remover os testes, habilite o bypass:

```bash
BYPASS_SAUCE_COPY_BUGS=true npm run test:web
```

No GitHub Actions, esse bypass fica habilitado por padrão para manter a esteira verde.
