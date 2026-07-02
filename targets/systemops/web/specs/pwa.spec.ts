import { expect, test } from '@playwright/test';

test.describe('SystemOps Mobile PWA', () => {
  test('SYS-PWA-001 - manifest expõe experiência standalone e ícones instaláveis', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);

    const manifest = await response.json() as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      orientation: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.name).toBe('SystemOps');
    expect(manifest.short_name).toBe('SystemOps');
    expect(manifest.start_url).toBe('/app/inbox');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.status()).toBe(200);
      expect(icon.type).toBe('image/png');
    }
  });

  test('SYS-PWA-002 - páginas publicam manifest e service worker sem erro', async ({ page, request }) => {
    await page.goto('/login');

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#09090b');

    const swResponse = await request.get('/sw.js');
    expect(swResponse.status()).toBe(200);
    expect(await swResponse.text()).toContain('addEventListener');
  });
});
