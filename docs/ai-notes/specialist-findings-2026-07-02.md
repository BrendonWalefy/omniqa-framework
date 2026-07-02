# Findings da camada de especialistas — 2026-07-02

> Gerado automaticamente por production-replay.spec.ts (SYS-REPLAY-001) + camada de
> especialistas (core/specialists). 10 finding(s). Documento de
> sugestão para revisão humana — nenhum teste/código foi gerado automaticamente.

## Severidade: high (1)

### [ai-quality] IA parece não ter entendido a mensagem do lead

- **Categoria:** nlu_miss
- **Evidência:** lead: "Combinado" → IA: "Boa noite, [E2E:local-replay-8f9ccfeb-1782973108386-353933]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?" — A resposta da IA soa muito genérica e repetitiva, o que pode afastar a naturalidade do atendimento. Além disso, a mensagem do lead, que é breve e sem contexto, não foi considerada, resultando em uma abordagem que não se alinha ao que o lead provavelmente esperava.
- **Sugestão:** Revisar classificação de intent para esse padrão de mensagem (IntentClassifier).

## Severidade: medium (1)

### [sales-persuasion] IA não contornou objeção insinuada pelo lead

- **Categoria:** objection_handling
- **Evidência:** lead: "Combinado" → IA: "Boa noite, [E2E:local-replay-8f9ccfeb-1782973108386-353933]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?"
- **Sugestão:** Adicionar ao playbook uma resposta padrão para essa objeção, com contorno explícito.

## Severidade: low (8)

### [sales-persuasion] Oportunidade de qualificação/diferencial não aproveitada

- **Categoria:** missed_opportunity
- **Evidência:** lead: "Combinado" → IA: "Boa noite, [E2E:local-replay-8f9ccfeb-1782973108386-353933]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?" — A resposta da IA não endereça potenciais objeções sobre preços e não destaca a oferta da consulta gratuita. Além disso, falta um senso de urgência que poderia incentivar o lead a agir mais rapidamente.
- **Sugestão:** Revisar se o playbook orienta a IA a mencionar diferenciais/qualificar nesse tipo de mensagem.

### [ux] Resposta pede múltiplas decisões de uma vez

- **Categoria:** cognitive_load
- **Evidência:** IA: "Boa noite, [E2E:local-replay-8f9ccfeb-1782973108386-353933]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?" — A resposta da IA inclui múltiplas opções (valores, agendamento ou serviço específico), o que pode sobrecarregar o lead ao exigir uma decisão imediata. A clareza geral é boa, mas a demanda de escolha múltipla pode ser confusa.
- **Sugestão:** Quebrar em perguntas sequenciais em vez de uma única mensagem com várias opções.

### [ai-quality] Resposta soa robótica/genérica em PT-BR

- **Categoria:** unnatural_language
- **Evidência:** IA: "Boa noite, [E2E:local-replay-8f9ccfeb-1782973108386-353933]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?"
- **Sugestão:** Ajustar o tom de voz do playbook ou variar templates de resposta.

### [sales-persuasion] Oportunidade de qualificação/diferencial não aproveitada

- **Categoria:** missed_opportunity
- **Evidência:** lead: "Boa tarde" → IA: "Boa noite, [E2E:local-replay-44e2d49d-1782973116568-72ab0a]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?" — A resposta da IA é amigável e aberta ao diálogo, mas não aborda diretamente a possibilidade de uma consulta gratuita, o que poderia instigar interesse imediato. Além disso, não menciona os diferenciais ou os serviços específicos, perdendo uma oportunidade de qualificação do lead.
- **Sugestão:** Revisar se o playbook orienta a IA a mencionar diferenciais/qualificar nesse tipo de mensagem.

### [ai-quality] Resposta soa robótica/genérica em PT-BR

- **Categoria:** unnatural_language
- **Evidência:** IA: "Boa noite, [E2E:local-replay-44e2d49d-1782973116568-72ab0a]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?"
- **Sugestão:** Ajustar o tom de voz do playbook ou variar templates de resposta.

### [sales-persuasion] Oportunidade de qualificação/diferencial não aproveitada

- **Categoria:** missed_opportunity
- **Evidência:** lead: "Olá! Tenho interesse e queria mais informações, por favor." → IA: "Boa noite, [E2E:local-replay-a95f45fa-1782973126221-efd9df]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?" — Embora a IA pergunte sobre o que o lead deseja, não aborda a consulta de avaliação gratuita como um diferencial. Além disso, não cria um senso de urgência ou próximo passo claro, o que poderia melhorar o fechamento da conversa.
- **Sugestão:** Revisar se o playbook orienta a IA a mencionar diferenciais/qualificar nesse tipo de mensagem.

### [ux] Resposta pede múltiplas decisões de uma vez

- **Categoria:** cognitive_load
- **Evidência:** IA: "Boa noite, [E2E:local-replay-a95f45fa-1782973126221-efd9df]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?" — A resposta é clara, mas pede que o lead decida entre três opções diferentes (valores, agendamento ou serviço específico) de uma só vez, o que pode criar uma sobrecarga cognitiva.
- **Sugestão:** Quebrar em perguntas sequenciais em vez de uma única mensagem com várias opções.

### [ai-quality] Resposta soa robótica/genérica em PT-BR

- **Categoria:** unnatural_language
- **Evidência:** IA: "Boa noite, [E2E:local-replay-a95f45fa-1782973126221-efd9df]. Tudo bem?

Sou a assistente virtual da QA E2E Clinic. Me conta o que você gostaria de ver hoje: valores, agendamento ou algum serviço específico?"
- **Sugestão:** Ajustar o tom de voz do playbook ou variar templates de resposta.
