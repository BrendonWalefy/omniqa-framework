# Especificação: Target SystemOps no OmniQA Framework

## Objetivo

Evoluir o `omniqa-framework` para suportar testes reutilizáveis por projeto, começando pelo target `systemops`, sem quebrar os testes demo atuais.

O OmniQA deve continuar sendo uma plataforma externa de QA, responsável por testes Web, API, regressão e performance. O `systemops-core` não deve receber dependências nem código do OmniQA nesta etapa.

## Diretrizes

- Não transformar o OmniQA em framework no-code.
- Não criar uma DSL complexa de testes.
- Reutilizar runner, relatórios, evidências, scripts e padrões existentes.
- Manter testes de negócio específicos dentro do target `systemops`.
- Preservar os testes atuais de demo, SauceDemo e JSONPlaceholder.
- Não executar testes destrutivos contra produção.
- Não adicionar Appium/mobile nesta primeira etapa.

## Estrutura desejada

Criar uma área de targets:

```txt
targets/
└── systemops/
    ├── config/
    │   └── systemops.config.ts
    ├── web/
    │   ├── pages/
    │   │   ├── LoginPage.ts
    │   │   ├── DashboardPage.ts
    │   │   ├── OwnerPage.ts
    │   │   └── InboxPage.ts
    │   └── specs/
    │       ├── auth.spec.ts
    │       ├── navigation.spec.ts
    │       └── read-only.spec.ts
    ├── api/
    │   └── specs/
    │       ├── auth.spec.ts
    │       └── webhook-zapi.spec.ts
    └── performance/
        └── webhook-smoke-load.js
Se o padrão atual do repo favorecer outra estrutura, adaptar mantendo separação clara por target.

Variáveis de ambiente
Adicionar suporte às seguintes envs:

env

SYSTEMOPS_BASE_URL=http://localhost:3000

SYSTEMOPS_ADMIN_EMAIL=
SYSTEMOPS_ADMIN_PASSWORD=

SYSTEMOPS_OWNER_EMAIL=
SYSTEMOPS_OWNER_PASSWORD=

SYSTEMOPS_TEST_PHONE=5511999999999
SYSTEMOPS_RUN_DESTRUCTIVE=false
SYSTEMOPS_RUN_PRODUCTION_SMOKE=false

PERFORMANCE_BASE_URL=http://localhost:3000
Regras:

SYSTEMOPS_BASE_URL é obrigatória para o target SystemOps.
Se credenciais não forem informadas, testes autenticados devem ser skipped com mensagem clara.
Testes destrutivos só podem rodar se SYSTEMOPS_RUN_DESTRUCTIVE=true.
Produção só pode receber smoke read-only, nunca webhook, reset, carga ou escrita.
Playwright
Atualizar playwright.config.ts para adicionar projetos sem remover os atuais:

txt

systemops-api
systemops-web-chromium
systemops-web-mobile
Configuração esperada:

baseURL vindo de SYSTEMOPS_BASE_URL.
Browser desktop Chrome.
Um projeto mobile usando viewport de iPhone/Pixel via Playwright, não Appium.
trace: retain-on-failure.
screenshot: only-on-failure.
JUnit e HTML report já existentes devem continuar funcionando.
Scripts npm
Adicionar scripts:

json

{
  "test:systemops": "npm run test:systemops:smoke",
  "test:systemops:api": "playwright test --project=systemops-api",
  "test:systemops:web": "playwright test --project=systemops-web-chromium",
  "test:systemops:mobile-web": "playwright test --project=systemops-web-mobile",
  "test:systemops:smoke": "playwright test --project=systemops-api --project=systemops-web-chromium",
  "test:systemops:performance": "k6 run --summary-export=reports/performance/summary.json targets/systemops/performance/webhook-smoke-load.js"
}
Se o repo usa wrapper run-with-report.mjs, preferir integrá-lo para manter relatórios automáticos.

Cenários Web iniciais
Criar os testes abaixo:

SYS-WEB-001 - Login admin válido
Acessar /login.
Preencher SYSTEMOPS_ADMIN_EMAIL.
Preencher SYSTEMOPS_ADMIN_PASSWORD.
Enviar.
Esperar redirecionamento para /app/dashboard.
Validar presença de título ou conteúdo principal do dashboard.
Skip se credenciais admin não existirem.

SYS-WEB-002 - Login owner válido
Acessar /login.
Preencher SYSTEMOPS_OWNER_EMAIL.
Preencher SYSTEMOPS_OWNER_PASSWORD.
Enviar.
Esperar redirecionamento para /owner.
Validar presença do Owner Panel.
Skip se credenciais owner não existirem.

SYS-WEB-003 - Login inválido
Acessar /login.
Enviar credenciais inválidas.
Validar erro visual.
Garantir que continua em /login.
SYS-WEB-004 - Auth guard /app
Sem sessão, acessar /app/dashboard.
Esperar redirecionamento para /login.
SYS-WEB-005 - Auth guard /owner
Sem sessão, acessar /owner.
Esperar redirecionamento para /login.
SYS-WEB-006 - Smoke read-only dashboard
Logar como admin.
Acessar /app/dashboard.
Validar que a página renderiza sem erro.
Não depender de números específicos de banco.
SYS-WEB-007 - Smoke read-only inbox
Logar como admin.
Acessar /app/inbox.
Validar que a página renderiza.
Aceitar tanto lista de conversas quanto empty state.
Cenários API iniciais
SYS-API-001 - API protegida sem sessão
Fazer GET em /api/conversations/fake-id/messages.
Esperar 401.
SYS-API-002 - Calendar blocks sem sessão
Fazer GET em /api/calendar/blocks.
Esperar 401.
SYS-API-003 - Z-API webhook payload inválido
POST /api/whatsapp/zapi com body inválido ou vazio.
Esperar 400.
SYS-API-004 - Z-API ignora grupo
POST /api/whatsapp/zapi com isGroupMsg=true.
Esperar 200.
Não validar efeito em banco.
SYS-API-005 - Z-API ignora status reply
POST /api/whatsapp/zapi com isStatusReply=true.
Esperar 200.
SYS-API-006 - Z-API fromMe sem texto
POST /api/whatsapp/zapi com fromMe=true e sem text.message.
Esperar 200.
Importante: não criar teste que dispare IA, WhatsApp real ou Google Calendar real nesta fase.

Performance inicial
Criar script k6 leve:

Alvo: PERFORMANCE_BASE_URL.
Endpoint inicial permitido: /login ou outra rota read-only.
Não testar webhook real nesta primeira entrega, exceto se explicitamente protegido por env e ambiente local.
Carga:
ramp up até 5 VUs;
manter curto;
duração total até 60s.
Thresholds:
erro < 1%;
p95 < 1000ms;
checks > 99%.
Evidências e relatórios
Manter padrão existente:

screenshots em falha;
HTML report Playwright;
JUnit XML;
relatório customizado se já suportado;
evidências agrupadas por IDs SYS-WEB-* e SYS-API-*.
Atualizar gerador de relatório apenas se necessário para reconhecer IDs SYS-*.

Documentação
Adicionar documentação:

txt

docs/targets/systemops.md
Conteúdo mínimo:

objetivo do target;
envs necessárias;
comandos;
cenários cobertos;
o que não deve rodar em produção;
estratégia sem homologação;
próximos passos.
Critérios de aceite
Testes demo atuais continuam rodando.
npm run typecheck passa.
npm run test:systemops:api roda contra SYSTEMOPS_BASE_URL.
npm run test:systemops:web roda quando credenciais existem.
Testes autenticados fazem skip claro quando faltam envs.
Nenhum teste inicial depende de dados específicos em produção.
Nenhum teste inicial executa ação destrutiva.
Relatórios continuam sendo gerados em reports/.
README ou docs indicam como executar o target SystemOps.
Próximos passos após esta entrega
Não implementar agora, apenas documentar como evolução:

seed/reset controlado para ambiente local;
testes de fluxo de inbox com massa previsível;
testes de agenda com calendário fake ou calendário exclusivo de QA;
smoke contra preview da Vercel;
performance em preview/staging;
futura integração com CI do systemops-core.