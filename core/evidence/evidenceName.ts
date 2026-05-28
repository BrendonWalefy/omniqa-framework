export function formatEvidenceName(name: string, fallbackPrefix: string, scenarioName = '') {
  return `${extractScenarioPrefix(name, fallbackPrefix, scenarioName)}-${slugifyEvidenceStep(name)}-${formatTimestamp()}`;
}

function extractScenarioPrefix(name: string, fallbackPrefix: string, scenarioName: string) {
  const match = name.match(/[A-Z]+-\d+/) ?? scenarioName.match(/[A-Z]+-\d+/);
  return match ? match[0].toLowerCase() : fallbackPrefix;
}

function formatTimestamp() {
  const now = new Date();

  return now
    .toLocaleString('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      hour12: false
    })
    .replace(' ', '-')
    .replace(/:/g, '') + `-${String(now.getMilliseconds()).padStart(3, '0')}`;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugifyEvidenceStep(name: string) {
  const stepName = name.replace(/^[A-Z]+-\d+\s*-\s*/i, '');
  return slugify(stepName) || 'evidence';
}
