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
