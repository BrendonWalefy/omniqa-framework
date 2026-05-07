import { expect, test } from '@playwright/test';
import { expectCommentContract, expectPostContract, expectUserContract } from './support/contracts';
import { expectResponseTimeBelow, expectSuccessfulJsonResponse } from './support/apiAssertions';

test.describe('JSONPlaceholder API', () => {
  test('API-001 - deve listar usuarios com contrato valido', async ({ request }) => {
    const startedAt = Date.now();

    const response = await request.get('/users');
    await expectSuccessfulJsonResponse(response);
    await expectResponseTimeBelow(startedAt, 1_500);

    const users = await response.json();
    expect(users.length).toBeGreaterThan(0);
    expectUserContract(users[0]);
  });

  test('API-002 - deve buscar usuario especifico por id', async ({ request }) => {
    const response = await request.get('/users/1');
    await expectSuccessfulJsonResponse(response);

    const user = await response.json();
    expect(user.id).toBe(1);
    expect(user.email).toContain('@');
    expectUserContract(user);
  });

  test('API-003 - deve listar posts com contrato valido', async ({ request }) => {
    const response = await request.get('/posts');
    await expectSuccessfulJsonResponse(response);

    const posts = await response.json();
    expect(posts.length).toBeGreaterThan(0);
    expectPostContract(posts[0]);
  });

  test('API-004 - deve criar post com payload coerente', async ({ request }) => {
    const payload = {
      userId: 1,
      title: 'Plano de qualidade reutilizavel',
      body: 'Automacao de API validando contrato e comportamento.'
    };

    const response = await request.post('/posts', { data: payload });
    await expectSuccessfulJsonResponse(response, 201);

    const createdPost = await response.json();
    expect(createdPost).toEqual(expect.objectContaining(payload));
    expect(createdPost.id).toBeDefined();
  });

  test('API-005 - deve listar comentarios com contrato valido', async ({ request }) => {
    const response = await request.get('/comments');
    await expectSuccessfulJsonResponse(response);

    const comments = await response.json();
    expect(comments.length).toBeGreaterThan(0);
    expectCommentContract(comments[0]);
  });
});
