# Matriz de Rastreabilidade

| ID | Plataforma | Requisito | Cenário | Tipo | Prioridade | Automavel | Status |
|---|---|---|---|---|---|---|---|
| WEB-001 | Web | Login | Login com usuário valido | E2E | Alta | Sim | Automatizado |
| WEB-002 | Web | Login | Login com senha invalida | E2E | Alta | Sim | Automatizado |
| WEB-003 | Web | Carrinho | Adicionar produto ao carrinho | E2E | Alta | Sim | Automatizado |
| WEB-004 | Web | Carrinho | Remover produto do carrinho | E2E | Media | Sim | Automatizado |
| WEB-005 | Web | Checkout | Finalizar compra com dados validos | E2E | Alta | Sim | Automatizado |
| WEB-006 | Web | Inventario | Validar descrição sem erro técnico | UI Visual/Copy | Media | Sim | Automatizado |
| WEB-007 | Web | Inventario | Validar título sem erro técnico | UI Visual/Copy | Media | Sim | Automatizado |
| API-001 | API | Users | Listar usuários | API | Alta | Sim | Automatizado |
| API-002 | API | Users | Validar contrato básico de usuário | API/Contrato | Alta | Sim | Automatizado |
| API-003 | API | Posts | Listar posts | API | Alta | Sim | Automatizado |
| API-004 | API | Posts | Criar post | API | Media | Sim | Automatizado |
| API-005 | API | Comments | Listar comentarios | API | Media | Sim | Automatizado |
| MOB-001 | Mobile | Contatos | Adicionar contato com nome, sobrenome e telefone | E2E Mobile | Alta | Sim | Automatizado |
| MOB-002 | Mobile | Contatos | Remover contato existente | E2E Mobile | Alta | Sim | Automatizado |
| IOS-001 | Mobile iOS | Contatos | Adicionar contato com nome, sobrenome e telefone | E2E Mobile | Alta | Sim | Automatizado |
| IOS-002 | Mobile iOS | Contatos | Remover contato existente | E2E Mobile | Alta | Sim | Automatizado |
| PERF-001 | Performance | Users | Carga controlada em `GET /users` | Performance | Baixa | Sim | Automatizado |
| PERF-002 | Performance | Posts | Carga controlada em `GET /posts` | Performance | Baixa | Sim | Automatizado |
| SYS-WEB-001 | Web | Login | Login admin válido | E2E | Alta | Sim | Automatizado |
| SYS-WEB-002 | Web | Login | Login owner válido | E2E | Alta | Sim | Automatizado |
| SYS-WEB-003 | Web | Login | Login inválido exibe erro | E2E | Alta | Sim | Automatizado |
| SYS-WEB-004 | Web | Auth Guard | Rota /app/dashboard redireciona sem sessão | Auth Guard | Alta | Sim | Automatizado |
| SYS-WEB-005 | Web | Auth Guard | Rota /owner redireciona sem sessão | Auth Guard | Alta | Sim | Automatizado |
| SYS-WEB-006 | Web | Dashboard | Dashboard renderiza sem erro após login admin | Smoke | Alta | Sim | Automatizado |
| SYS-WEB-007 | Web | Inbox | Inbox renderiza após login admin (lista ou empty state) | Smoke | Alta | Sim | Automatizado |
| SYS-API-001 | API | Auth Guard | GET /api/conversations sem sessão retorna 401 | Auth Guard | Alta | Sim | Automatizado |
| SYS-API-002 | API | Auth Guard | GET /api/calendar/blocks sem sessão retorna 401 | Auth Guard | Alta | Sim | Automatizado |
| SYS-API-003 | API | Webhook | Payload inválido ou vazio retorna 400 | API | Media | Sim | Automatizado |
| SYS-API-004 | API | Webhook | Mensagem de grupo (isGroupMsg=true) retorna 200 | API | Media | Sim | Automatizado |
| SYS-API-005 | API | Webhook | Status reply (isStatusReply=true) retorna 200 | API | Media | Sim | Automatizado |
| SYS-API-006 | API | Webhook | fromMe sem texto retorna 200 | API | Media | Sim | Automatizado |
| SYS-AGENDA-001 | API E2E | Agenda | Agenda vazia oferta slots dentro do expediente | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-002 | API E2E | Agenda | Bloqueio 12h-13h remove almoço das ofertas | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-003 | API E2E | Agenda | Consulta 09h-10h remove conflito e buffer pós-consulta | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-004 | API E2E | Agenda | Lead pede manhã e recebe apenas manhã | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-005 | API E2E | Agenda | Lead pede tarde e recebe apenas tarde | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-006 | API E2E | Agenda | Lead pede noite e sistema não oferta fora do expediente | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-007 | API E2E | Agenda | Lead pede sexta e recebe somente sexta no timezone da clínica | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-008 | API E2E | Agenda | Procedimento longo não é ofertado quando não cabe | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-009 | API E2E | Agenda | Confirmação cria exatamente um evento no Calendar | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-010 | API E2E | Agenda | Confirmações concorrentes criam só um evento | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-011 | API E2E | Agenda | Operador ocupa horário após oferta — confirmação falha e sistema reoferta | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-012 | API E2E | Agenda | Cancelamento libera o slot | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-013 | API E2E | Agenda | Remarcação cancela antigo e cria novo sem duplicar | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-014 | API E2E | Agenda | Cleanup deixa agenda QA sem eventos do runId | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-AGENDA-015 | API E2E | Agenda | Pedido genérico pergunta procedimento antes de ofertar slot | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-AGENDA-016 | API E2E | Agenda | 20 Lentes reserva slots de 240 minutos | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-AGENDA-017 | API E2E | Agenda | Opção inexistente não confirma fallback silencioso | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-AGENDA-018 | API E2E | Agenda | Pergunta de preço não cria oferta nem evento | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-AGENDA-019 | API E2E | Agenda | Urgência clínica aciona atenção humana sem agendar | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-AGENDA-020 | API E2E | Agenda | Sábado da Ximendes termina às 13h | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-AGENDA-021 | API E2E | Agenda | Remarcação genérica pede procedimento e mantém agenda antiga | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-AGENDA-022 | API E2E | Agenda | Remarcação de 20 Lentes mantém duração de 240 minutos | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-CONV-001 | API E2E | Conversa | Saudação responde de forma acolhedora sem abrir agenda | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-CONV-002 | API E2E | Conversa | Fora de escopo mantém limite da clínica | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-CONV-003 | API E2E | Conversa | Pergunta de preço não inventa valor | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-CONV-004 | API E2E | Conversa | Depois de preço o lead ainda consegue agendar | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-CONV-005 | API E2E | Conversa | "ok" após oferta não confirma horário sozinho | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-CONV-006 | API E2E | Conversa | "pode ser" sem oferta pendente não agenda nada | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-CONV-007 | API E2E | Conversa | Encerramento não tenta reabrir venda | E2E Destrutivo | Media | Sim | Automatizado |
| SYS-CONV-008 | API E2E | Conversa | Operador assume e IA não responde por cima | E2E Destrutivo | Alta | Sim | Automatizado |
| SYS-PUSH-001 | API | Push Guard | POST /api/push/subscribe sem sessão retorna 401 | Auth Guard | Alta | Sim | Automatizado |
| SYS-PUSH-002 | API | Push Guard | DELETE /api/push/subscribe sem sessão retorna 401 | Auth Guard | Alta | Sim | Automatizado |
| SYS-PUSH-003 | Web | Push | POST com campos ausentes retorna 400 | API | Alta | Sim | Automatizado |
| SYS-PUSH-004 | Web | Push | POST com payload válido salva subscrição | API | Alta | Sim | Automatizado |
| SYS-PUSH-005 | Web | Push | POST idempotente — mesmo endpoint não duplica | API | Alta | Sim | Automatizado |
| SYS-PUSH-006 | Web | Push | DELETE remove subscrição existente | API | Alta | Sim | Automatizado |
| SYS-PUSH-007 | Web | Push | DELETE endpoint inexistente retorna 200 | API | Media | Sim | Automatizado |
| SYS-PUSH-008 | Web | Push | Push component renderiza sem erro de JavaScript no dashboard | Smoke | Alta | Sim | Automatizado |
