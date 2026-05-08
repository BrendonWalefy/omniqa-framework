import fs from 'fs';
import path from 'path';
import { renderPage, badge, formatSec, COLORS } from './report-styles.js';

interface TestCase {
  name: string;
  classname: string;
  time: number;
  status: 'pass' | 'fail' | 'skip';
  failureMessage?: string;
}

interface TestSuite {
  name: string;
  tests: number;
  failures: number;
  skipped: number;
  time: number;
  cases: TestCase[];
}

interface JUnitSummary {
  tests: number;
  failures: number;
  skipped: number;
  time: number;
  suites: TestSuite[];
}

function attr(str: string, key: string): string {
  const m = str.match(new RegExp(`${key}="([^"]*)"`));
  return m ? m[1] : '';
}

function parseJUnit(xml: string): JUnitSummary {
  const suitesTag = xml.match(/<testsuites([^>]*)>/)?.[1] ?? '';

  const suites: TestSuite[] = [];
  const suiteRegex = /<testsuite([^>]*)>([\s\S]*?)<\/testsuite>/g;
  let sm: RegExpExecArray | null;

  while ((sm = suiteRegex.exec(xml)) !== null) {
    const suiteAttrs = sm[1];
    const suiteBody = sm[2];

    const cases: TestCase[] = [];
    const caseRegex = /<testcase([^>]*)>([\s\S]*?)<\/testcase>|<testcase([^>]*)\/>/g;
    let cm: RegExpExecArray | null;

    while ((cm = caseRegex.exec(suiteBody)) !== null) {
      const caseAttrs = cm[1] ?? cm[3];
      const caseBody = cm[2] ?? '';

      const hasFailure = /<failure/.test(caseBody);
      const hasSkipped = /<skipped/.test(caseBody);
      const failureMsg = caseBody.match(/<failure[^>]*message="([^"]*)"/)?.[1] ??
                         caseBody.match(/<failure[^>]*>([\s\S]*?)<\/failure>/)?.[1]?.trim();

      cases.push({
        name: attr(caseAttrs, 'name'),
        classname: attr(caseAttrs, 'classname'),
        time: parseFloat(attr(caseAttrs, 'time')) || 0,
        status: hasFailure ? 'fail' : hasSkipped ? 'skip' : 'pass',
        failureMessage: failureMsg,
      });
    }

    suites.push({
      name: attr(suiteAttrs, 'name'),
      tests: parseInt(attr(suiteAttrs, 'tests')) || cases.length,
      failures: parseInt(attr(suiteAttrs, 'failures')) || 0,
      skipped: parseInt(attr(suiteAttrs, 'skipped')) || 0,
      time: parseFloat(attr(suiteAttrs, 'time')) || 0,
      cases,
    });
  }

  return {
    tests: parseInt(attr(suitesTag, 'tests')) || suites.reduce((a, s) => a + s.tests, 0),
    failures: parseInt(attr(suitesTag, 'failures')) || suites.reduce((a, s) => a + s.failures, 0),
    skipped: parseInt(attr(suitesTag, 'skipped')) || suites.reduce((a, s) => a + s.skipped, 0),
    time: parseFloat(attr(suitesTag, 'time')) || suites.reduce((a, s) => a + s.time, 0),
    suites,
  };
}

const junitDir = path.resolve('reports/junit');
const outputPath = path.resolve('reports/junit/report.html');

const xmlFiles = fs.existsSync(junitDir)
  ? fs.readdirSync(junitDir).filter(f => f.endsWith('.xml')).map(f => path.join(junitDir, f))
  : [];

if (xmlFiles.length === 0) {
  console.error('Nenhum arquivo XML encontrado em reports/junit/');
  console.error('Execute primeiro: npm run test:api, test:web ou test:mobile:android');
  process.exit(1);
}

