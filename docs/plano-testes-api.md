# Plano de Testes API

## APIs selecionadas

- https://jsonplaceholder.typicode.com/users
- https://jsonplaceholder.typicode.com/posts
- https://jsonplaceholder.typicode.com/comments

## Objetivo

Validar disponibilidade, contrato basico e comportamento dos endpoints selecionados.

## Escopo

- Status code.
- Estrutura minima de resposta.
- Conteudo esperado em campos obrigatorios.
- Tempo de resposta.
- Cenarios positivos e negativos basicos.

## Cenarios iniciais

| ID | Endpoint | Cenario | Resultado esperado | Prioridade |
|---|---|---|---|---|
| API-001 | `/users` | Listar usuarios | Retorna 200 e lista nao vazia | Alta |
| API-002 | `/users/1` | Buscar usuario especifico | Retorna usuario com id 1 | Alta |
| API-003 | `/posts` | Listar posts | Retorna 200 e lista nao vazia | Alta |
| API-004 | `/posts` | Criar post | Retorna 201 e payload coerente | Media |
| API-005 | `/comments` | Listar comentarios | Retorna 200 e lista nao vazia | Media |

## Automacao

Status: automatizado em `tests-api/jsonplaceholder.spec.ts`.

Validacoes implementadas:

- Status code.
- Content-Type JSON.
- Contrato basico de usuario, post e comentario.
- Lista nao vazia para endpoints de consulta.
- Payload coerente na criacao de post.
- Tempo de resposta maximo para listagem de usuarios.
