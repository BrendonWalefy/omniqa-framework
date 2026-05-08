# Plano de Testes Performance

## Aplicação

APIs públicas do JSONPlaceholder:

- `https://jsonplaceholder.typicode.com/users`
- `https://jsonplaceholder.typicode.com/posts`

## Objetivo

Validar comportamento básico de performance em endpoints de leitura, observando tempo de resposta, taxa de erro e estabilidade sob carga controlada.

## Escopo

- Carga progressiva de usuários virtuais.
- Validação de status code.
- Validação básica de payload.
- Thresholds de tempo de resposta e erro.
- Exportacao de resumo em `reports/performance/summary.json`.

## Fora de Escopo

- Teste de stress destrutivo.
- Teste de endurance longo.
- Escrita massiva em API pública.
- Validação de infraestrutura real, pois o alvo e uma API pública de demonstração.

## Cenários

| ID | Cenário | Endpoint | Carga | Resultado esperado | Prioridade |
|---|---|---|---|---|---|
| PERF-001 | Leitura de usuários | `GET /users` | Ate 10 VUs | Erro abaixo de 1%, p95 abaixo de 800ms | Baixa |
| PERF-002 | Leitura de posts | `GET /posts` | Ate 10 VUs | Erro abaixo de 1%, p95 abaixo de 800ms | Baixa |

## Thresholds

| Métrica | Critério |
|---|---|
| `http_req_failed` | Menor que 1% |
| `http_req_duration` | p95 menor que 800ms |
| `checks` | Maior que 99% |

## Estratégia de Carga

O teste usa `ramping-vus`:

- 15 segundos subindo ate 5 VUs.
- 30 segundos subindo ate 10 VUs.
- 15 segundos reduzindo para 0 VUs.

Essa carga e propositalmente pequena para evitar abuso de API pública e manter a execução viavel em ambiente local.

## Comandos

Pre-requisito:

```bash
k6 version
```

Executar performance:

```bash
npm run test:performance
```

Executar contra outro ambiente:

```bash
PERFORMANCE_BASE_URL=https://jsonplaceholder.typicode.com npm run test:performance
```

## Evidências

- Saida do terminal do k6.
- Resumo JSON em `reports/performance/summary.json`.

## Validação Local

- Script criado em `tests-performance/jsonplaceholder-load.js`.
- Execução validada localmente com k6 `v1.7.1`.
- Resultado da validação: 644 requests, 322 iteracoes, 0% de erro, 100% dos checks aprovados e p95 de 25.18ms.
- Resumo exportado em `reports/performance/summary.json`.