// Merge todos os XMLs em um único resultado
const data: JUnitSummary = { tests: 0, failures: 0, skipped: 0, time: 0, suites: [] };
for (const xmlPath of xmlFiles) {
  const parsed = parseJUnit(fs.readFileSync(xmlPath, 'utf-8'));
  data.tests += parsed.tests;
  data.failures += parsed.failures;
  data.skipped += parsed.skipped;
  data.time += parsed.time;
  data.suites.push(...parsed.suites);
}

const passed = data.tests - data.failures - data.skipped;
const allPassed = data.failures === 0;

function renderSuite(suite: TestSuite, index: number): string {
  const suitePassed = suite.failures === 0 && suite.skipped === 0;
  const suiteStatus = suite.failures > 0 ? 'fail' : suite.skipped > 0 ? 'skip' : 'pass';

  const rows = suite.cases.map(c => `
    <tr>
      <td>${c.name}</td>
      <td class="center">${badge(c.status)}</td>
      <td class="right" style="color:${COLORS.muted}">${formatSec(c.time)}</td>
    </tr>
    ${c.failureMessage ? `
    <tr>
      <td colspan="3" style="padding:0 16px 12px;background:#fff8f8">
        <code style="display:block;white-space:pre-wrap;color:${COLORS.danger};font-size:0.76rem;padding:10px;border-radius:6px;background:${COLORS.dangerLight};border:none">${c.failureMessage.replace(/</g, '&lt;')}</code>
      </td>
    </tr>` : ''}
  `).join('');

  return `
    <div style="background:white;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${COLORS.border};background:${suitePassed ? COLORS.bg : '#fff8f8'}">
        <div>
          <div style="font-weight:600;font-size:0.88rem;color:${COLORS.text}">${suite.name}</div>
          <div style="font-size:0.74rem;color:${COLORS.muted};margin-top:2px">${suite.tests} testes · ${formatSec(suite.time)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${suite.failures > 0 ? `<span style="font-size:0.78rem;color:${COLORS.danger};font-weight:600">${suite.failures} falha(s)</span>` : ''}
          ${badge(suiteStatus)}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Caso de Teste</th>
            <th class="center">Status</th>
            <th class="right">Duração</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

const body = `
  <section>
    <div class="section-title">Resumo</div>
    <div class="cards">
      <div class="card card--accent">
        <div class="card__label">Total</div>
        <div class="card__value">${data.tests}</div>
        <div class="card__sub">testes executados</div>
      </div>
      <div class="card card--success">
        <div class="card__label">Passaram</div>
        <div class="card__value" style="color:${COLORS.success}">${passed}</div>
        <div class="card__sub">${data.tests > 0 ? ((passed / data.tests) * 100).toFixed(0) : 0}% do total</div>
      </div>
      <div class="card ${data.failures > 0 ? 'card--danger' : ''}">
        <div class="card__label">Falharam</div>
        <div class="card__value" style="color:${data.failures > 0 ? COLORS.danger : COLORS.muted}">${data.failures}</div>
        <div class="card__sub">${data.failures > 0 ? 'requer atenção' : 'nenhuma falha'}</div>
      </div>
      <div class="card ${data.skipped > 0 ? 'card--warning' : ''}">
        <div class="card__label">Pulados</div>
        <div class="card__value" style="color:${data.skipped > 0 ? COLORS.warning : COLORS.muted}">${data.skipped}</div>
        <div class="card__sub">ignorados</div>
      </div>
      <div class="card">
        <div class="card__label">Duração</div>
        <div class="card__value" style="font-size:1.5rem">${formatSec(data.time)}</div>
        <div class="card__sub">tempo total</div>
      </div>
    </div>
  </section>

  <section>
    <div class="section-title">Suites de Teste (${data.suites.length})</div>
    ${data.suites.map((s, i) => renderSuite(s, i)).join('')}
  </section>
`;

const html = renderPage({
  title: 'Relatório de Testes — OmniQA',
  reportTitle: 'Relatório de Testes — OmniQA Framework',
  reportSubtitle: `JUnit · Gerado em ${new Date().toLocaleString('pt-BR')}`,
  passed: allPassed,
  body,
});

fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`Relatório JUnit gerado: ${outputPath}`);
