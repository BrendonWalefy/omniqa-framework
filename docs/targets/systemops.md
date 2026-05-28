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
| `SYSTEMOPS_E2E_SECRET` | Sim para agenda E2E | Secret enviada no header `x-e2e-secret` |
| `SYSTEMOPS_E2E_RUN_PREFIX` | Não | Prefixo dos `runId` gerados (padrão: local) |
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

# Agenda E2E destrutiva contra clínica/agenda QA
SYSTEMOPS_RUN_DESTRUCTIVE=true npm run test:systemops:scheduling

# Experiência de conversa E2E contra clínica/agenda QA
SYSTEMOPS_RUN_DESTRUCTIVE=true npm run test:systemops:conversation

# Performance smoke de agendamento (read-only /login)
npm run test:systemops:performance:scheduling
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

### Agenda E2E

Estes testes exigem que o `systemops-core` esteja rodando com:

```env
E2E_MODE=true
E2E_SECRET=<mesmo valor de SYSTEMOPS_E2E_SECRET>
E2E_CLINIC_ID=<uuid da clínica QA>
E2E_GOOGLE_CALENDAR_ID=<agenda QA, nunca agenda do cliente>
DISABLE_REAL_WHATSAPP_SEND=true
DISABLE_REAL_OPENAI=true
```

| ID | Cenário |
|---|---|
| SYS-AGENDA-001 | Agenda vazia oferta slots dentro do expediente |
| SYS-AGENDA-002 | Bloqueio 12h-13h remove almoço das ofertas |
| SYS-AGENDA-003 | Consulta 09h-10h remove conflito e buffer |
| SYS-AGENDA-004 | Pedido de manhã retorna apenas manhã |
| SYS-AGENDA-005 | Pedido de tarde retorna apenas tarde |
| SYS-AGENDA-006 | Pedido de noite não oferta fora do expediente |
| SYS-AGENDA-007 | Pedido de sexta respeita timezone local |
| SYS-AGENDA-008 | Procedimento longo não é ofertado quando não cabe |
| SYS-AGENDA-009 | Confirmação cria exatamente um evento |
| SYS-AGENDA-010 | Confirmações concorrentes criam só um evento |
| SYS-AGENDA-011 | Evento manual após oferta bloqueia confirmação |
| SYS-AGENDA-012 | Cancelamento libera slot |
| SYS-AGENDA-013 | Remarcação cancela antigo e cria novo |
| SYS-AGENDA-014 | Cleanup deixa agenda QA sem eventos do runId |
| SYS-AGENDA-015 | Pedido genérico pergunta procedimento antes de ofertar slot |
| SYS-AGENDA-016 | 20 Lentes reserva slots de 240 minutos |
| SYS-AGENDA-017 | Opção inexistente não confirma fallback silencioso |
| SYS-AGENDA-018 | Pergunta de preço não cria oferta nem evento |
| SYS-AGENDA-019 | Urgência clínica aciona atenção humana sem agendar |
| SYS-AGENDA-020 | Sábado da Ximendes termina às 13h |
| SYS-AGENDA-021 | Remarcação genérica pede procedimento e mantém agenda antiga |
| SYS-AGENDA-022 | Remarcação de 20 Lentes mantém duração de 240 minutos |

### Experiência De Conversa E2E

| ID | Cenário |
|---|---|
| SYS-CONV-001 | Saudação responde de forma acolhedora sem abrir agenda |
| SYS-CONV-002 | Fora de escopo mantém limite da clínica |
| SYS-CONV-003 | Pergunta de preço não inventa valor |
| SYS-CONV-004 | Depois de preço o lead ainda consegue agendar |
| SYS-CONV-005 | "ok" após oferta não confirma horário sozinho |
| SYS-CONV-006 | "pode ser" sem oferta pendente não agenda nada |
| SYS-CONV-007 | Encerramento não tenta reabrir venda |
| SYS-CONV-008 | Operador assume e IA não responde por cima |

---

## O que NÃO deve rodar em produção

- Testes de webhook com payloads reais (`SYS-API-003` a `SYS-API-006` são seguros — não disparam IA)
- Testes de carga (k6)
- Qualquer cenário com `SYSTEMOPS_RUN_DESTRUCTIVE=true`
- Testes de reset ou seed de dados
- Qualquer agenda E2E usando calendário real do cliente

---

## Estratégia sem homologação

Sem ambiente de staging dedicado, a estratégia é:

1. **Local first**: rodar contra `http://localhost:3000` com banco de desenvolvimento
2. **Credenciais via `.env.local`**: nunca commitar credenciais reais
3. **Testes autenticados opcionais**: skip automático se envs ausentes — CI passa sem credenciais
4. **Smoke read-only**: cenários que não alteram estado são seguros contra qualquer ambiente
5. **Agenda QA**: cenários destrutivos de agendamento rodam somente contra calendário exclusivo de QA

---

## Próximos passos (não implementar nesta entrega)

- Testes de fluxo de inbox com massa previsível
- Smoke contra preview da Vercel
- Performance em preview/staging
- Integração com CI do systemops-core
