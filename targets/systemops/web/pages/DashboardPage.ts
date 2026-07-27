import { expect, Locator, Page } from '@playwright/test';

// Achado (validação mobile, Fase 0 tardia): o dashboard mobile
// (MobileDashboardTabs.tsx) é uma UI estruturalmente diferente da desktop
// (DashboardCommandCenter.tsx) — a saudação vem num <strong>, não <h1>, dentro de
// region="Resumo do dashboard" (não "Indicadores principais"), com abas
// Hoje/Leads/Performance em vez do grid de métricas. Um único Page Object cobre os
// dois layouts usando seletores que existem em ambos (texto da saudação, sem depender
// da tag; região por viewport).
export class DashboardPage {
  private readonly greeting: Locator;

  constructor(private readonly page: Page) {
    this.greeting = page.getByText(/Bom dia|Boa tarde|Boa noite/).first();
  }

  async goto() {
    await this.page.goto('/app/dashboard');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/app\/dashboard/);
    await expect(this.greeting).toBeVisible();

    const desktopIndicators = this.page.getByRole('region', { name: 'Indicadores principais' });
    const mobileSummary = this.page.getByRole('region', { name: 'Resumo do dashboard' });
    await expect(desktopIndicators.or(mobileSummary)).toBeVisible();
  }
}
