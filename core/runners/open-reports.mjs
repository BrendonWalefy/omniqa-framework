import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const reportPaths = process.argv.slice(2);

if (reportPaths.length === 0) {
  console.error('Informe pelo menos um relatório HTML para abrir.');
  process.exit(1);
}

const opener =
  process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open';

const openerArgs = (filePath) => {
  if (process.platform === 'win32') {
    return ['/c', 'start', '', filePath];
  }

  return [filePath];
};

let openedCount = 0;

for (const reportPath of reportPaths) {
  const absolutePath = path.resolve(reportPath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`Relatório não encontrado: ${absolutePath}`);
    continue;
  }

  const child = spawn(opener, openerArgs(absolutePath), {
    detached: true,
    stdio: 'ignore'
  });

  child.on('error', (error) => {
    console.warn(`Não foi possível abrir ${absolutePath}: ${error.message}`);
  });

  child.unref();
  openedCount += 1;
}

if (openedCount === 0) {
  process.exit(1);
}
