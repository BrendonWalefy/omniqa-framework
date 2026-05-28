import { expect, test } from '@playwright/test';

test.describe('SystemOps API - Proteção de rotas', () => {
  test('SYS-API-001 - GET /api/conversations/:id/messages sem sessão retorna 401', async ({ request }) => {
    const response = await request.get('/api/conversations/fake-id/messages');
    expect(response.status()).toBe(401);
  });

  test('SYS-API-002 - GET /api/calendar/blocks sem sessão retorna 401', async ({ request }) => {
    const response = await request.get('/api/calendar/blocks');
    expect(response.status()).toBe(401);
  });
});
