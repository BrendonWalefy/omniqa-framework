import fs from 'fs';
import path from 'path';
import { renderPage, badge, formatMs, COLORS } from './report-styles.js';

interface Metric {
  avg?: number;
  min?: number;
  max?: number;
  med?: number;
  'p(90)'?: number;
  'p(95)'?: number;
  count?: number;
  rate?: number;
  value?: number;
  passes?: number;
  fails?: number;
  thresholds?: Record<string, boolean>;
}

interface Check {
  name: string;
  passes: number;
  fails: number;
}

interface Group {
  name: string;
  checks: Record<string, Check>;
  groups: Record<string, Group>;
}

interface Summary {
  metrics: Record<string, Metric>;
  root_group: Group;
}

const summaryPath = path.resolve('reports/performance/summary.json');
const outputPath = path.resolve('reports/performance/report.html');

if (!fs.existsSync(summaryPath)) {
  console.error(`Arquivo não encontrado: ${summaryPath}`);
  console.error('Execute primeiro: npm run test:performance');
  process.exit(1);
}

const summary: Summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
const m = summary.metrics;

// In k6 summary-export: threshold value false = passed (not violated), true = failed
function thresholdPassed(val: boolean): boolean {
  return !val;
}

const duration = m['http_req_duration'];
const requests = m['http_reqs'];
const failed = m['http_req_failed'];
const checks = m['checks'];
const vus = m['vus'];

const errorRate = failed?.value !== undefined ? `${(failed.value * 100).toFixed(2)}%` : '—';
const totalChecks = (checks?.passes ?? 0) + (checks?.fails ?? 0);
const checkRate = totalChecks > 0
  ? `${(((checks?.passes ?? 0) / totalChecks) * 100).toFixed(1)}%`
  : '—';

const thresholds: { metric: string; condition: string; passed: boolean }[] = [];
for (const [metricName, metric] of Object.entries(m)) {
  if (metric.thresholds) {
    for (const [condition, failed] of Object.entries(metric.thresholds)) {
      thresholds.push({ metric: metricName, condition, passed: thresholdPassed(failed) });
    }
  }
}

const allThresholdsPassed = thresholds.every(t => t.passed);

function renderGroup(group: Group): string {
  const checkEntries = Object.values(group.checks);
  if (checkEntries.length === 0) return '';

  const rows = checkEntries.map(c => `
    <tr>
      <td>${c.name}</td>
      <td class="center">${c.passes}</td>
      <td class="center" style="color:${c.fails > 0 ? COLORS.danger : COLORS.muted}">${c.fails}</td>
      <td class="center">${badge(c.fails === 0 ? 'pass' : 'fail')}</td>
    </tr>`).join('');

  const groupPassed = checkEntries.every(c => c.fails === 0);

  return `
    <div style="background:white;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${COLORS.border};background:${groupPassed ? COLORS.bg : '#fff8f8'}">
        <div style="font-weight:600;font-size:0.88rem;color:${COLORS.text}">${group.name}</div>
        ${badge(groupPassed ? 'pass' : 'fail')}
      </div>
      <table>
        <thead>
          <tr>
            <th>Check</th>
            <th class="center">Passes</th>
            <th class="center">Fails</th>
            <th class="center">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

const thresholdRows = thresholds.map(t => `
  <tr>
    <td><code>${t.metric}</code></td>
    <td><code>${t.condition}</code></td>
    <td class="center">${badge(t.passed ? 'pass' : 'fail')}</td>
  </tr>`).join('');

const body = `
  <section>
    <div class="section-title">Resumo da Execução</div>
    <div class="cards">
      <div class="card card--accent">
        <div class="card__label">Requisicoes</div>
        <div class="card__value">${requests?.count ?? '—'}</div>
        <div class="card__sub">${requests?.rate !== undefined ? `${requests.rate.toFixed(2)}/s` : '—'}</div>
      </div>
      <div class="card ${failed?.value === 0 ? 'card--success' : 'card--danger'}">
        <div class="card__label">Taxa de Erro</div>
        <div class="card__value" style="color:${failed?.value === 0 ? COLORS.success : COLORS.danger}">${errorRate}</div>
        <div class="card__sub">${failed?.fails ?? 0} falhas registradas</div>
      </div>
      <div class="card">
        <div class="card__label">Tempo Medio</div>
        <div class="card__value" style="font-size:1.4rem">${formatMs(duration?.avg)}</div>
        <div class="card__sub">min: ${formatMs(duration?.min)}</div>
      </div>
      <div class="card card--accent">
        <div class="card__label">P95</div>
        <div class="card__value" style="font-size:1.4rem">${formatMs(duration?.['p(95)'])}</div>
        <div class="card__sub">max: ${formatMs(duration?.max)}</div>
      </div>
      <div class="card">
        <div class="card__label">VUs (max)</div>
        <div class="card__value">${vus?.max ?? '—'}</div>
        <div class="card__sub">min: ${vus?.min ?? '—'}</div>
      </div>
      <div class="card card--success">
        <div class="card__label">Checks</div>
        <div class="card__value" style="color:${COLORS.success}">${checkRate}</div>
        <div class="card__sub">${checks?.passes ?? 0} passes · ${checks?.fails ?? 0} fails</div>
      </div>
    </div>
  </section>

  <section>
    <div class="section-title">Thresholds (${thresholds.length})</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Condicao</th>
            <th class="center">Status</th>
          </tr>
        </thead>
        <tbody>${thresholdRows}</tbody>
      </table>
    </div>
  </section>

  <section>
    <div class="section-title">Grupos de Teste (${Object.keys(summary.root_group.groups).length})</div>
    ${Object.values(summary.root_group.groups).map(renderGroup).join('')}
  </section>
`;

const html = renderPage({
  title: 'Relatório de Performance — OmniQA',
  reportTitle: 'Relatório de Performance — OmniQA Framework',
  reportSubtitle: `k6 · Gerado em ${new Date().toLocaleString('pt-BR')}`,
  passed: allThresholdsPassed,
  body,
});

fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`Relatório de performance gerado: ${outputPath}`);
