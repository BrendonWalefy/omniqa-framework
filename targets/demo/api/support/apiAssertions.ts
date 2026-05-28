import { APIResponse, expect } from '@playwright/test';

export async function expectSuccessfulJsonResponse(response: APIResponse, expectedStatus = 200) {
  expect(response.status()).toBe(expectedStatus);
  expect(response.headers()['content-type']).toContain('application/json');
}

export async function expectResponseTimeBelow(startedAt: number, thresholdMs: number) {
  const elapsedMs = Date.now() - startedAt;
  expect(elapsedMs).toBeLessThanOrEqual(thresholdMs);
}
