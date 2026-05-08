// Design system compartilhado — OmniQA Framework

export const COLORS = {
  primary: '#003087',
  accent: '#EC7000',
  accentLight: '#FFF3E8',
  success: '#16a34a',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  bg: '#F5F7FA',
  white: '#FFFFFF',
  border: '#E8ECEF',
  text: '#1A1A2E',
  muted: '#6B7280',
};

export const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: ${COLORS.bg};
    color: ${COLORS.text};
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Header ── */
  .report-header {
    background: ${COLORS.primary};
    border-bottom: 4px solid ${COLORS.accent};
    padding: 28px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .report-header__brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .report-header__logo {
    width: 40px;
    height: 40px;
    background: ${COLORS.accent};
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 18px;
    color: white;
    flex-shrink: 0;
  }
  .report-header__title {
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .report-header__subtitle {
    color: rgba(255,255,255,0.55);
    font-size: 0.78rem;
    margin-top: 3px;
  }
  .report-header__badge {
    padding: 6px 20px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    border: 1.5px solid;
  }
  .report-header__badge--pass {
    color: ${COLORS.success};
    border-color: ${COLORS.success};
    background: rgba(22,163,74,0.1);
  }
  .report-header__badge--fail {
    color: #f87171;
    border-color: #f87171;
    background: rgba(220,38,38,0.12);
  }

  /* ── Layout ── */
  main {
    padding: 36px 40px;
    max-width: 1140px;
    margin: 0 auto;
  }

  section { margin-bottom: 36px; }

  .section-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${COLORS.muted};
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${COLORS.border};
  }

  /* ── Cards ── */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 14px;
  }
  .card {
    background: ${COLORS.white};
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    border-top: 3px solid ${COLORS.border};
    transition: border-color 0.2s;
  }
  .card--accent { border-top-color: ${COLORS.accent}; }
  .card--success { border-top-color: ${COLORS.success}; }
  .card--danger { border-top-color: ${COLORS.danger}; }
  .card--warning { border-top-color: ${COLORS.warning}; }
  .card__label {
    font-size: 0.68rem;
    color: ${COLORS.muted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-weight: 600;
  }
  .card__value {
    font-size: 2rem;
    font-weight: 800;
    color: ${COLORS.text};
    margin-top: 6px;
    letter-spacing: -0.02em;
  }
  .card__sub {
    font-size: 0.75rem;
    color: ${COLORS.muted};
    margin-top: 4px;
  }

  /* ── Tables ── */
  .table-wrap {
    background: ${COLORS.white};
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    overflow: hidden;
  }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: ${COLORS.primary}; }
  th {
    text-align: left;
    padding: 10px 16px;
    font-size: 0.68rem;
    color: rgba(255,255,255,0.75);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  td {
    padding: 11px 16px;
    border-top: 1px solid ${COLORS.border};
    font-size: 0.84rem;
  }
  tr:hover td { background: #fafbfc; }
  .center { text-align: center; }
  .right { text-align: right; }

  /* ── Badges ── */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 99px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .badge--pass { background: ${COLORS.successLight}; color: ${COLORS.success}; }
  .badge--fail { background: ${COLORS.dangerLight}; color: ${COLORS.danger}; }
  .badge--skip { background: ${COLORS.warningLight}; color: ${COLORS.warning}; }

  code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.78rem;
    background: ${COLORS.bg};
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid ${COLORS.border};
  }
`;

export interface PageOptions {
  title: string;
  reportTitle: string;
  reportSubtitle: string;
  passed: boolean;
  body: string;
}

export function renderPage(opts: PageOptions): string {
  const badgeClass = opts.passed ? 'pass' : 'fail';
  const badgeLabel = opts.passed ? 'APROVADO' : 'REPROVADO';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  <header class="report-header">
    <div class="report-header__brand">
      <div class="report-header__logo">QA</div>
      <div>
        <div class="report-header__title">${opts.reportTitle}</div>
        <div class="report-header__subtitle">${opts.reportSubtitle}</div>
      </div>
    </div>
    <div class="report-header__badge report-header__badge--${badgeClass}">${badgeLabel}</div>
  </header>
  <main>${opts.body}</main>
</body>
</html>`;
}

export function badge(status: 'pass' | 'fail' | 'skip'): string {
  const labels = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP' };
  return `<span class="badge badge--${status}">${labels[status]}</span>`;
}

export function formatMs(ms: number | undefined): string {
  if (ms === undefined) return '—';
  return `${ms.toFixed(2)}ms`;
}

export function formatSec(sec: number | undefined): string {
  if (sec === undefined) return '—';
  return sec >= 1 ? `${sec.toFixed(2)}s` : `${(sec * 1000).toFixed(0)}ms`;
}
