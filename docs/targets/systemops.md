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
| `SYSTEMOPS_RUN_LLM_SANDBOX` | Não | `true` para habilitar testes do sandbox que chamam `/api/playbook/simulate` e podem acionar LLM |
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

# Menu parametrizável via WhatsApp/E2E
SYSTEMOPS_RUN_DESTRUCTIVE=true npm run test:systemops:menu

# Sandbox de playbook/objeções (somente ambiente local controlado)
SYSTEMOPS_RUN_LLM_SANDBOX=true npm run test:systemops:playbook-sandbox

# Levantamento diário completo: menu + sandbox + UI de dashboard/nav/agenda/playbook/PWA
# Sem as flags abaixo, os blocos destrutivos/LLM fazem skip quando aplicável.
SYSTEMOPS_RUN_DESTRUCTIVE=true SYSTEMOPS_RUN_LLM_SANDBOX=true npm run test:systemops:daily

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
| SYS-NAV-001 | Menu lateral começa por Dashboard, depois Inbox; links principais abrem suas páginas | Admin |
| SYS-DASH-001 | Dashboard exibe métricas sem `NaN` ou `undefined` | Admin |
| SYS-DASH-002 | Dashboard sai do loading e entrega conteúdo principal | Admin |
| SYS-IA-001 | Menu de opções: rótulo/toggle atualizam prévia e persistem após reload | Admin + destrutivo |
| SYS-IA-002 | Menu de opções em 375px não corta layout e oculta label de intent | Admin |
| SYS-IA-003 | Texto de boas-vindas vazio/customizado atualiza prévia e persiste | Admin + destrutivo |
| SYS-IA-004 | Horário, pausa automática e buffer autosalvam e persistem | Admin + destrutivo |
| SYS-IA-005 | Toggle de autoatendimento altera status visual e pode ser restaurado | Admin + destrutivo |
| SYS-AGENDA-UI-001 | Bloqueio com fim antes do início exibe validação | Admin |
| SYS-AGENDA-UI-002 | Cria e remove bloqueio de horário pela UI | Admin + destrutivo |
| SYS-AGENDA-UI-003 | Agenda em 375px renderiza formulário/lista sem overflow horizontal | Admin |
| SYS-PLAYBOOK-UI-001 | Editor exibe seção de objeções e sandbox lateral | Admin |
| SYS-PLAYBOOK-UI-002 | Cria nova versão com estrutura completa e remove draft no fim | Admin + destrutivo |
| SYS-TREAT-001 | Cria, edita e remove procedimento usado pela IA | Admin + destrutivo |
| SYS-TREAT-002 | Procedimentos em 375px renderizam sem overflow horizontal | Admin |
| SYS-PWA-001 | Manifest PWA expõe standalone, start_url e ícones instaláveis | Nenhuma |
| SYS-PWA-002 | `/login` publica manifest/theme-color e `/sw.js` responde | Nenhuma |

### API

| ID | Cenário | Método |
|---|---|---|
| SYS-API-001 | `GET /api/conversations/:id/messages` sem sessão → 401 | GET |
| SYS-API-002 | `GET /api/calendar/blocks` sem sessão → 401 | GET |
| SYS-API-003 | `POST /api/whatsapp/zapi` payload inválido → 400 | POST |
| SYS-API-004 | `POST /api/whatsapp/zapi` `isGroupMsg=true` → 200 | POST |
| SYS-API-005 | `POST /api/whatsapp/zapi` `isStatusReply=true` → 200 | POST |
| SYS-API-006 | `POST /api/whatsapp/zapi` `fromMe=true` sem texto → 200 | POST |

### Menu Parametrizável E2E

Estes testes usam as rotas E2E seguras do SystemOps e esperam suporte a `PATCH /api/e2e/clinic/settings`.

| ID | Cenário |
|---|---|
| SYS-MENU-001 | Primeiro contato envia saudação, texto de boas-vindas customizado e menu configurado |
| SYS-MENU-002 | Saudação mid-conversa e pedido explícito reenviam o menu |
| SYS-MENU-003 | Seleção por número aciona a intenção mapeada ao slot |
| SYS-MENU-004 | Item desativado some do menu e o número cai no fluxo normal |
| SYS-MENU-005 | `menu_items` nulo mantém compatibilidade com menu padrão de cinco itens |

