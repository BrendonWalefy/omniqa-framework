# SystemOps Conversation Experience Plan

## Objetivo

Validar se a IA conversa com o lead de forma segura, clara e comercialmente saudável antes de mexer na agenda.

Esta suíte não tenta medir "simpatia" com uma nota subjetiva. Ela transforma experiência em critérios objetivos: não inventar valor, não agendar sem confirmação, não responder fora de escopo como se fosse atendimento da clínica, não atropelar operador humano e não perder a chance de agendar depois de uma objeção.

## Como Executar

Com o `systemops-core` local em modo E2E:

```bash
SYSTEMOPS_BASE_URL=http://localhost:3000 \
SYSTEMOPS_E2E_SECRET=local-e2e-scheduling-secret \
SYSTEMOPS_RUN_DESTRUCTIVE=true \
npm run test:systemops:conversation
```

## Critérios Automatizados

| Critério | Como validar |
|---|---|
| Sem invenção de preço | Resposta não contém `R$` nem número grande |
| Sem agenda acidental | Não cria appointment/evento quando a mensagem não confirma slot |
| Sem confirmação ambígua | "ok" não vira opção 1 |
| Sem insistência no encerramento | "obrigado tchau" encerra sem abrir venda |
| Limite de escopo | Pergunta fora da clínica recebe resposta limitada à clínica |
| Continuidade comercial | Depois de preço, lead ainda consegue pedir horário |
| Handoff humano | Operador assume e IA fica em silêncio |

## Cenários

| ID | Cenário | Risco coberto |
|---|---|---|
| SYS-CONV-001 | Saudação acolhedora sem abrir agenda | Experiência fria ou estado indevido |
| SYS-CONV-002 | Fora de escopo mantém limite da clínica | IA responder assunto errado |
| SYS-CONV-003 | Preço não inventa valor | Promessa comercial errada |
| SYS-CONV-004 | Preço → agendamento | Objeção quebrar fluxo de conversão |
| SYS-CONV-005 | "ok" após oferta não confirma | Agendar sem consentimento explícito |
| SYS-CONV-006 | "pode ser" sem oferta não agenda | Confirmação solta virar booking |
| SYS-CONV-007 | Encerramento não força venda | Experiência insistente |
| SYS-CONV-008 | Operador assume e IA silencia | IA atropelar atendimento humano |

## Próximos Refinamentos

- Scorecard de qualidade textual: clareza, empatia, objetividade, segurança e conversão.
- Golden conversations baseadas em conversas reais anonimizadas.
- Testes com LLM real em execução controlada e manual, no máximo pontual, para calibrar prompt sem custo recorrente.
- Regras de anti-repetição quando o lead já recebeu preço, endereço ou explicação.
