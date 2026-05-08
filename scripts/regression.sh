#!/usr/bin/env bash

# ─────────────────────────────────────────────
#  OmniQA — Plano de Regressao Completo
#  Plataformas: API, Web, Android, iOS, Performance
# ─────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

SUITES=()
STATUSES=()
DURATIONS=()
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
CRITICAL_FAILED=false
TOTAL_START=$SECONDS
SKIP_MOBILE=false
SKIP_IOS=false

for arg in "$@"; do
  case $arg in
    --skip-mobile) SKIP_MOBILE=true ;;
    --skip-ios)    SKIP_IOS=true ;;
    *) echo -e "${RED}Flag desconhecida: $arg${NC}"; exit 1 ;;
  esac
done

header() {
  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║        OmniQA — Regressao Completa           ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
  echo -e "${DIM}  Inicio: $(date '+%d/%m/%Y %H:%M:%S')${NC}"
  if [ "$SKIP_MOBILE" = "true" ]; then
    echo -e "${YELLOW}  Modo: --skip-mobile (Android e iOS ignorados)${NC}"
  fi
  echo ""
}

step_header() {
  local number=$1
  local name=$2
  local tag=$3
  echo ""
  echo -e "${BLUE}${BOLD}┌─ [${number}] ${name}${NC} ${DIM}(${tag})${NC}"
  echo -e "${BLUE}${BOLD}│${NC}"
}

run_suite() {
  local number=$1
  local name=$2
  local tag=$3
  local cmd=$4
  local blocking=$5   # true = para tudo se falhar

  step_header "$number" "$name" "$tag"

  local start=$SECONDS

  if eval "$cmd" 2>&1 | sed "s/^/$(echo -e "${BLUE}${BOLD}│${NC}") /"; then
    local status="PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
    echo -e "${BLUE}${BOLD}│${NC}"
    echo -e "${BLUE}${BOLD}└─${NC} ${GREEN}${BOLD}✔ PASS${NC} — ${name}"
  else
    local status="FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -e "${BLUE}${BOLD}│${NC}"
    echo -e "${BLUE}${BOLD}└─${NC} ${RED}${BOLD}✘ FAIL${NC} — ${name}"
    if [ "$blocking" = "true" ]; then
      CRITICAL_FAILED=true
    fi
  fi

  local elapsed=$((SECONDS - start))
  SUITES+=("$name")
  STATUSES+=("$status")
  DURATIONS+=("$elapsed")

  if [ "$CRITICAL_FAILED" = "true" ]; then
    echo ""
    echo -e "${RED}${BOLD}  Suite critica falhou. Encerrando regressao.${NC}"
    summary
    exit 1
  fi
}

skip_suite() {
  local number=$1
  local name=$2
  local tag=$3

  echo ""
  echo -e "${BLUE}${BOLD}┌─ [${number}] ${name}${NC} ${DIM}(${tag})${NC}"
  echo -e "${BLUE}${BOLD}└─${NC} ${YELLOW}${BOLD}⊘ SKIP${NC} — ${name}"

  SUITES+=("$name")
  STATUSES+=("SKIP")
  DURATIONS+=("0")
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

summary() {
  local total_elapsed=$((SECONDS - TOTAL_START))

  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║             SUMARIO DA REGRESSAO             ║${NC}"
  echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"

  for i in "${!SUITES[@]}"; do
    local name="${SUITES[$i]}"
    local status="${STATUSES[$i]}"
    local duration="${DURATIONS[$i]}"

    if [ "$status" = "PASS" ]; then
      printf "${BOLD}║${NC}  ${GREEN}${BOLD}✔ PASS${NC}  %-28s %4ss ${BOLD}║${NC}\n" "$name" "$duration"
    elif [ "$status" = "SKIP" ]; then
      printf "${BOLD}║${NC}  ${YELLOW}${BOLD}⊘ SKIP${NC}  %-28s    - ${BOLD}║${NC}\n" "$name"
    else
      printf "${BOLD}║${NC}  ${RED}${BOLD}✘ FAIL${NC}  %-28s %4ss ${BOLD}║${NC}\n" "$name" "$duration"
    fi
  done

  echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
  printf "${BOLD}║${NC}  Passaram: ${GREEN}${BOLD}%d${NC}   Falharam: ${RED}${BOLD}%d${NC}   Pulados: ${YELLOW}${BOLD}%d${NC}   Tempo: ${BOLD}%ds${NC} ${BOLD}║${NC}\n" \
    "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT" "$total_elapsed"
  echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
  echo ""

  if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}  Regressao concluida com sucesso.${NC}"
  else
    echo -e "${RED}${BOLD}  Regressao concluida com falhas. Verifique os relatorios.${NC}"
  fi
  echo ""
}

# ─────────────────────────────────────────────
#  EXECUCAO
# ─────────────────────────────────────────────

header

# 1. API — critico
run_suite 1 "Testes de API" "Playwright" \
  "npm run test:api --silent" \
  "true"

# 2. Web — critico
run_suite 2 "Testes Web" "Playwright / Chromium" \
  "npm run test:web --silent" \
  "true"

# 3. Mobile Android — nao critico (sequencial)
if [ "$SKIP_MOBILE" = "true" ]; then
  skip_suite 3 "Testes Mobile Android" "WebdriverIO / UIAutomator2"
else
  run_suite 3 "Testes Mobile Android" "WebdriverIO / UIAutomator2" \
    "npm run test:mobile:android --silent" \
    "false"
fi

# 4. Mobile iOS — nao critico (sequencial, apos Android)
if [ "$SKIP_MOBILE" = "true" ] || [ "$SKIP_IOS" = "true" ]; then
  skip_suite 4 "Testes Mobile iOS" "WebdriverIO / XCUITest"
else
  run_suite 4 "Testes Mobile iOS" "WebdriverIO / XCUITest" \
    "npm run test:mobile:ios --silent" \
    "false"
fi

# 5. Performance — nao critico (informativo)
run_suite 5 "Testes de Performance" "k6" \
  "npm run test:performance --silent" \
  "false"

# 6. Geracao e abertura de relatorios
echo ""
echo -e "${BOLD}┌─ [6] Gerando relatorios visuais${NC}"
if npm run report:all --silent; then
  echo -e "${BOLD}│${NC}"
  echo -e "${BOLD}└─${NC} ${GREEN}${BOLD}✔ Relatorios gerados — abrindo no navegador...${NC}"
  open reports/junit/report.html
  open reports/performance/report.html
else
  echo -e "${BOLD}└─${NC} ${YELLOW}${BOLD}⚠ Falha ao gerar relatorios${NC}"
fi

summary

# Codigo de saida baseado em falhas
[ "$FAIL_COUNT" -eq 0 ] && exit 0 || exit 1
