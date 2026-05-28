# SystemOps Ximendes Scheduling Exploratory Plan

## Objetivo

Usar o OmniQA como plataforma externa de regressão e exploração para a agenda da Ximendes, sem tocar em produção, sem WhatsApp real e sem OpenAI real.

## Como Executar

No `systemops-core`, subir local:

```bash
E2E_MODE=true \
E2E_SECRET=local-e2e-scheduling-secret \
E2E_CLINIC_ID=00000000-0000-4000-8000-0000000000e2 \
E2E_GOOGLE_CALENDAR_ID=006ec067dd02e14dc8b4ae54da5f90318e3ba65ff287decf672d45976ffd522f@group.calendar.google.com \
DISABLE_REAL_WHATSAPP_SEND=true \
DISABLE_REAL_OPENAI=true \
npm run dev
```

No `omniqa-framework`, rodar:

```bash
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_E2E_SECRET=local-e2e-scheduling-secret \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
npm run test:systemops:scheduling
```

## Regras Modeladas

| Regra | Origem |
|---|---|
| Segunda a sexta 8h-18h | Configuração Ximendes |
| Sábado 8h-13h | Configuração Ximendes |
| Buffer pós-consulta 60min | Configuração Ximendes |
| Avaliação 60min | Tratamento Ximendes |
| Limpeza 60min | Tratamento Ximendes |
| Manutenção das lentes 60min | Tratamento Ximendes |
| 20 Lentes 240min | Tratamento Ximendes |
| Não informar preço fechado no chat | Política comercial |
| Urgência clínica precisa de humano | Segurança do atendimento |

## Cobertura Automatizada

| ID | Cenário | Tipo | Risco coberto |
|---|---|---|---|
| SYS-AGENDA-001 | Agenda vazia oferta slots dentro do expediente | E2E | Oferta fora de regra |
| SYS-AGENDA-002 | Bloqueio 12h-13h remove almoço das ofertas | E2E | Sobrescrever bloqueio |
| SYS-AGENDA-003 | Consulta 09h-10h remove conflito e buffer | E2E | Desrespeitar intervalo |
| SYS-AGENDA-004 | Pedido de manhã retorna apenas manhã | E2E | Preferência ignorada |
| SYS-AGENDA-005 | Pedido de tarde retorna apenas tarde | E2E | Preferência ignorada |
| SYS-AGENDA-006 | Pedido de noite não oferta fora do expediente | E2E | Prometer horário inexistente |
| SYS-AGENDA-007 | Pedido de sexta respeita timezone local | E2E | Dia errado |
| SYS-AGENDA-008 | Procedimento longo não é ofertado quando não cabe | E2E | 20 Lentes encaixado errado |
| SYS-AGENDA-009 | Confirmação cria exatamente um evento | E2E | Não persistir agenda |
| SYS-AGENDA-010 | Confirmações concorrentes criam só um evento | E2E | Double booking |
| SYS-AGENDA-011 | Evento manual após oferta bloqueia confirmação | E2E | Agenda mudou depois da oferta |
| SYS-AGENDA-012 | Cancelamento libera slot | E2E | Slot preso após cancelamento |
| SYS-AGENDA-013 | Remarcação cancela antigo e cria novo | E2E | Duplicar agendamento |
| SYS-AGENDA-014 | Cleanup limpa agenda QA | E2E | Sujar ambiente de teste |
| SYS-AGENDA-015 | Pedido genérico pergunta procedimento | E2E | Duração errada por ambiguidade |
| SYS-AGENDA-016 | 20 Lentes usa 240 minutos | E2E | Duração especial ignorada |
| SYS-AGENDA-017 | Opção inexistente não confirma fallback | E2E | Agendar slot errado |
| SYS-AGENDA-018 | Pergunta de preço não cria oferta/evento | E2E | Conversão agressiva ou estado errado |
| SYS-AGENDA-019 | Urgência aciona atenção humana sem agendar | E2E | Segurança clínica |
| SYS-AGENDA-020 | Sábado termina às 13h | E2E | Oferta fora do expediente real |
| SYS-AGENDA-021 | Remarcação genérica pede procedimento e mantém agenda antiga | E2E | Cancelar antes de confirmar |
| SYS-AGENDA-022 | Remarcação de 20 Lentes mantém 240 minutos | E2E | Remarcar com duração errada |

## Exploração Manual Guiada

Transformar cada hipótese abaixo em `SYS-AGENDA-*` quando ela falhar ou quando virar bug real:

| Prioridade | Hipótese | Como explorar |
|---|---|---|
| P0 | Lead pede "sábado às 15h" | Verificar se a IA explica indisponibilidade em vez de ofertar 12h sem contexto |
| P0 | Lead pede "hoje" faltando menos de 1h para fechar | Deve pedir outro dia/período |
| P0 | Lead pede "qualquer horário" após rejeitar opções | Deve reofertar sem usar slots antigos expirados |
| P0 | Lead manda "pode ser" sem oferta pendente | Não deve agendar nada |
| P1 | Lead mistura preço e agenda | Responde preço pela política e ainda conduz com cuidado |
| P1 | Lead pede procedimento inexistente | Pergunta/esclarece, não usa duração padrão silenciosa |
| P1 | Lead confirma data diferente da oferta | Invalida oferta anterior e busca nova data |
| P1 | Lead manda áudio | Transcrição/fallback não deve quebrar agenda |
| P2 | Muitas mensagens curtas | Rate limit protege custo |
| P2 | Operador assume conversa | IA fica em silêncio enquanto pausada |

## Critério De Aceite

- Nenhum teste usa agenda real do cliente.
- Nenhum teste envia WhatsApp real.
- Nenhum teste chama OpenAI real.
- Todo evento criado tem prefixo de `runId`.
- Cleanup deixa `GET /api/e2e/calendar/events?runId=...` vazio.
- Bug novo de agenda só é considerado corrigido quando há teste reproduzindo.
