```md
# Agent 2 - OmniQA: target SystemOps Scheduling

## Objetivo
Criar no `omniqa-framework` uma suíte E2E para validar agendamento do SystemOps contra agenda QA, usando as rotas seguras criadas no `systemops-core`.

## Estrutura
Criar:
```txt
targets/systemops/
├── config/systemops.config.ts
├── api/specs/scheduling.spec.ts
├── api/support/e2eClient.ts
├── api/support/zapiPayloadFactory.ts
├── api/support/calendarAssertions.ts
└── performance/scheduling-smoke-load.js
Variáveis
env

SYSTEMOPS_BASE_URL=http://localhost:3000
SYSTEMOPS_E2E_SECRET=
SYSTEMOPS_E2E_RUN_PREFIX=local
SYSTEMOPS_RUN_DESTRUCTIVE=true
Segurança
Nunca rodar scheduling E2E destrutivo se SYSTEMOPS_RUN_DESTRUCTIVE !== true.
Nunca rodar contra produção.
Bloquear se SYSTEMOPS_BASE_URL contiver domínio de produção.
Gerar runId único por execução.
Rodar cleanup no beforeAll e no afterAll.
Fluxo base de cada teste
Gerar runId.
Chamar /api/e2e/reset.
Chamar /api/e2e/seed.
Preparar agenda QA com eventos necessários.
Enviar payloads para /api/whatsapp/zapi.
Consultar /api/e2e/state e /api/e2e/calendar/events.
Validar mensagens, appointments, reservations e eventos.
Cleanup final.
Cenários obrigatórios
SYS-AGENDA-001 agenda vazia oferta slots dentro do expediente.
SYS-AGENDA-002 bloqueio 12h-13h remove almoço das ofertas.
SYS-AGENDA-003 consulta 09h-10h remove conflito e buffer pós-consulta.
SYS-AGENDA-004 lead pede manhã e recebe apenas manhã.
SYS-AGENDA-005 lead pede tarde e recebe apenas tarde.
SYS-AGENDA-006 lead pede noite e sistema não oferta fora do expediente.
SYS-AGENDA-007 lead pede sexta e recebe somente sexta no timezone da clínica.
SYS-AGENDA-008 procedimento longo não é ofertado quando não cabe.
SYS-AGENDA-009 confirmar opção 1 cria exatamente um evento no Calendar.
SYS-AGENDA-010 duas confirmações concorrentes do mesmo slot criam só um evento.
SYS-AGENDA-011 operador ocupa horário após oferta, confirmação falha e sistema reoferta.
SYS-AGENDA-012 cancelamento libera o slot.
SYS-AGENDA-013 remarcação cancela antigo e cria novo sem duplicar.
SYS-AGENDA-014 cleanup deixa agenda QA sem eventos do runId.
Assertions críticas
Nenhum evento E2E pode sobrepor outro evento confirmado.
Nenhum slot ofertado pode começar antes da abertura.
Nenhum slot ofertado pode terminar depois do fechamento.
Slots devem respeitar duração do tratamento.
Slots devem respeitar buffer pós-consulta.
Mensagem do agent não pode citar horário fora da lista salva na state machine.
Após cleanup, GET /api/e2e/calendar/events?runId=... retorna lista vazia.
Scripts
Adicionar:

json

{
  "test:systemops:scheduling": "playwright test --project=systemops-api targets/systemops/api/specs/scheduling.spec.ts",
  "test:systemops:performance:scheduling": "k6 run --summary-export=reports/performance/summary.json targets/systemops/performance/scheduling-smoke-load.js"
}
Critério de aceite
Testes falham rápido se envs E2E estiverem ausentes.
Testes não rodam contra produção.
Relatórios JUnit/HTML continuam funcionando.
Evidências usam IDs SYS-AGENDA-*.
Cleanup roda mesmo em falha.