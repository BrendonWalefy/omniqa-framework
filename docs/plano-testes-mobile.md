# Plano de Testes Mobile

## Aplicacao

Calculadora nativa em Android e iOS.

## Objetivo

Validar operacoes matematicas basicas em dispositivos moveis, com foco em estabilidade do script, seletores reutilizaveis e clareza de evidencias.

## Escopo

- Soma.
- Subtracao.
- Multiplicacao.
- Divisao.
- Limpeza do resultado entre cenarios.

## Estrategia

Os mesmos cenarios devem ser reaproveitados entre Android e iOS sempre que possivel. Os seletores devem ficar separados por plataforma, pois a implementacao nativa de cada calculadora pode mudar.

## Cenarios iniciais

| ID | Cenario | Entrada | Resultado esperado | Prioridade |
|---|---|---|---|---|
| MOB-001 | Soma | 2 + 3 | 5 | Alta |
| MOB-002 | Subtracao | 9 - 4 | 5 | Alta |
| MOB-003 | Multiplicacao | 6 x 7 | 42 | Media |
| MOB-004 | Divisao | 8 / 2 | 4 | Media |

