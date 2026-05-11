# Próximos Passos Sugeridos

## Curto prazo

- Atualizar a matriz de rastreabilidade sempre que novos cenários forem adicionados.
- Revisar o GitHub Pages após mudanças grandes no README ou nos docs.
- Executar `npm run test:api`, `npm run test:web` e `npm run test:performance` antes de publicações importantes.
- Rodar Mobile localmente quando houver alteração em specs, Screen Objects ou seletores.

## Melhorias úteis

- Criar um índice principal em `docs/README.md` se a documentação crescer mais.
- Melhorar a galeria de evidências do relatório JUnit com filtros por plataforma ou cenário, se o volume de imagens crescer.
- Registrar decisões técnicas em um arquivo próprio caso o projeto evolua com mais módulos.
- Avaliar uma camada compartilhada para Mobile apenas se houver duplicação suficiente entre Android e iOS.

## Ideias de novos testes

- Web: validar ordenação de produtos no SauceDemo.
- Web: validar logout e retorno para login.
- API: validar criação de post com payload mínimo e payload inválido.
- API: ampliar contratos para comentários e usuários.
- Performance: adicionar thresholds mais explícitos para taxa de erro e duração.
- Mobile: validar edição de contato, se o ambiente local estiver estável.

## Critérios para não fazer agora

- Não criar um framework mobile compartilhado antes de haver necessidade real.
- Não adicionar dependências visuais ou dashboards pesados sem benefício claro.
- Não misturar documentação de portfólio com documentação operacional demais.
- Não colocar segredos, tokens, UDIDs sensíveis ou dados privados nos docs.
