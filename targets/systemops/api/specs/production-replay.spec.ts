import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRunId, e2eSkipReason, systemopsConfig } from '../../systemops.config';
import { agentMessageCount, latestAgentMessage, SystemOpsE2eClient } from '../support/e2eClient';
import { fetchRealConversations } from '../support/productionConversationSource';
import { judgeAiReply, type JudgeVerdict } from '../../../../core/llm-judge/judge';
import { runConversationSpecialists } from '../../../../core/specialists/orchestrator';
import type { Finding } from '../../../../core/specialists/types';

// Playbook fixado da QA E2E Clinic (scripts/qa-e2e-clinic.json no sales-engine) — usado
// como contexto para o LLM-judge avaliar as respostas replayadas.
const QA_CLINIC_PLAYBOOK = {
  commercialPolicy:
    'Consulta de avaliação gratuita. Lentes de contato dental a partir de R$ 2.500 (resina) ou R$ 5.000 (porcelana). Parcelamento em até 12x sem juros.',
  toneOfVoice: 'acolhedor',
};

// Melhoria contínua: replay de mensagens REAIS de leads de uma clínica de produção
// (Ximendes, via /api/e2e/production-conversations) contra a clínica de teste isolada
// (E2E_CLINIC_ID, Z-API fake) — valida que o pipeline de IA aguenta frases reais de
// clientes (erros de digitação, gírias, mensagens picadas), não só payloads sintéticos
// escritos à mão nos outros specs. Não compara resposta literal (o playbook da clínica
// de teste é diferente do da Ximendes) — valida que o pipeline responde e classifica
// intent sem travar/silenciar.
test.describe('SystemOps - Replay de conversas reais de produção', () => {
  test.beforeEach(async () => {
    const skipReason = e2eSkipReason();
    if (skipReason) test.skip(true, skipReason);

    if (!systemopsConfig.productionClinicId) {
      test.skip(true, 'SYSTEMOPS_PRODUCTION_CLINIC_ID não configurado — nenhuma clínica real definida como fonte de replay.');
    }
  });

  test('SYS-REPLAY-001 - mensagens reais de leads recebem resposta da IA sem travar o pipeline', async ({ request }) => {
    const sampleSize = Number(process.env.SYSTEMOPS_REPLAY_SAMPLE_SIZE ?? '5') || 5;
    test.setTimeout(Math.max(180_000, sampleSize * 25_000));

    const samples = await fetchRealConversations(request, {
      clinicId: systemopsConfig.productionClinicId!,
      limit: sampleSize,
      messagesPerConversation: 1,
    });

    expect(samples.length).toBeGreaterThan(0);

    const client = new SystemOpsE2eClient(request);
    await client.seed();

    const results: Array<{
      conversationId: string;
      leadMessage: string;
      agentReplied: boolean;
      reply: string;
      judge?: JudgeVerdict;
    }> = [];

    for (const sample of samples) {
      const runId = createRunId(`replay-${sample.conversationId.slice(0, 8)}`);
      const firstMessage = sample.leadMessages[0];

      await client.reset(runId);
      await client.sendLeadMessage(runId, firstMessage, 'replay-lead-msg', undefined);

      try {
        const state = await client.waitForAgentMessage(runId, 1, 30_000);
        results.push({
          conversationId: sample.conversationId,
          leadMessage: firstMessage,
          agentReplied: agentMessageCount(state) >= 1,
          reply: latestAgentMessage(state),
        });
      } catch {
        results.push({ conversationId: sample.conversationId, leadMessage: firstMessage, agentReplied: false, reply: '' });
      } finally {
        await client.reset(runId);
      }
    }

    // LLM-as-judge + camada de especialistas: só rodam com SYSTEMOPS_RUN_LLM_SANDBOX=true
    // (custo extra de LLM por resposta). Score baixo/finding é reportado no relatório —
    // não falha o teste sozinho, quem falha o teste é resposta ausente (regressão dura).
    const allFindings: Finding[] = [];
    if (systemopsConfig.runLlmSandbox) {
      for (const result of results) {
        if (!result.agentReplied) continue;
        result.judge = await judgeAiReply({
          leadMessage: result.leadMessage,
          aiReply: result.reply,
          commercialPolicy: QA_CLINIC_PLAYBOOK.commercialPolicy,
          toneOfVoice: QA_CLINIC_PLAYBOOK.toneOfVoice,
        });

        const specialistFindings = await runConversationSpecialists({
          leadMessage: result.leadMessage,
          aiReply: result.reply,
          commercialPolicy: QA_CLINIC_PLAYBOOK.commercialPolicy,
          toneOfVoice: QA_CLINIC_PLAYBOOK.toneOfVoice,
        });
        allFindings.push(...specialistFindings);
      }
    }

    // eslint-disable-next-line no-console
    console.log('[SYS-REPLAY-001] resultados do replay:', JSON.stringify(results, null, 2));
    // eslint-disable-next-line no-console
    console.log(`[SYS-REPLAY-001] especialistas: ${allFindings.length} findings`, JSON.stringify(allFindings, null, 2));

    const lowQuality = results.filter((r) => r.judge && (r.judge.score < 60 || r.judge.hallucinated));
    for (const r of lowQuality) {
      test.info().annotations.push({
        type: 'finding',
        description: `Qualidade baixa (score ${r.judge!.score}${r.judge!.hallucinated ? ', alucinou preço/condição' : ''}) — lead: "${r.leadMessage}" → IA: "${r.reply}" — ${r.judge!.reasoning}`,
      });
    }
    for (const f of allFindings.filter((f) => f.severity === 'high')) {
      test.info().annotations.push({ type: 'finding', description: `[${f.persona}/${f.severity}] ${f.summary} — ${f.evidence}` });
    }

    if (allFindings.length > 0) {
      writeSpecialistReport(allFindings);
    }

    const unanswered = results.filter((r) => !r.agentReplied);
    // Achado é reportável mesmo se falhar — mensagem real que não recebeu resposta é
    // um sinal direto de bug de produção (lead real ficaria sem resposta no WhatsApp).
    expect(unanswered, `Mensagens reais sem resposta da IA: ${JSON.stringify(unanswered)}`).toHaveLength(0);
  });
});

