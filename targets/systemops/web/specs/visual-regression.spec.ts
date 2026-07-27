import { expect, test } from '@playwright/test';
import { adminSkipReason, loginAdmin } from '../support/auth';
import { LoginPage } from '../pages/LoginPage';

// Regressão visual (Fase 4 do plano de melhoria contínua). Escopo deliberadamente
// pequeno: só telas/regiões com pouco conteúdo dinâmico (data, hora, contadores em
// tempo real) para evitar falso-positivo constante — regiões com números ao vivo (ex.:
// "Leads Ativos") têm o texto dinâmico mascarado via `mask`, não comparado pixel a
// pixel. Baselines vivem em visual-regression.spec.ts-snapshots/, versionadas no repo.
test.describe('SystemOps Web - Regressão visual', () => {
  test('SYS-VISUAL-001 - tela de login mantém layout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveScreenshot('login-page.png', { maxDiffPixelRatio: 0.02 });
  });

  // Mobile não tem nav.side-nav — usa bottom bar (MobileDashboardTabs.tsx). Precisaria
  // de baseline e seletor próprios; fora de escopo desta rodada.
  test('SYS-VISUAL-002 - menu lateral mantém estrutura e ordem dos itens', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      testInfo.skip(true, 'Nav mobile é uma bottom bar diferente — precisa de baseline/seletor dedicados.');
    }
    if (adminSkipReason()) test.skip(true, adminSkipReason()!);

    await loginAdmin(page);

    const sidebar = page.locator('nav.side-nav');
    await expect(sidebar).toHaveScreenshot('sidebar-nav.png', {
      maxDiffPixelRatio: 0.02,
      // Contador de mensagens não lidas no Inbox muda constantemente — mascarar.
      mask: [sidebar.locator('.side-nav-item :text-matches("^\\d+$")')],
    });
  });

  // Achado: DashboardRingMetrics.tsx (src/app/(clinic)/app/dashboard/) é código morto —
  // não é importado em lugar nenhum do produto (grep confirmou). Os indicadores reais do
  // dashboard hoje são os cards em region[aria-label="Indicadores principais"].
  // Mobile não tem region "Indicadores principais" — indicadores ficam atrás de abas
  // (ver achado em dashboard.spec.ts). Precisaria de baseline/seletor dedicados.
  test('SYS-VISUAL-003 - indicadores principais do dashboard mantêm layout com valores mascarados', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      testInfo.skip(true, 'Indicadores ficam atrás de abas na UI mobile — precisa de baseline/seletor dedicados.');
    }
    if (adminSkipReason()) test.skip(true, adminSkipReason()!);

    await loginAdmin(page);
    await page.goto('/app/dashboard');

    const indicators = page.getByRole('region', { name: 'Indicadores principais' });
    await expect(indicators).toBeVisible();

    await expect(indicators).toHaveScreenshot('dashboard-indicators.png', {
      maxDiffPixelRatio: 0.02,
      mask: [indicators.locator('.command-metric-card strong')],
    });
  });
});
