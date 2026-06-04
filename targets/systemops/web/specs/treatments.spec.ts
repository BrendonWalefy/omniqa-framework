import { expect, Locator, Page, test } from '@playwright/test';
import { adminSkipReason, destructiveWebSkipReason, ensureNotProductionLike, loginAdmin } from '../support/auth';

test.describe.configure({ mode: 'serial' });

async function gotoTreatments(page: Page) {
  await page.goto('/app/settings/playbook');
  await expect(page.getByRole('heading', { name: /Configurações da IA/i })).toBeVisible();
  await page.getByRole('button', { name: 'Procedimentos' }).click();
  await expect(page.getByText('Adicionar procedimento')).toBeVisible();
}

async function firstQaTreatmentInput(page: Page): Promise<Locator | null> {
  const inputs = page.locator('input[name="name"]');
  const count = await inputs.count();

  for (let index = 0; index < count; index++) {
    const input = inputs.nth(index);
    const value = await input.inputValue().catch(() => '');
    if (value.startsWith('Procedimento QA')) return input;
  }

  return null;
}

async function hasQaTreatment(page: Page): Promise<boolean> {
  return firstQaTreatmentInput(page).then(Boolean);
}

async function cleanupQaTreatments(page: Page) {
  for (let i = 0; i < 5; i++) {
    const qaInput = await firstQaTreatmentInput(page);
    if (!qaInput) return;

    await qaInput.locator('xpath=ancestor::form[1]').getByTitle('Remover procedimento').click();
    await expect.poll(() => hasQaTreatment(page), { timeout: 8_000 }).toBe(false);
  }
}

test.describe('SystemOps Configurações - Procedimentos', () => {
  test.beforeEach(async ({ page }) => {
    const skipReason = adminSkipReason();
    if (skipReason) test.skip(true, skipReason);

    await loginAdmin(page);
    await gotoTreatments(page);
  });

  test('SYS-TREAT-001 - cria, edita e remove procedimento usado pela IA', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      test.skip(true, 'Coberto em desktop para evitar mutação duplicada de procedimentos.');
    }

    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    ensureNotProductionLike();

    const suffix = Date.now().toString().slice(-5);
    const name = `Procedimento QA ${suffix}`;
    const editedName = `Procedimento QA editado ${suffix}`;

    await cleanupQaTreatments(page);

    const addSection = page.getByText('Adicionar procedimento').locator('xpath=ancestor::section[1]');
    await addSection.locator('input[name="name"]').fill(name);
    await addSection.locator('input[name="durationMinutes"]').fill('95');
    await addSection.getByRole('button', { name: /Adicionar/i }).click();

    await expect(page.getByText('Procedimento adicionado com sucesso')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('form').filter({ has: page.locator(`input[value="${name}"]`) })).toBeVisible({ timeout: 8_000 });

    const row = page.locator('form').filter({ has: page.locator(`input[value="${name}"]`) }).first();
    await row.locator('input[name="name"]').fill(editedName);
    await row.locator('input[name="durationMinutes"]').fill('120');
    await row.getByRole('button', { name: /Salvar/i }).click();
    const editedRowAfterSave = page.locator('form').filter({ has: page.locator(`input[value="${editedName}"]`) }).first();
    await expect(editedRowAfterSave.getByRole('button', { name: /Salvo/i })).toBeVisible({ timeout: 8_000 });

    await page.reload();
    await gotoTreatments(page);
    const editedRow = page.locator('form').filter({ has: page.locator(`input[value="${editedName}"]`) }).first();
    await expect(editedRow).toBeVisible();
    await expect(editedRow.locator('input[name="durationMinutes"]')).toHaveValue('120');

    await editedRow.getByTitle('Remover procedimento').click();
    await expect(editedRow).toBeHidden({ timeout: 8_000 });
    await cleanupQaTreatments(page);
  });

  test('SYS-TREAT-002 - mobile 375px mantém formulário de procedimentos sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoTreatments(page);

    await expect(page.getByText('Procedimentos cadastrados', { exact: true })).toBeVisible();
    await expect(page.getByText('Adicionar procedimento')).toBeVisible();
    await expect(page.locator('input[name="name"]').last()).toBeVisible();
    await expect(page.locator('input[name="durationMinutes"]').last()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });
});
