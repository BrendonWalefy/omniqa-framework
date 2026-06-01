import { expect, Page, test } from '@playwright/test';
import { nextLocalWeekday } from '../../api/support/calendarAssertions';
import { adminSkipReason, destructiveWebSkipReason, ensureNotProductionLike, loginAdmin } from '../support/auth';

test.describe.configure({ mode: 'serial' });

function nextThursdayInputValue(): string {
  const day = nextLocalWeekday(4);
  return [
    String(day.year),
    String(day.month + 1).padStart(2, '0'),
    String(day.day).padStart(2, '0')
  ].join('-');
}

function shortDateLabel(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

async function gotoAgenda(page: Page) {
  await page.goto('/app/agenda');
  await expect(page.getByRole('heading', { name: /Gerenciar bloqueios/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Novo bloqueio/i })).toBeVisible();
}

async function fillSingleBlock(page: Page, inputDate: string, startTime: string, endTime: string) {
  await page.getByLabel('Data').fill(inputDate);
  await page.getByLabel('Início').fill(startTime);
  await page.getByLabel('Fim').fill(endTime);
  await page.getByLabel('Motivo').selectOption('Reunião');
  await expect(page.getByLabel('Data')).toHaveValue(inputDate);
  await expect(page.getByLabel('Início')).toHaveValue(startTime);
  await expect(page.getByLabel('Fim')).toHaveValue(endTime);
}

test.describe('SystemOps Agenda - Bloqueios UI', () => {
  test.beforeEach(async ({ page }) => {
    const skipReason = adminSkipReason();
    if (skipReason) test.skip(true, skipReason);

    await loginAdmin(page);
    await gotoAgenda(page);
  });

  test('SYS-AGENDA-UI-001 - bloqueio com fim antes do início exibe validação', async ({ page }) => {
    await fillSingleBlock(page, nextThursdayInputValue(), '14:00', '13:00');
    await page.getByRole('button', { name: /Salvar bloqueio/i }).click();

    await expect(page.getByText('Horário de fim deve ser após o início')).toBeVisible();
  });

  test('SYS-AGENDA-UI-002 - cria e remove bloqueio de horário pela UI', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      test.skip(true, 'Coberto em desktop para evitar mutação duplicada de calendário.');
    }

    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    ensureNotProductionLike();

    const inputDate = nextThursdayInputValue();
    const dateLabel = shortDateLabel(inputDate);

    await fillSingleBlock(page, inputDate, '17:15', '17:45');
    await page.getByRole('button', { name: /Salvar bloqueio/i }).click();
    await expect(page.getByText(`Bloqueio de ${dateLabel} salvo.`)).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await gotoAgenda(page);

    const blockCard = page
      .locator('article.agenda-block-card')
      .filter({ hasText: dateLabel })
      .filter({ hasText: '17:15 - 17:45' })
      .filter({ hasText: 'Reunião' })
      .first();

    await expect(blockCard).toBeVisible({ timeout: 10_000 });
    await blockCard.getByRole('button', { name: /Remover bloqueio/i }).click();
    await expect(blockCard).toBeHidden({ timeout: 10_000 });
  });

  test('SYS-AGENDA-UI-003 - mobile 375px mantém formulário e lista sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAgenda(page);

    await expect(page.getByRole('button', { name: /Dia único/i })).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="time"]').first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });
});
