# Target: SystemOps

## Objetivo

Testes automatizados externos do **systemops-core** — painel administrativo de gestão de clínicas, atendimento por IA e agenda.

O OmniQA atua como plataforma de QA independente. O systemops-core **não recebe dependências nem código do OmniQA**.

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SYSTEMOPS_BASE_URL` | **Sim** | URL base da aplicação (ex: `http://localhost:3000`) |
| `SYSTEMOPS_ADMIN_EMAIL` | Não* | E-mail do usuário admin |
| `SYSTEMOPS_ADMIN_PASSWORD` | Não* | Senha do usuário admin |
| `SYSTEMOPS_OWNER_EMAIL` | Não* | E-mail do usuário owner |
| `SYSTEMOPS_OWNER_PASSWORD` | Não* | Senha do usuário owner |
| `SYSTEMOPS_TEST_PHONE` | Não | Telefone usado em testes de webhook (padrão: 5511999999999) |
| `SYSTEMOPS_RUN_DESTRUCTIVE` | Não | `true` para habilitar testes destrutivos (padrão: false) |
| `SYSTEMOPS_RUN_PRODUCTION_SMOKE` | Não | `true` para smoke read-only contra produção (padrão: false) |
| `PERFORMANCE_BASE_URL` | Não | URL base para testes k6 (padrão: `http://localhost:3000`) |

*Testes autenticados fazem **skip automático** com mensagem clara quando as credenciais não estiverem configuradas.

---

## Comandos

```bash
# Smoke padrão (API + Web desktop)
npm run test:systemops

# Apenas API
npm run test:systemops:api

# Apenas Web desktop (Chrome)
npm run test:systemops:web

# Web mobile (viewport Pixel 5)
npm run test:systemops:mobile-web

# Smoke API + Web
npm run test:systemops:smoke

# Performance (requer k6 instalado)
npm run test:systemops:performance
```

---

## Cenários cobertos

### Web

| ID | Cenário | Autenticação |
|---|---|---|
| SYS-WEB-001 | Login admin válido → redireciona para `/app/dashboard` | Admin |
| SYS-WEB-002 | Login owner válido → redireciona para `/owner` | Owner |
| SYS-WEB-003 | Login inválido → exibe erro visual, permanece em `/login` | Nenhuma |
| SYS-WEB-004 | Auth guard: `/app/dashboard` sem sessão → redireciona para `/login` | Nenhuma |
| SYS-WEB-005 | Auth guard: `/owner` sem sessão → redireciona para `/login` | Nenhuma |
| SYS-WEB-006 | Smoke read-only: dashboard renderiza sem erro | Admin |
| SYS-WEB-007 | Smoke read-only: inbox renderiza (lista ou empty state) | Admin |

### API

| ID | Cenário | Método |
|---|---|---|
| SYS-API-001 | `GET /api/conversations/:id/messages` sem sessão → 401 | GET |
| SYS-API-002 | `GET /api/calendar/blocks` sem sessão → 401 | GET |
| SYS-API-003 | `POST /api/whatsapp/zapi` payload inválido → 400 | POST |
| SYS-API-004 | `POST /api/whatsapp/zapi` `isGroupMsg=true` → 200 | POST |
| SYS-API-005 | `POST /api/whatsapp/zapi` `isStatusReply=true` → 200 | POST |
| SYS-API-006 | `POST /api/whatsapp/zapi` `fromMe=true` sem texto → 200 | POST |

### Performance

Script k6 leve contra `/login` (rota read-only):
- Ramp up: 0 → 5 VUs em 15s
- Sustentado: 5 VUs por 30s
- Ramp down: 5 → 0 em 15s
- Thresholds: erro < 1%, p95 < 1000ms, checks > 99%

---

## O que NÃO deve rodar em produção

- Testes de webhook com payloads reais (`SYS-API-003` a `SYS-API-006` são seguros — não disparam IA)
- Testes de carga (k6)
- Qualquer cenário com `SYSTEMOPS_RUN_DESTRUCTIVE=true`
- Testes de reset ou seed de dados

---

## Estratégia sem homologação

Sem ambiente de staging dedicado, a estratégia é:

1. **Local first**: rodar contra `http://localhost:3000` com banco de desenvolvimento
2. **Credenciais via `.env.local`**: nunca commitar credenciais reais
3. **Testes autenticados opcionais**: skip automático se envs ausentes — CI passa sem credenciais
4. **Smoke read-only**: cenários que não alteram estado são seguros contra qualquer ambiente

---

## Próximos passos (não implementar nesta entrega)

- Seed/reset controlado para ambiente local (fixture de leads e conversas)
- Testes de fluxo de inbox com massa previsível
- Testes de agenda com calendário fake ou exclusivo de QA
- Smoke contra preview da Vercel
- Performance em preview/staging
- Integração com CI do systemops-core
