import type { ReplayScenarioRun } from './e2eClient';

export type ReplayBehaviorContract = {
  mediaSequence: Array<{
    mediaType: string;
    captionIncludes: string;
  }>;
  requireImmediateMediaPair: boolean;
  requireVariantSelectionTrace: boolean;
};

type OutboundEffect = {
  kind?: unknown;
  mediaType?: unknown;
  mediaRef?: unknown;
  caption?: unknown;
  sequence?: unknown;
};

export function loadReplayBehaviorContract(
  env: NodeJS.ProcessEnv,
): ReplayBehaviorContract | null {
  const sequence = env.SYSTEMOPS_REPLAY_EXPECT_MEDIA_SEQUENCE?.trim();
  const requireImmediateMediaPair =
    env.SYSTEMOPS_REPLAY_EXPECT_IMMEDIATE_MEDIA_PAIR === 'true';
  const requireVariantSelectionTrace =
    env.SYSTEMOPS_REPLAY_EXPECT_VARIANT_SELECTION === 'true';
  if (!sequence && !requireImmediateMediaPair && !requireVariantSelectionTrace) {
    return null;
  }
  if (!sequence) {
    throw new Error(
      'SYSTEMOPS_REPLAY_EXPECT_MEDIA_SEQUENCE is required when a media behavior contract is enabled.',
    );
  }

  const mediaSequence = sequence.split(',').map((rawEntry) => {
    const [mediaType, ...captionParts] = rawEntry.split(':');
    const captionIncludes = captionParts.join(':').trim();
    if (!mediaType?.trim() || !captionIncludes) {
      throw new Error(
        'SYSTEMOPS_REPLAY_EXPECT_MEDIA_SEQUENCE must use "type:caption,type:caption".',
      );
    }
    return {
      mediaType: mediaType.trim().toLowerCase(),
      captionIncludes: captionIncludes.toLocaleLowerCase('pt-BR'),
    };
  });

  return {
    mediaSequence,
    requireImmediateMediaPair,
    requireVariantSelectionTrace,
  };
}

export function applyReplayBehaviorContract(
  run: ReplayScenarioRun,
  contract: ReplayBehaviorContract | null,
): ReplayScenarioRun {
  if (!contract) return run;
  const outbound = run.effects.outbound.filter(isOutboundEffect);
  const media = outbound.filter(
    (effect) => effect.kind === 'media',
  );
  const mediaMatches =
    media.length === contract.mediaSequence.length &&
    media.every((effect, index) => {
      const expected = contract.mediaSequence[index]!;
      return (
        normalized(effect.mediaType) === expected.mediaType &&
        normalized(effect.caption).includes(expected.captionIncludes)
      );
    });
  const mediaRefs = media
    .map((effect) => normalized(effect.mediaRef))
    .filter(Boolean);
  const uniqueMedia = new Set(mediaRefs).size === mediaRefs.length;
  const sequences = media.map((effect) =>
    typeof effect.sequence === 'number' ? effect.sequence : Number.NaN,
  );
  const orderedMedia =
    sequences.every(Number.isFinite) &&
    sequences.every((sequence, index) =>
      index === 0 || sequence > sequences[index - 1]!,
    );

  const firstTextIndex = outbound.findIndex((effect) => effect.kind === 'text');
  const firstMediaIndex = outbound.findIndex((effect) => effect.kind === 'media');
  const immediatePair =
    !contract.requireImmediateMediaPair ||
    (
      firstTextIndex === 0 &&
      firstMediaIndex === 1 &&
      contract.mediaSequence.every(
        (_, index) => outbound[firstMediaIndex + index]?.kind === 'media',
      )
    );

  const variantTrace = run.trace.find((event) =>
    event.stage === 'state.before_delivery' &&
    typeof event.metadata?.pipelineTreatmentId === 'string' &&
    typeof event.metadata?.selectedTreatmentId === 'string' &&
    event.metadata.pipelineTreatmentId !== event.metadata.selectedTreatmentId,
  );
  const selectedVariant =
    !contract.requireVariantSelectionTrace || Boolean(variantTrace);

  return {
    ...run,
    checks: [
      ...run.checks,
      {
        code: 'expected_media_sequence_exactly_once',
        passed: mediaMatches,
      },
      {
        code: 'expected_media_unique_and_ordered',
        passed: uniqueMedia && orderedMedia,
      },
      {
        code: 'expected_immediate_media_pair',
        passed: immediatePair,
      },
      {
        code: 'expected_variant_selection_trace',
        passed: selectedVariant,
      },
    ],
  };
}

function isOutboundEffect(value: unknown): value is OutboundEffect {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalized(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLocaleLowerCase('pt-BR')
    : '';
}
