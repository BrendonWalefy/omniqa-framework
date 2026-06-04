import { expect, Locator, Page, test } from '@playwright/test';
import { adminSkipReason, destructiveWebSkipReason, ensureNotProductionLike, loginAdmin } from '../support/auth';

test.describe.configure({ mode: 'serial', timeout: 60_000 });

function previewPanel(page: Page): Locator {
  return page.getByText('PRÉVIA NO WHATSAPP').locator('xpath=..');
}

function menuLabelInputs(page: Page): Locator {
  return page.locator('input:not([type])');
}

async function gotoBehaviorTab(page: Page) {
  await page.goto('/app/settings/playbook');
  await expect(page.getByRole('heading', { name: /Configurações da IA/i })).toBeVisible();
  await page.getByRole('button', { name: 'Comportamento' }).click();
  await expect(page.getByText('Menu de opções', { exact: true })).toBeVisible();
  await expect(previewPanel(page)).toBeVisible();
}

async function waitForAutosave(page: Page) {
  await page.waitForTimeout(1_400);
  await expect(page.getByText(/Configurações salvas|Alterações salvas automaticamente/)).toBeVisible({ timeout: 10_000 });
}

async function isRowEnabled(row: Locator): Promise<boolean> {
  return row.getByTitle('Desativar item').isVisible().catch(() => false);
}

async function setRowEnabled(row: Locator, enabled: boolean) {
  const currentlyEnabled = await isRowEnabled(row);
  if (currentlyEnabled === enabled) return;

  await row.getByTitle(enabled ? 'Ativar item' : 'Desativar item').click();
}

