export const systemopsConfig = {
  baseUrl: process.env.SYSTEMOPS_BASE_URL ?? '',
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