### Sandbox De Playbook

Por padrão estes testes ficam skipped. Habilite somente em ambiente local/controlado com `SYSTEMOPS_RUN_LLM_SANDBOX=true`.

| ID | Cenário |
|---|---|
| SYS-PLAYBOOK-001 | Objeção cadastrada influencia a resposta simulada |
| SYS-PLAYBOOK-002 | Sandbox sem objeções simula sem erro |
| SYS-PLAYBOOK-003 | Objeção com resposta vazia não vaza linha `Resposta:` |
| SYS-PLAYBOOK-004 | Saudação customizada no primeiro contato retorna sem depender do menu |
| SYS-PLAYBOOK-005 | Pergunta de preço usa política comercial sem inventar valor fechado |
| SYS-PLAYBOOK-006 | Lead querendo agendar recebe opções numeradas no sandbox |
| SYS-PLAYBOOK-007 | Confirmação de opção pendente confirma o horário simulado |
| SYS-PLAYBOOK-008 | Urgência clínica aciona tom de handoff imediato |
| SYS-PLAYBOOK-009 | Pedido para falar com humano não tenta resolver sozinho |
| SYS-PLAYBOOK-010 | Pergunta sobre clareamento usa detalhes do playbook sem inventar [LLM-only] |
| SYS-PLAYBOOK-011 | Pergunta sobre duração do implante retorna prazo do playbook [LLM-only] |
| SYS-PLAYBOOK-012 | Comparação entre lentes e clareamento distingue os dois sem confundir [LLM-only] |

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
| SYS-CONV-009 | Urgência no primeiro contato bypassa o menu e aciona equipe |
| SYS-CONV-010 | Urgência mista no primeiro contato prioriza segurança sobre agendamento |
| SYS-CONV-011 | Handoff explícito no primeiro contato não exibe menu |
| SYS-CONV-012 | Opção 1 do menu descreve procedimentos sem re-exibir o menu |
| SYS-CONV-013 | Opção 2 do menu oferece horários para agendamento |
| SYS-CONV-014 | Número "2" sem menu ativo não aciona agendamento direto |
| SYS-CONV-015 | Reagendamento interpreta pedido de mudança de horário |

---

## O que NÃO deve rodar em produção

- Testes de webhook com payloads reais (`SYS-API-003` a `SYS-API-006` são seguros — não disparam IA)
- Testes de carga (k6)
- Qualquer cenário com `SYSTEMOPS_RUN_DESTRUCTIVE=true`
- Testes de reset ou seed de dados
- Qualquer agenda E2E usando calendário real do cliente
- Testes `SYS-IA-*`, `SYS-AGENDA-UI-002`, `SYS-PLAYBOOK-UI-002`, `SYS-TREAT-001` e `SYS-MENU-*` sem clínica/calendário de QA
- Testes `SYS-PLAYBOOK-*` com LLM real sem intenção explícita (`SYSTEMOPS_RUN_LLM_SANDBOX=true`)

---

## Estratégia sem homologação

Sem ambiente de staging dedicado, a estratégia é:

1. **Local first**: rodar contra `http://localhost:3000` com banco de desenvolvimento
2. **Credenciais via `.env.local`**: nunca commitar credenciais reais
3. **Testes autenticados opcionais**: skip automático se envs ausentes — CI passa sem credenciais
4. **Smoke read-only**: cenários que não alteram estado são seguros contra qualquer ambiente
5. **Agenda QA**: cenários destrutivos de agendamento rodam somente contra calendário exclusivo de QA
6. **Sandbox de LLM opt-in**: testes do sandbox ficam desligados por padrão para evitar custo/latência acidental

---

### Inbox E2E

| ID | Cenário |
|---|---|
| SYS-INBOX-001 | Múltiplas mensagens do lead após takeover não acionam a IA |
| SYS-INBOX-002 | Dois leads simultâneos têm conversas isoladas |
| SYS-INBOX-003 | Urgência sinaliza needsAttention na conversa |

```bash
SYSTEMOPS_RUN_DESTRUCTIVE=true npm run test:systemops:inbox
```

## Próximos passos (não implementar nesta entrega)

- Smoke contra preview da Vercel
- Performance em preview/staging
- Integração com CI do systemops-core
