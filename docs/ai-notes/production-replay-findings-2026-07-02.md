# Achados do replay de conversas reais — 02/jul/2026

> Gerado por 3 rodadas de `production-replay.spec.ts` (SYS-REPLAY-001), 15 conversas reais
> de leads da Ximendes Odontologia por rodada (45 no total), replayadas contra a QA E2E
> Clinic com avaliação de qualidade via `core/llm-judge`. Ver Fase 2/3 do plano de
> melhoria contínua.

## Resumo quantitativo

| Métrica | Valor |
|---|---|
| Mensagens reais replayadas | 45 |
| Respostas recebidas | 45/45 (100%) |
| Score médio de qualidade | 80.3 / 100 |
| Score mín. / máx. | 60 / 90 |
| Alucinação de preço/condição detectada | 0 |
| Falha de pipeline (sem resposta) | 0 |

O pipeline está estável nas 3 execuções — nenhuma flakiness observada. Os pontos abaixo
são de **qualidade de resposta**, não de bug de disponibilidade.

## Padrões recorrentes (score ≤ 75, 12 de 45 respostas)

### 1. Saudação não reflete o período do dia da mensagem do lead (2 ocorrências)
Lead manda "Boa tarde" → IA responde "Boa noite". A saudação é calculada pelo horário do
**servidor no momento do teste**, não pelo período mencionado na mensagem do lead. Em
produção normalmente os dois coincidem (mensagem chega e é respondida quase na hora), mas
isso expõe que a lógica de saudação não lê o contexto da mensagem — só o relógio.
**Sugestão:** se o lead já cumprimentou com um período específico ("bom dia"/"boa
tarde"/"boa noite"), a IA poderia espelhar esse período em vez de recalcular pelo horário
atual, ou pelo menos não reafirmar um período diferente do que o lead usou.

### 2. Pergunta institucional genérica não é respondida diretamente (4 ocorrências)
Lead pergunta "Posso saber mais sobre sua empresa?" → IA responde só com uma pergunta de
volta ("me conta o que você gostaria de ver"), sem nenhuma apresentação da clínica antes
de perguntar. O judge penalizou consistentemente por não "atender à solicitação inicial".
**Sugestão:** ter uma resposta padrão curta de apresentação institucional (nome da
clínica, especialidade, diferencial) para perguntas desse tipo, antes de redirecionar
para qualificação.

### 3. Diferencial comercial (consulta de avaliação gratuita) não é mencionado proativamente (3 ocorrências)
A política comercial da clínica de teste destaca "consulta de avaliação gratuita" como
diferencial, mas a saudação padrão da IA não menciona isso — só aparece se o lead
perguntar. O judge citou isso especificamente como oportunidade perdida em saudações
iniciais.
**Sugestão:** avaliar se vale incluir o diferencial comercial já na primeira resposta
(trade-off: pode deixar a saudação mais longa/menos natural — decisão de produto, não
técnica).

### 4. Resposta a menu numerado isolado ("3") soa fria/pouco acolhedora (3 ocorrências, scores mais baixos: 60, 70, 70)
Quando a única mensagem replayada é um número solto (ex: "3", provavelmente resposta a um
menu numerado da conversa original), a IA oferece horários mas o tom foi julgado "não
acolhedor" pelas 3 execuções.
**Ressalva metodológica:** isso é parcialmente um artefato da amostragem — o replay usa
só a primeira mensagem do lead, então "3" perde o contexto do menu que a precedia na
conversa real. Ainda assim, é um sinal real: se por algum motivo a IA perder contexto
(sessão expirada, erro), a resposta a um número isolado deveria continuar soando humana,
não só funcional.

## Achados de disponibilidade corrigidos durante a construção desta suíte (não recorrentes — já resolvidos)

Esses não são achados de qualidade, são bugs reais encontrados e corrigidos no processo:

1. `POST /api/playbook/advisor/analyze` retornava 500 sempre (`metrics.period.to.getTime
   is not a function`) — a tela de Sugestões de Playbook estava 100% quebrada. Corrigido
   em `src/app/api/playbook/advisor/analyze/route.ts` (sales-engine).
2. `POST /api/e2e/reset` não limpava `outbound_messages`/`inbound_events`, quebrando com
   violação de FK assim que uma clínica de teste realmente recebia resposta da IA.
   Corrigido em `src/app/api/e2e/reset/route.ts` (sales-engine).
3. UX do bloqueio de horário na agenda mostrava erro genérico ("Falha em: <data>") em vez
   do motivo real da validação. Corrigido em
   `src/app/(clinic)/app/agenda/BlockModal.tsx` (sales-engine).

## Próximos passos sugeridos

- Os 4 padrões de qualidade acima são candidatos a virar sugestões automáticas via
  `PlaybookAdvisor`/tela de Sugestões de Playbook, ou entrar como findings da persona
  "UX"/"Vendas" quando a Fase 3.5 (camada de especialistas) estiver pronta.
- Rodar este replay periodicamente (Fase 5) vai mostrar se esses 4 padrões são
  estruturais (aparecem sempre) ou específicos do playbook fixo usado na QA E2E Clinic.
