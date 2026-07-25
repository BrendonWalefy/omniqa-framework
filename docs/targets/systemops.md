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
| SYS-AGENDA-UI-001 | Bloqueio com fim antes do início exibe validação | Admin |
| SYS-AGENDA-UI-002 | Cria e remove bloqueio de horário pela UI | Admin + destrutivo |
| SYS-AGENDA-UI-003 | Agenda em 375px renderiza formulário/lista sem overflow horizontal | Admin |
| SYS-PLAYBOOK-UI-001 | Editor exibe seção de objeções e sandbox lateral | Admin |
| SYS-PLAYBOOK-UI-002 | Cria nova versão com estrutura completa e remove draft no fim | Admin + destrutivo |
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
| SYS-MENU-006 | Lead ambíguo no primeiro contato recebe menu parametrizado sem acionar agenda |
| SYS-MENU-007 | Lead indeciso depois do menu recebe o menu novamente em vez de resposta genérica |
| SYS-MENU-008 | Número inválido dentro do menu reoferece opções sem cair no LLM nem criar ação |
| SYS-MENU-009 | Lead digitando rótulo customizado usa o intent configurado pela clínica |
| SYS-MENU-010 | Rótulo de item desativado não aciona intent antigo nem hardcoded |
| SYS-MENU-011 | Menu de experiência em lentes navega todas as opções e mostra procedimentos em tópicos curtos |

### Sandbox De Playbook

Por padrão estes testes ficam skipped. Habilite somente em ambiente local/controlado com `SYSTEMOPS_RUN_LLM_SANDBOX=true`.

