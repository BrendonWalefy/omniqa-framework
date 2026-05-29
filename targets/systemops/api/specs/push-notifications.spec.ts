import { expect, test } from '@playwright/test';

test.describe('SystemOps API - Push Notifications (auth guard)', () => {
  test('SYS-PUSH-001 - POST /api/push/subscribe sem sessão retorna 401', async ({ request }) => {
    const response = await request.post('/api/push/subscribe', {
      data: {
        endpoint: 'https://push.example.com/e2e-anon',
        keys: { p256dh: 'fake-key', auth: 'fake-auth' }
      }
    });
    expect(response.status()).toBe(401);
    expect((await response.json()).error).toBe('Unauthorized');
  });

  test('SYS-PUSH-002 - DELETE /api/push/subscribe sem sessão retorna 401', async ({ request }) => {
    const response = await request.delete('/api/push/subscribe', {
      data: { endpoint: 'https://push.example.com/e2e-anon' }
    });
    expect(response.status()).toBe(401);
    expect((await response.json()).error).toBe('Unauthorized');
  });
});
