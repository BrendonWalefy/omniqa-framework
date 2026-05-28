# Prompt Operacional: Rodar Target SystemOps Scheduling

Use este prompt em um agent para configurar e rodar o máximo possível da suíte `test:systemops:scheduling`.

```txt
Você está trabalhando com:

- App alvo: /Users/brendonwalefy/Dev/Projetos/systemops-core
- Plataforma de testes: /Users/brendonwalefy/Dev/Projetos/omniqa-framework

Objetivo:
Rodar o target SystemOps Scheduling do OmniQA contra o SystemOps local, usando agenda QA isolada.

Regras:
- Não rode contra produção.
- Não use a agenda real do cliente.
- Não imprima secrets.
- Não edite `.env.local` sem confirmar comigo.
- Se faltar `E2E_GOOGLE_CALENDAR_ID`, pare e peça o ID de uma agenda QA exclusiva.
- Confirme que a agenda QA está compartilhada com o service account configurado em `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

Checklist no systemops-core:

```bash
cd /Users/brendonwalefy/Dev/Projetos/systemops-core
git status --short --branch
npm run verify
npm run verify:agenda
```

Checar envs sem imprimir valores:

```bash
node -e "const fs=require('fs');const path='.env.local';const keys=['DATABASE_URL','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','E2E_MODE','E2E_SECRET','E2E_CLINIC_ID','E2E_GOOGLE_CALENDAR_ID','DISABLE_REAL_WHATSAPP_SEND','DISABLE_REAL_OPENAI'];const text=fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';for(const k of keys){const m=text.match(new RegExp('^'+k+'=(.*)$','m'));const raw=m?m[1].trim():'';const value=raw.replace(/^['\\\"]|['\\\"]$/g,'');console.log(k+': '+(m?(value?'present':'empty'):'missing'));}"
```

Env mínimo para rodar:

```env
E2E_MODE=true
E2E_SECRET=<secret local>
E2E_CLINIC_ID=<uuid local>
E2E_GOOGLE_CALENDAR_ID=<agenda QA exclusiva>
DISABLE_REAL_WHATSAPP_SEND=true
DISABLE_REAL_OPENAI=true
```

Subir app:

```bash
cd /Users/brendonwalefy/Dev/Projetos/systemops-core
npm run dev
```

Checklist no OmniQA:

```bash
cd /Users/brendonwalefy/Dev/Projetos/omniqa-framework
git status --short --branch
npm run typecheck
npx playwright test --project=systemops-api targets/systemops/api/specs/scheduling.spec.ts --list
```

Rodar E2E:

```bash
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_E2E_SECRET=<mesmo valor de E2E_SECRET> \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
npm run test:systemops:scheduling
```

Se falhar:
- identifique o cenário `SYS-AGENDA-*`;
- diga se foi erro de env, app, DB, Google Calendar ou assertion;
- confirme se cleanup rodou;
- não use produção como fallback.

Ao final, reporte:
- comandos executados;
- resultado;
- pendências que dependem de mim.
```
