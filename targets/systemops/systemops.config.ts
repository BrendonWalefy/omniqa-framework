export const systemopsConfig = {
  baseUrl: process.env.SYSTEMOPS_BASE_URL ?? '',
  e2eSecret: process.env.SYSTEMOPS_E2E_SECRET,
  e2eClinicId: process.env.SYSTEMOPS_E2E_CLINIC_ID ?? process.env.E2E_CLINIC_ID,
  e2eRunPrefix: process.env.SYSTEMOPS_E2E_RUN_PREFIX ?? 'local',
  adminEmail: process.env.SYSTEMOPS_ADMIN_EMAIL,
  adminPassword: process.env.SYSTEMOPS_ADMIN_PASSWORD,
  ownerEmail: process.env.SYSTEMOPS_OWNER_EMAIL,
  ownerPassword: process.env.SYSTEMOPS_OWNER_PASSWORD,
  testPhone: process.env.SYSTEMOPS_TEST_PHONE ?? '5511999999999',
  runDestructive: process.env.SYSTEMOPS_RUN_DESTRUCTIVE === 'true',
  runProductionSmoke: process.env.SYSTEMOPS_RUN_PRODUCTION_SMOKE === 'true',
  runLlmSandbox: process.env.SYSTEMOPS_RUN_LLM_SANDBOX === 'true',
  simulateApiKey: process.env.SYSTEMOPS_SIMULATE_API_KEY,
  // Clínica real (isTest=false) usada como fonte de mensagens reais de leads para o
  // replay de melhoria contínua (production-replay.spec.ts). Nunca a mesma que
  // e2eClinicId — o replay lê daqui e escreve/testa contra e2eClinicId.
  productionClinicId: process.env.SYSTEMOPS_PRODUCTION_CLINIC_ID,
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

export function requireE2eConfig(): { baseUrl: string; secret: string; clinicId: string } {
  const baseUrl = requireBaseUrl();
  if (!systemopsConfig.e2eSecret) {
    throw new Error('SYSTEMOPS_E2E_SECRET is required for SystemOps scheduling E2E tests.');
  }

  if (!systemopsConfig.e2eClinicId) {
    throw new Error('SYSTEMOPS_E2E_CLINIC_ID or E2E_CLINIC_ID is required for SystemOps E2E tests.');
  }

  if (isProductionLikeUrl(baseUrl)) {
    throw new Error(`Refusing to run destructive scheduling tests against production-like URL: ${baseUrl}`);
  }

  if (!systemopsConfig.runDestructive) {
    throw new Error('Set SYSTEMOPS_RUN_DESTRUCTIVE=true to run SystemOps scheduling E2E tests.');
  }

  return { baseUrl, secret: systemopsConfig.e2eSecret, clinicId: systemopsConfig.e2eClinicId };
}

export function e2eSkipReason(): string | null {
  if (!systemopsConfig.baseUrl) {
    return 'SYSTEMOPS_BASE_URL é obrigatório para testes E2E destrutivos do SystemOps.';
  }

  if (!systemopsConfig.e2eSecret) {
    return 'SYSTEMOPS_E2E_SECRET não configurado — teste E2E destrutivo ignorado.';
  }

  if (!systemopsConfig.e2eClinicId) {
    return 'SYSTEMOPS_E2E_CLINIC_ID ou E2E_CLINIC_ID não configurado — teste E2E destrutivo ignorado.';
  }

  if (isProductionLikeUrl(systemopsConfig.baseUrl)) {
    return `Ambiente de produção detectado (${systemopsConfig.baseUrl}) — teste E2E destrutivo ignorado.`;
  }

  if (!systemopsConfig.runDestructive) {
    return 'SYSTEMOPS_RUN_DESTRUCTIVE=true é necessário para testes E2E destrutivos.';
  }

  return null;
}

export function createRunId(scenarioId: string): string {
  const safeScenario = scenarioId.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return `${systemopsConfig.e2eRunPrefix}-${safeScenario}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function isProductionLikeUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return normalized.includes('systemops-core-brendon-walefy-s-projects.vercel.app');
}
