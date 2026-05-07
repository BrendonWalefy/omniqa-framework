# Plano de Testes Web

## Aplicacao

SauceDemo: https://www.saucedemo.com/inventory.html

## Objetivo

Validar as jornadas criticas de compra, desde autenticacao ate checkout, priorizando fluxos de maior impacto para o usuario.

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

## Cenarios iniciais

| ID | Cenario | Resultado esperado | Tipo | Prioridade |
|---|---|---|---|---|
| WEB-001 | Login com usuario valido | Usuario acessa inventario | E2E | Alta |
| WEB-002 | Login com senha invalida | Mensagem de erro exibida | E2E | Alta |
| WEB-003 | Adicionar produto ao carrinho | Produto aparece no carrinho | E2E | Alta |
| WEB-004 | Remover produto do carrinho | Produto deixa de aparecer no carrinho | E2E | Media |
| WEB-005 | Checkout completo | Pedido finalizado com sucesso | E2E | Alta |