test.describe('SystemOps IA Settings - Menu de opções', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const skipReason = adminSkipReason();
    if (skipReason) test.skip(true, skipReason);

    await loginAdmin(page);
    await gotoBehaviorTab(page);
  });

  test('SYS-IA-001 - edição de rótulo e toggle atualizam prévia e persistem após reload', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      test.skip(true, 'Coberto em desktop para evitar mutação duplicada de configuração.');
    }

    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    ensureNotProductionLike();

    const firstInput = menuLabelInputs(page).nth(0);
    const secondInput = menuLabelInputs(page).nth(1);
    const firstOriginal = await firstInput.inputValue();
    const secondOriginal = await secondInput.inputValue();
    const secondRow = secondInput.locator('xpath=..');
    const secondWasEnabled = await isRowEnabled(secondRow);
    const customLabel = `Avaliação Gratuita QA ${Date.now().toString().slice(-5)}`;

    try {
      await firstInput.fill(customLabel);
      await expect(previewPanel(page)).toContainText(`1. ${customLabel}`);
      await waitForAutosave(page);

      await setRowEnabled(secondRow, false);
      await expect(previewPanel(page)).not.toContainText(`2. ${secondOriginal}`);
      await waitForAutosave(page);

      await setRowEnabled(secondRow, true);
      await expect(previewPanel(page)).toContainText(`2. ${secondOriginal}`);
      await waitForAutosave(page);

      await page.reload();
      await gotoBehaviorTab(page);
      await expect(menuLabelInputs(page).nth(0)).toHaveValue(customLabel);
      await expect(previewPanel(page)).toContainText(`1. ${customLabel}`);
    } finally {
      const restoredFirstInput = menuLabelInputs(page).nth(0);
      const restoredSecondInput = menuLabelInputs(page).nth(1);
      await restoredFirstInput.fill(firstOriginal);
      await restoredSecondInput.fill(secondOriginal);
      await setRowEnabled(restoredSecondInput.locator('xpath=..'), secondWasEnabled);
      await waitForAutosave(page);
    }
  });

  test('SYS-IA-002 - mobile 375px renderiza menu sem corte e oculta label de intent', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoBehaviorTab(page);

    await expect(page.locator('.menu-intent-label').first()).toBeHidden();
    const textareaBox = await page.locator('textarea').first().boundingBox();
    expect(textareaBox?.width ?? 0).toBeGreaterThan(300);

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('SYS-IA-003 - texto de boas-vindas vazio/customizado atualiza preview e persiste', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      test.skip(true, 'Coberto em desktop para evitar mutação duplicada de configuração.');
    }

    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    ensureNotProductionLike();

    const greetingInput = page.locator('textarea').first();
    const originalGreeting = await greetingInput.inputValue();
    const customGreeting = `Olá, sou a IA QA ${Date.now().toString().slice(-5)}. Posso te ajudar?`;

    try {
      await greetingInput.fill('');
      await expect(previewPanel(page)).toContainText(/Seja bem-vindo/i);
      await waitForAutosave(page);

      await greetingInput.fill(customGreeting);
      await expect(previewPanel(page)).toContainText(customGreeting);
      await waitForAutosave(page);

      await page.reload();
      await gotoBehaviorTab(page);
      await expect(page.locator('textarea').first()).toHaveValue(customGreeting);
      await expect(previewPanel(page)).toContainText(customGreeting);
    } finally {
      await page.locator('textarea').first().fill(originalGreeting);
      await waitForAutosave(page);
    }
  });

  test('SYS-IA-004 - horário, pausa automática e buffer autosalvam e persistem', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      test.skip(true, 'Coberto em desktop para evitar mutação duplicada de configuração.');
    }

    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    ensureNotProductionLike();

    const businessHoursInput = page.getByPlaceholder('Ex: Segunda a sexta das 8h às 18h. Sábado das 8h às 13h.');
    const pauseInput = page.locator('input[type="number"]').nth(0);
    const bufferInput = page.locator('input[type="number"]').nth(1);
    const originalBusinessHours = await businessHoursInput.inputValue();
    const originalPause = await pauseInput.inputValue();
    const originalBuffer = await bufferInput.inputValue();
    const customBusinessHours = `Segunda a sexta das 8h às 18h. Sábado das 8h às 13h. QA ${Date.now().toString().slice(-5)}`;

    try {
      await businessHoursInput.fill(customBusinessHours);
      await pauseInput.fill('6');
      await bufferInput.fill('45');
      await waitForAutosave(page);

      await page.reload();
      await gotoBehaviorTab(page);
      await expect(page.getByPlaceholder('Ex: Segunda a sexta das 8h às 18h. Sábado das 8h às 13h.')).toHaveValue(customBusinessHours);
      await expect(page.locator('input[type="number"]').nth(0)).toHaveValue('6');
      await expect(page.locator('input[type="number"]').nth(1)).toHaveValue('45');
    } finally {
      await page.getByPlaceholder('Ex: Segunda a sexta das 8h às 18h. Sábado das 8h às 13h.').fill(originalBusinessHours);
      await page.locator('input[type="number"]').nth(0).fill(originalPause);
      await page.locator('input[type="number"]').nth(1).fill(originalBuffer);
      await waitForAutosave(page);
    }
  });

  test('SYS-IA-005 - toggle de autoatendimento altera status visual e pode ser restaurado', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      test.skip(true, 'Coberto em desktop para evitar mutação duplicada de configuração.');
    }

    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    ensureNotProductionLike();

    const statusCard = page.getByText('Status da IA').locator('xpath=ancestor::div[contains(@style, "border")][1]');
    const toggleButton = statusCard.getByRole('button').last();
    const wasActive = await statusCard.getByText('Ativa').isVisible().catch(() => false);

    try {
      await toggleButton.click();
      await expect(statusCard.getByText(wasActive ? 'Pausada' : 'Ativa')).toBeVisible({ timeout: 6_000 });
    } finally {
      const isActiveNow = await statusCard.getByText('Ativa').isVisible().catch(() => false);
      if (isActiveNow !== wasActive) {
        await toggleButton.click();
        await expect(statusCard.getByText(wasActive ? 'Ativa' : 'Pausada')).toBeVisible({ timeout: 6_000 });
      }
    }
  });
});
