import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , scriptName, reportType] = process.argv;

if (!scriptName || !reportType) {
  console.error('Uso: node scripts/run-with-report.mjs <script> <junit|performance|all>');
  process.exit(1);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpmScript(name) {
  return spawnSync(npmCommand, ['run', name, '--silent'], {
    stdio: 'inherit'
  }).status ?? 1;
}

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

function prepareJunitReports() {
  const junitDir = path.resolve('reports/junit');
  fs.mkdirSync(junitDir, { recursive: true });

  for (const file of fs.readdirSync(junitDir)) {
    if (file.endsWith('.xml')) {
      removeIfExists(path.join(junitDir, file));
    }
  }

  removeIfExists(path.join(junitDir, 'report.html'));
  removeDirIfExists(path.resolve('reports/evidence/web'));
  removeDirIfExists(path.resolve('reports/mobile/android'));
  removeDirIfExists(path.resolve('reports/mobile/ios'));
}

function preparePerformanceReports() {
  const performanceDir = path.resolve('reports/performance');
  fs.mkdirSync(performanceDir, { recursive: true });
  removeIfExists(path.join(performanceDir, 'summary.json'));
  removeIfExists(path.join(performanceDir, 'report.html'));
}

function prepareReports() {
  if (reportType === 'junit' || reportType === 'all') {
    prepareJunitReports();
  }

  if (reportType === 'performance' || reportType === 'all') {
    preparePerformanceReports();
  }
}

function generateReports() {
  if (reportType === 'junit') {
    return runNpmScript('report:junit');
  }

  if (reportType === 'performance') {
    return runNpmScript('report:performance');
  }

  if (reportType === 'all') {
    return runNpmScript('report:all');
  }

  console.error(`Tipo de relatório desconhecido: ${reportType}`);
  return 1;
}

function openerCommand() {
  if (process.platform === 'darwin') {
    return { command: 'open', args: [] };
  }

  if (process.platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', ''] };
  }

  return { command: 'xdg-open', args: [] };
}

function openReports() {
  const reports = [];

  if (reportType === 'junit' || reportType === 'all') {
    reports.push(path.resolve('reports/junit/report.html'));
  }

  if (reportType === 'performance' || reportType === 'all') {
    reports.push(path.resolve('reports/performance/report.html'));
  }

  const opener = openerCommand();

  for (const reportPath of reports) {
    if (!fs.existsSync(reportPath)) {
      continue;
    }

    const child = spawn(opener.command, [...opener.args, reportPath], {
      detached: true,
      stdio: 'ignore'
    });

    child.on('error', (error) => {
      console.warn(`Não foi possível abrir ${reportPath}: ${error.message}`);
    });

    child.unref();
  }
}

prepareReports();
const testStatus = runNpmScript(scriptName);
const reportStatus = generateReports();

if (reportStatus === 0) {
  openReports();
} else {
  console.warn('Não foi possível gerar o relatório automático desta execução.');
}

process.exit(testStatus);
