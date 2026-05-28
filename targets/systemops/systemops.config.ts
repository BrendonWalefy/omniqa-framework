export const systemopsConfig = {
  baseUrl: process.env.SYSTEMOPS_BASE_URL ?? '',
  e2eSecret: process.env.SYSTEMOPS_E2E_SECRET,
  e2eRunPrefix: process.env.SYSTEMOPS_E2E_RUN_PREFIX ?? 'local',
  adminEmail: process.env.SYSTEMOPS_ADMIN_EMAIL,
  adminPassword: process.env.SYSTEMOPS_ADMIN_PASSWORD,
  ownerEmail: process.env.SYSTEMOPS_OWNER_EMAIL,
  ownerPassword: process.env.SYSTEMOPS_OWNER_PASSWORD,
  testPhone: process.env.SYSTEMOPS_TEST_PHONE ?? '5511999999999',
  runDestructive: process.env.SYSTEMOPS_RUN_DESTRUCTIVE === 'true',
  runProductionSmoke: process.env.SYSTEMOPS_RUN_PRODUCTION_SMOKE === 'true',
};

export function requireBaseUrl(): string {
  if (!systemopsConfig.baseUrl) {
    throw new Error('SYSTEMOPS_BASE_URL is required for the SystemOps target.');
  }
  return systemopsConfig.baseUrl;
}

export function hasAdminCredentials(): boolean {
  return Boolean(systemopsConfig.adminEmail && systemopsConfig.adminPassword);
}

export function hasOwnerCredentials(): boolean {
  return Boolean(systemopsConfig.ownerEmail && systemopsConfig.ownerPassword);
}

export function requireE2eConfig(): { baseUrl: string; secret: string } {
  const baseUrl = requireBaseUrl();
  if (!systemopsConfig.e2eSecret) {
    throw new Error('SYSTEMOPS_E2E_SECRET is required for SystemOps scheduling E2E tests.');
  }

  if (isProductionLikeUrl(baseUrl)) {
    throw new Error(`Refusing to run destructive scheduling tests against production-like URL: ${baseUrl}`);
  }

  if (!systemopsConfig.runDestructive) {
    throw new Error('Set SYSTEMOPS_RUN_DESTRUCTIVE=true to run SystemOps scheduling E2E tests.');
  }

  return { baseUrl, secret: systemopsConfig.e2eSecret };
}

export function createRunId(scenarioId: string): string {
  const safeScenario = scenarioId.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return `${systemopsConfig.e2eRunPrefix}-${safeScenario}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function isProductionLikeUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return normalized.includes('systemops-core-brendon-walefy-s-projects.vercel.app');
}
