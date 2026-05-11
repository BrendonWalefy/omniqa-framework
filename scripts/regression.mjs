import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GREEN = '\x1b[0;32m';
const RED = '\x1b[0;31m';
const YELLOW = '\x1b[1;33m';
const BLUE = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const suites = [];
let passCount = 0;
let failCount = 0;
let skipCount = 0;
let criticalFailed = false;
const totalStart = Date.now();
let skipMobile = false;
let skipIos = false;

for (const arg of process.argv.slice(2)) {
  if (arg === '--skip-mobile') {
    skipMobile = true;
  } else if (arg === '--skip-ios') {
    skipIos = true;
  } else {
    console.error(`${RED}Flag desconhecida: ${arg}${NC}`);
    process.exit(1);
  }
}

const elapsedSeconds = (start) => Math.round((Date.now() - start) / 1000);

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function removeDirIfExists(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function prepareRegressionReports() {
  const junitDir = path.resolve('reports/junit');
  fs.mkdirSync(junitDir, { recursive: true });

  for (const file of fs.readdirSync(junitDir)) {
    if (file.endsWith('.xml')) {
      removeIfExists(path.join(junitDir, file));
    }
  }

  removeIfExists(path.join(junitDir, 'report.html'));
  removeIfExists(path.resolve('reports/performance/summary.json'));
  removeIfExists(path.resolve('reports/performance/report.html'));
  removeDirIfExists(path.resolve('reports/evidence/web'));
  removeDirIfExists(path.resolve('reports/mobile/android'));
  removeDirIfExists(path.resolve('reports/mobile/ios'));
}

function header() {
  console.log('');
  console.log(`${BOLD}╔══════════════════════════════════════════════╗${NC}`);
  console.log(`${BOLD}║        OmniQA — Regressão Completa           ║${NC}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════╝${NC}`);
  console.log(`${DIM}  Início: ${new Date().toLocaleString('pt-BR')}${NC}`);
  if (skipMobile) {
    console.log(`${YELLOW}  Modo: --skip-mobile (Android e iOS ignorados)${NC}`);
  }
  console.log('');
}

function stepHeader(number, name, tag) {
  console.log('');
  console.log(`${BLUE}${BOLD}┌─ [${number}] ${name}${NC} ${DIM}(${tag})${NC}`);
  console.log(`${BLUE}${BOLD}│${NC}`);
}

function runNpmScript(scriptName, extraArgs = []) {
  return spawnSync(npmCommand, ['run', scriptName, '--silent', ...extraArgs], {
    stdio: 'inherit'
  }).status ?? 1;
}

function generateAndOpenReports(includePerformance) {
  console.log('');
  console.log(`${BOLD}┌─ Gerando relatórios visuais${NC}`);

  const reportStatus = includePerformance
    ? runNpmScript('report:all')
    : runNpmScript('report:junit');

  if (reportStatus === 0) {
    console.log(`${BOLD}│${NC}`);
    console.log(`${BOLD}└─${NC} ${GREEN}${BOLD}✔ Relatórios gerados — abrindo no navegador...${NC}`);

    const reports = includePerformance
      ? ['reports/junit/report.html', 'reports/performance/report.html']
      : ['reports/junit/report.html'];

    spawnSync(
      process.execPath,
      ['scripts/open-reports.mjs', ...reports],
      { stdio: 'inherit' }
    );
    return;
  }

  console.log(`${BOLD}└─${NC} ${YELLOW}${BOLD}⚠ Falha ao gerar relatórios${NC}`);
}

function runSuite(number, name, tag, scriptName, blocking) {
  stepHeader(number, name, tag);
  const start = Date.now();
  const statusCode = runNpmScript(scriptName);
  const duration = elapsedSeconds(start);

  if (statusCode === 0) {
    passCount += 1;
    suites.push({ name, status: 'PASS', duration });
    console.log(`${BLUE}${BOLD}│${NC}`);
    console.log(`${BLUE}${BOLD}└─${NC} ${GREEN}${BOLD}✔ PASS${NC} — ${name}`);
  } else {
    failCount += 1;
    suites.push({ name, status: 'FAIL', duration });
    console.log(`${BLUE}${BOLD}│${NC}`);
    console.log(`${BLUE}${BOLD}└─${NC} ${RED}${BOLD}✘ FAIL${NC} — ${name}`);
    if (blocking) {
      criticalFailed = true;
    }
  }

  if (criticalFailed) {
    console.log('');
    console.log(`${RED}${BOLD}  Suite crítica falhou. Encerrando regressão.${NC}`);
    generateAndOpenReports(false);
    summary();
    process.exit(1);
  }
}

function skipSuite(number, name, tag) {
  console.log('');
  console.log(`${BLUE}${BOLD}┌─ [${number}] ${name}${NC} ${DIM}(${tag})${NC}`);
  console.log(`${BLUE}${BOLD}└─${NC} ${YELLOW}${BOLD}⊘ SKIP${NC} — ${name}`);
  suites.push({ name, status: 'SKIP', duration: 0 });
  skipCount += 1;
}

function summary() {
  const totalElapsed = elapsedSeconds(totalStart);

  console.log('');
  console.log(`${BOLD}╔══════════════════════════════════════════════╗${NC}`);
  console.log(`${BOLD}║             SUMÁRIO DA REGRESSÃO             ║${NC}`);
  console.log(`${BOLD}╠══════════════════════════════════════════════╣${NC}`);

  for (const suite of suites) {
    const paddedName = suite.name.padEnd(28, ' ');
    const paddedDuration = String(suite.duration).padStart(4, ' ');

    if (suite.status === 'PASS') {
      console.log(`${BOLD}║${NC}  ${GREEN}${BOLD}✔ PASS${NC}  ${paddedName} ${paddedDuration}s ${BOLD}║${NC}`);
    } else if (suite.status === 'SKIP') {
      console.log(`${BOLD}║${NC}  ${YELLOW}${BOLD}⊘ SKIP${NC}  ${paddedName}    - ${BOLD}║${NC}`);
    } else {
      console.log(`${BOLD}║${NC}  ${RED}${BOLD}✘ FAIL${NC}  ${paddedName} ${paddedDuration}s ${BOLD}║${NC}`);
    }
  }

  console.log(`${BOLD}╠══════════════════════════════════════════════╣${NC}`);
  console.log(`${BOLD}║${NC}  Passaram: ${GREEN}${BOLD}${passCount}${NC}   Falharam: ${RED}${BOLD}${failCount}${NC}   Pulados: ${YELLOW}${BOLD}${skipCount}${NC}   Tempo: ${BOLD}${totalElapsed}s${NC} ${BOLD}║${NC}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════╝${NC}`);
  console.log('');

  if (failCount === 0) {
    console.log(`${GREEN}${BOLD}  Regressão concluída com sucesso.${NC}`);
  } else {
    console.log(`${RED}${BOLD}  Regressão concluída com falhas. Verifique os relatórios.${NC}`);
  }
  console.log('');
}

prepareRegressionReports();
header();

runSuite(1, 'Testes de API', 'Playwright', 'test:api:raw', true);
runSuite(2, 'Testes Web', 'Playwright / Chromium', 'test:web:raw', true);

if (skipMobile) {
  skipSuite(3, 'Testes Mobile Android', 'WebdriverIO / UIAutomator2');
} else {
  runSuite(3, 'Testes Mobile Android', 'WebdriverIO / UIAutomator2', 'test:mobile:android:raw', false);
}

if (skipMobile || skipIos) {
  skipSuite(4, 'Testes Mobile iOS', 'WebdriverIO / XCUITest');
} else {
  runSuite(4, 'Testes Mobile iOS', 'WebdriverIO / XCUITest', 'test:mobile:ios:raw', false);
}

runSuite(5, 'Testes de Performance', 'k6', 'test:performance:raw', false);

generateAndOpenReports(true);

summary();
process.exit(failCount === 0 ? 0 : 1);
