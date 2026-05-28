import { expect, test } from '@playwright/test';

test.describe('SystemOps API - Z-API webhook', () => {
  test('SYS-API-003 - Payload inválido ou vazio retorna 400', async ({ request }) => {
    const response = await request.post('/api/whatsapp/zapi', {
      data: '',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.status()).toBe(400);
  });

  test('SYS-API-004 - Mensagem de grupo (isGroupMsg=true) retorna 200', async ({ request }) => {
    const response = await request.post('/api/whatsapp/zapi', {
      data: {
        isGroupMsg: true,
        phone: '5511999999999',
        messageId: 'test-group-001',
        fromMe: false,
        isStatusReply: false,
        momment: Date.now()
      }
    });
    expect(response.status()).toBe(200);
  });

  test('SYS-API-005 - Status reply (isStatusReply=true) retorna 200', async ({ request }) => {
    const response = await request.post('/api/whatsapp/zapi', {
      data: {
        isStatusReply: true,
        phone: '5511999999999',
        messageId: 'test-status-001',
        fromMe: false,
        isGroupMsg: false,
        momment: Date.now()
      }
    });
    expect(response.status()).toBe(200);
  });

  test('SYS-API-006 - fromMe sem texto retorna 200', async ({ request }) => {
    const response = await request.post('/api/whatsapp/zapi', {
      data: {
        fromMe: true,
        phone: '5511999999999',
        messageId: 'test-fromme-001',
        isGroupMsg: false,
        isStatusReply: false,
        momment: Date.now()
      }
    });
    expect(response.status()).toBe(200);
  });
});
