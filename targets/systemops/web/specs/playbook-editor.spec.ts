import { expect, test } from '@playwright/test';
import { adminSkipReason, destructiveWebSkipReason, ensureNotProductionLike, loginAdmin } from '../support/auth';

test.describe('SystemOps Playbook Editor', () => {
  test.beforeEach(async ({ page }) => {
    const skipReason = adminSkipReason();
    if (skipReason) test.skip(true, skipReason);

    await loginAdmin(page);
  });

  test('SYS-PLAYBOOK-UI-001 - editor expõe seção de objeções e sandbox lateral', async ({ page }) => {
    await page.goto('/app/settings/playbook');
    await expect(page.getByRole('heading', { name: /Configurações da IA/i })).toBeVisible();

    const editButtons = page.getByRole('button', { name: /Editar|Editar Contexto/i });
    if ((await editButtons.count()) === 0) {
      test.skip(true, 'Nenhuma versão de playbook disponível para editar.');
    }

    await editButtons.first().click();
    await expect(page).toHaveURL(/\/app\/settings\/playbook\/[^/]+/);
    await expect(page.getByRole('heading', { name: /Editor de Playbook/i })).toBeVisible();
    await expect(page.getByText('Objeções e respostas')).toBeVisible();
    await expect(page.getByRole('button', { name: /Adicionar objeção/i })).toBeVisible();
    await expect(page.getByPlaceholder('Buscar objeção ou resposta...')).toBeVisible();
    await expect(page.getByText('Testar Playbook')).toBeVisible();
    await expect(page.getByPlaceholder('Digite uma mensagem de teste...')).toBeVisible();
  });

  test('SYS-PLAYBOOK-UI-002 - cria nova versão com estrutura completa e remove draft no fim', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'systemops-web-mobile') {
      test.skip(true, 'Coberto em desktop para evitar mutação duplicada de playbook.');
    }

    const skipReason = destructiveWebSkipReason();
    if (skipReason) test.skip(true, skipReason);
    ensureNotProductionLike();

    const suffix = Date.now().toString().slice(-5);
    const versionName = `Playbook QA ${suffix}`;

    try {
      await page.goto('/app/settings/playbook');
      await expect(page.getByRole('heading', { name: /Configurações da IA/i })).toBeVisible();

      await page.getByText('Criar nova versão').click();
      await page.getByPlaceholder('Nome do playbook...').fill(versionName);
      await page.getByRole('button', { name: 'Criar' }).click();

      await expect(page).toHaveURL(/\/app\/settings\/playbook\/[^/]+/);
      await expect(page.getByText(`Editor: ${versionName}`)).toBeVisible();

      await page.getByPlaceholder('Ex: Odontologia Estética e Reabilitação Oral').fill('Odontologia estética QA');
      await page.locator('select').first().selectOption('persuasivo');
      await page.getByPlaceholder('Descrição do procedimento principal oferecido por esta versão do playbook...').fill(
        'Avaliação gratuita para entender objetivo, histórico e melhor plano de tratamento.',
      );
      await page.locator('input[placeholder="Diferencial..."]').first().fill('Atendimento humanizado com planejamento digital');
      await page.getByPlaceholder('Ex: Avaliação inicial gratuita. Valor da avaliação descontado do tratamento. Parcelamento em até 12x.').fill(
        'Avaliação gratuita. Tratamentos podem ser parcelados em até 12x conforme análise da equipe.',
      );

      await page.getByRole('button', { name: /Adicionar objeção/i }).click();
      await page.getByLabel('Objeção 1').fill('Tá caro');
      await page.getByPlaceholder('Como a IA deve responder quando o paciente trouxer essa objeção...').fill(
        'Temos parcelamento em até 12x e a avaliação gratuita ajuda a montar um plano viável.',
      );

      await expect(page.getByText('Salvo')).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText('Tá caro')).toBeVisible();
      await expect(page.getByText('Testar Playbook')).toBeVisible();
    } finally {
      await page.goto('/app/settings/playbook');
      const card = page
        .getByText(versionName)
        .locator('xpath=ancestor::div[contains(@style, "min-height: 190px")][1]');

      if (await card.isVisible().catch(() => false)) {
        await card.locator('button').first().click();
        await page.getByRole('button', { name: /Excluir/i }).click();
        await expect(page.getByText(versionName)).toBeHidden({ timeout: 8_000 });
      }
    }
  });
});