**Conflito de configuração conhecido (achado da Fase 0f do plano de melhoria contínua):**
os cenários `[LLM-only]` desta seção
chamam `/api/playbook/simulate`, que respeita `DISABLE_REAL_OPENAI` no servidor
(`src/app/api/playbook/simulate/route.ts`, sales-engine) e retorna texto mockado
(`"[MOCK] ..."`) quando essa flag está `true`. Só que `DISABLE_REAL_OPENAI=true` é
**exigido** pela seção "Agenda E2E" logo abaixo, para os asserts determinísticos de
slot não dependerem de variação de LLM. As duas suítes não podem rodar no mesmo dev
server simultaneamente — para os cenários `[LLM-only]`,
rode o `systemops-core` local **sem** `DISABLE_REAL_OPENAI` (ou contra produção, onde
essa flag não existe — ver `docs/operations/e2e-test-plan.md` no sales-engine, achado
#1: produção não tem nenhuma flag de QA configurada na Vercel).

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
| SYS-PLAYBOOK-013 | Lista de procedimentos evidencia lentes em tópicos curtos sem esconder outros serviços [LLM-only] |
| SYS-PLAYBOOK-014 | Valores de resina e porcelana vêm do playbook sem inventar preço fechado [LLM-only] |
| SYS-PLAYBOOK-015 | Interesse em lentes conduz para avaliação sem vender procedimento fechado [LLM-only] |

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
| SYS-AGENDA-008 | Procedimento de 20 Lentes já acordado não é ofertado quando não cabe |
| SYS-AGENDA-009 | Confirmação cria exatamente um evento |
| SYS-AGENDA-010 | Confirmações concorrentes criam só um evento |
| SYS-AGENDA-011 | Evento manual após oferta bloqueia confirmação |
| SYS-AGENDA-012 | Cancelamento libera slot |
| SYS-AGENDA-013 | Remarcação cancela antigo e cria novo |
| SYS-AGENDA-014 | Cleanup deixa agenda QA sem eventos do runId |
| SYS-AGENDA-015 | Pedido genérico pergunta procedimento antes de ofertar slot |
| SYS-AGENDA-016 | Avaliação para 20 Lentes reserva slots de 60 minutos |
| SYS-AGENDA-017 | Opção inexistente não confirma fallback silencioso |
| SYS-AGENDA-018 | Pergunta de preço não cria oferta nem evento |
| SYS-AGENDA-019 | Urgência clínica aciona atenção humana sem agendar |
| SYS-AGENDA-020 | Sábado da Ximendes termina às 13h |
| SYS-AGENDA-021 | Remarcação genérica pede procedimento e mantém agenda antiga |
| SYS-AGENDA-022 | Remarcação da avaliação de 20 Lentes mantém duração de 60 minutos |

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
| SYS-CONV-016 | "remarcar" no menu não aciona book_appointment por substring |
| SYS-CONV-017 | "desmarcar" no menu não aciona book_appointment por substring |
| SYS-CONV-018 | "marcar" sem prefixo no menu aciona book_appointment normalmente |
| SYS-CONV-019 | Urgência clara mid-menu escala sem oferecer slots |
| SYS-CONV-020 | Urgência com "consulta" mid-menu não aciona booking flow |
| SYS-CONV-021 | Primeiro contato evidencia especialidade em lentes sem abrir agenda |
| SYS-CONV-022 | Opção de procedimentos prioriza lentes em tópicos curtos e mantém outros serviços disponíveis |
| SYS-CONV-023 | Pergunta de valores de resina e porcelana usa preços do playbook |
| SYS-CONV-024 | Pergunta sobre outros serviços responde sem perder foco em lentes |

---

## O que NÃO deve rodar em produção

- Testes de webhook com payloads reais (`SYS-API-003` a `SYS-API-006` são seguros — não disparam IA)
- Testes de carga (k6)
- Qualquer cenário com `SYSTEMOPS_RUN_DESTRUCTIVE=true`
- Testes de reset ou seed de dados
- Qualquer agenda E2E usando calendário real do cliente
- Testes `SYS-AGENDA-UI-002`, `SYS-PLAYBOOK-UI-002` e `SYS-MENU-*` sem clínica/calendário de QA
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

## Melhoria contínua (fundação segura)

Além da regressão sintética, o target possui um adapter inicial para datasets
produzidos pelo SystemOps. A antiga leitura direta de mensagens reais pela rota
`/api/e2e/production-conversations` foi removida.

O replay `SYS-REPLAY-001` aceita somente:

- arquivo em caminho absoluto fora de qualquer repositório Git;
- contrato `replay-dataset.v2`;
- `status=approved`;
- aprovação humana assinada com Ed25519 e chave pública confiável;
- ambiente local/QA que não seja reconhecido como produção.

O runner executa cada cenário pela rota E2E dedicada do SystemOps, atravessando
webhook, `inbound_events`, `message.process`, `ConversationOrchestrator`, outbox
e `message.send`. Texto e mídia usam o payload do canal. WhatsApp, TTS, storage e
escritas de agenda são capturados; o `DecisionTrace` e os efeitos acompanham o
artefato. Cenários são repetidos três vezes por padrão.

O closed-loop usa por padrão no máximo 12 mensagens de lead por cenário
(`SYSTEMOPS_REPLAY_MAX_LEAD_TURNS_PER_SCENARIO`). Conversas maiores permanecem
no dataset, mas são reservadas para replay fatiado/histórico; isso impede que
uma única conversa longa distorça custo, duração e representatividade da
amostra. A seleção é determinística e distribuída pelo corpus elegível.
Para reproduzir diretamente um achado, defina
`SYSTEMOPS_REPLAY_SCENARIO_ID=<id-exato>`; o runner executará somente esse
cenário aprovado e recusará ids ausentes, incompatíveis ou acima do orçamento.

Defina `SYSTEMOPS_REPLAY_RESULTS_DIR` com um diretório absoluto fora de Git para
persistir, com permissão privada, três artefatos por baseline: resultado JSON,
relatório Markdown e transcrições Markdown. Sem essa variável, os mesmos
artefatos ficam disponíveis somente como anexos do relatório Playwright.
O relatório compara também o caminho de decisão entre repetições — estado
carregado, origem da classificação, intenção final, estado antes da entrega e
formato planejado. Assim, duas respostas com a mesma intenção mas que passaram
por estados diferentes são registradas como `decision_path_divergence`.

O runtime do SystemOps deve estar num banco isolado e configurar:

```bash
E2E_MODE=true
E2E_REPLAY_MODE=true
REPLAY_SANDBOX_DATABASE_HOST=<host-exato-do-branch-isolado>
REPLAY_PRODUCTION_DATABASE_HOST=<host-exato-de-producao>
```

O endpoint recusa Vercel Production, host divergente, host igual ao de produção,
fila preexistente, clínica diferente ou fingerprint de config/playbook
divergente. Para clínicas em `google_calendar`, qualquer tentativa de leitura da
agenda falha até existir uma fotografia assinada de disponibilidade; o replay
jamais consulta ou escreve no Google Calendar real.

LLM-as-judge e especialistas ainda não são gate. Não use o judge antigo com
playbook hardcoded como aprovação de qualidade.

```bash
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
SYSTEMOPS_REPLAY_DATASET_PATH=/caminho/fora/do/git/dataset.approved.json \
SYSTEMOPS_REPLAY_APPROVAL_PUBLIC_KEY_PATH=/caminho/fora/do/git/replay-approval-public.pem \
SYSTEMOPS_REPLAY_RESULTS_DIR=/caminho/fora/do/git/resultados \
SYSTEMOPS_REPLAY_REPETITIONS=3 \
npm run test:systemops:replay

npm run test:systemops:visual
```

O replay aprovado drena as filas dentro da própria rota e não depende de
`npm run dev:workers`. Os demais testes conversacionais E2E continuam dependendo
dos workers locais.

## Checklist de go-live (clínica nova)

Antes de liberar uma clínica nova, smoke read-only pode rodar contra produção.
Replay destrutivo deve rodar localmente ou em QA, nunca contra produção:

```bash
SYSTEMOPS_BASE_URL=https://app.systemops.com.br \
  SYSTEMOPS_RUN_PRODUCTION_SMOKE=true \
  npm run test:systemops:smoke

SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
SYSTEMOPS_REPLAY_DATASET_PATH=/caminho/fora/do/git/dataset.approved.json \
SYSTEMOPS_REPLAY_APPROVAL_PUBLIC_KEY_PATH=/caminho/fora/do/git/replay-approval-public.pem \
SYSTEMOPS_REPLAY_REPETITIONS=3 \
npm run test:systemops:replay
```

Qualquer falha aqui **trava o go-live daquela clínica específica**. O fingerprint
garante que a configuração e o playbook do sandbox correspondem ao dataset.

## CI recorrente

Workflow `.github/workflows/systemops-continuous-improvement.yml` roda somente
smoke read-only + visual diariamente contra produção. Replay voltará ao CI
somente quando houver dataset aprovado disponibilizado por storage restrito e
um ambiente sandbox não produtivo.

## Próximos passos (não implementar nesta entrega)

- Smoke contra preview da Vercel
- Performance em preview/staging
- Job de CI recorrente rodando de fato (workflow criado, precisa dos secrets configurados no repositório GitHub)