// Grava o relatório de findings dos especialistas em docs/ai-notes/ — documento de
// sugestões para revisão humana, nunca código de teste gerado automaticamente (Fase
// 3.5 do plano de melhoria contínua: humano no loop antes de qualquer novo assert).
function writeSpecialistReport(findings: Finding[]): void {
  const dir = join(__dirname, '..', '..', '..', '..', 'docs', 'ai-notes');
  mkdirSync(dir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const jsonPath = join(dir, `specialist-findings-${date}.json`);
  const mdPath = join(dir, `specialist-findings-${date}.md`);

  writeFileSync(jsonPath, JSON.stringify(findings, null, 2));

  const bySeverityOrder = ['high', 'medium', 'low'] as const;
  const lines = [
    `# Findings da camada de especialistas — ${date}`,
    '',
    `> Gerado automaticamente por production-replay.spec.ts (SYS-REPLAY-001) + camada de`,
    `> especialistas (core/specialists). ${findings.length} finding(s). Documento de`,
    `> sugestão para revisão humana — nenhum teste/código foi gerado automaticamente.`,
    '',
  ];

  for (const severity of bySeverityOrder) {
    const group = findings.filter((f) => f.severity === severity);
    if (group.length === 0) continue;
    lines.push(`## Severidade: ${severity} (${group.length})`, '');
    for (const f of group) {
      lines.push(`### [${f.persona}] ${f.summary}`, '', `- **Categoria:** ${f.category}`, `- **Evidência:** ${f.evidence}`, `- **Sugestão:** ${f.suggestion}`, '');
    }
  }

  writeFileSync(mdPath, lines.join('\n'));
  // eslint-disable-next-line no-console
  console.log(`[SYS-REPLAY-001] relatório de especialistas gravado em ${mdPath}`);
}
