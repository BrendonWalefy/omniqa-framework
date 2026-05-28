import fs from 'node:fs';
import path from 'node:path';

const reportDirs = [
  path.resolve('reports'),
  path.resolve('reports/junit'),
  path.resolve('reports/performance')
];

for (const dir of reportDirs) {
  fs.mkdirSync(dir, { recursive: true });
}

