# Plano de Testes API

## APIs selecionadas

- https://jsonplaceholder.typicode.com/users
- https://jsonplaceholder.typicode.com/posts
- https://jsonplaceholder.typicode.com/comments

## Objetivo

Validar disponibilidade, contrato básico e comportamento dos endpoints selecionados.

## Escopo

- Status code.
- Estrutura minima de resposta.
- Conteudo esperado em campos obrigatorios.
- Tempo de resposta.
- Cenários positivos e negativos basicos.

## Cenários iniciais

| ID | Endpoint | Cenário | Resultado esperado | Prioridade |
|---|---|---|---|---|
| API-001 | `/users` | Listar usuários | Retorna 200 e lista não vazia | Alta |
| API-002 | `/users/1` | Buscar usuário específico | Retorna usuário com id 1 | Alta |
| API-003 | `/posts` | Listar posts | Retorna 200 e lista não vazia | Alta |
| API-004 | `/posts` | Criar post | Retorna 201 e payload coerente | Media |
| API-005 | `/comments` | Listar comentarios | Retorna 200 e lista não vazia | Media |

## Automação

Status: automatizado em `tests-api/jsonplaceholder.spec.ts`.

Validacoes implementadas:

- Status code.
- Content-Type JSON.
- Contrato básico de usuário, post e comentario.
- Lista não vazia para endpoints de consulta.
- Payload coerente na criação de post.
- Tempo de resposta máximo para listagem de usuários.
