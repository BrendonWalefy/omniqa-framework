import type { ReplayScenarioRun } from './e2eClient';

export type ReplayBehaviorContract = {
  mediaSequence: Array<{
    mediaType: string;
    captionIncludes: string;
  }>;
  requireImmediateMediaPair: boolean;
  requireVariantSelectionTrace: boolean;
  expectedSelectedTreatmentIncludes: string | null;
  expectedTextAfterMediaIncludes: string[];
  requireNoTreatmentSelection: boolean;
  requireNoMedia: boolean;
};

type OutboundEffect = {
  kind?: unknown;
  content?: unknown;
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
  const expectedSelectedTreatmentIncludes =
    env.SYSTEMOPS_REPLAY_EXPECT_SELECTED_TREATMENT?.trim() || null;
  const expectedTextAfterMediaIncludes =
    env.SYSTEMOPS_REPLAY_EXPECT_TEXT_AFTER_MEDIA
      ?.split('|')
      .map((value) => value.trim().toLocaleLowerCase('pt-BR'))
      .filter(Boolean) ?? [];
  const requireNoTreatmentSelection =
    env.SYSTEMOPS_REPLAY_EXPECT_NO_TREATMENT_SELECTION === 'true';
  const requireNoMedia =
    env.SYSTEMOPS_REPLAY_EXPECT_NO_MEDIA === 'true';
  if (
    !sequence &&
    !requireImmediateMediaPair &&
    !requireVariantSelectionTrace &&
    !expectedSelectedTreatmentIncludes &&
    expectedTextAfterMediaIncludes.length === 0 &&
    !requireNoTreatmentSelection &&
    !requireNoMedia
  ) {
    return null;
  }
  if (!sequence && requireImmediateMediaPair) {
    throw new Error(
      'SYSTEMOPS_REPLAY_EXPECT_MEDIA_SEQUENCE is required for the immediate media-pair contract.',
    );
  }

  const mediaSequence = (sequence ?? '').split(',').filter(Boolean).map((rawEntry) => {
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
    expectedSelectedTreatmentIncludes:
      expectedSelectedTreatmentIncludes?.toLocaleLowerCase('pt-BR') ?? null,
    expectedTextAfterMediaIncludes,
    requireNoTreatmentSelection,
    requireNoMedia,
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
  const expectedMediaIndexes = contract.mediaSequence.map((expected) =>
    outbound.flatMap((effect, index) =>
      matchesExpectedMedia(effect, expected) ? [index] : [],
    ),
  );
  const mediaMatches =
    expectedMediaIndexes.every((indexes) => indexes.length === 1) &&
    expectedMediaIndexes.every(
      (indexes, index) =>
        index === 0 || indexes[0]! > expectedMediaIndexes[index - 1]![0]!,
    );
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

  const firstExpectedMediaIndex = expectedMediaIndexes[0]?.[0] ?? -1;
  const immediatePair =
    !contract.requireImmediateMediaPair ||
    (
      firstExpectedMediaIndex > 0 &&
      outbound[firstExpectedMediaIndex - 1]?.kind === 'text' &&
      contract.mediaSequence.every(
        (expected, index) =>
          matchesExpectedMedia(
            outbound[firstExpectedMediaIndex + index],
            expected,
          ),
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
  const selectedTreatmentTrace = contract.expectedSelectedTreatmentIncludes
    ? run.trace.find((event) =>
        event.stage === 'treatment.resolved' &&
        normalized(event.metadata?.selectedTreatmentName).includes(
          contract.expectedSelectedTreatmentIncludes!,
        ),
      )
    : null;
  const lastExpectedMediaIndex =
    expectedMediaIndexes.at(-1)?.[0] ?? -1;
  const expectedTextIndexes = contract.expectedTextAfterMediaIncludes.length > 0
    ? outbound.flatMap((effect, index) => {
        const content = normalized(effect.content);
        return effect.kind === 'text' &&
          contract.expectedTextAfterMediaIncludes.every((fragment) =>
            content.includes(fragment)
          )
          ? [index]
          : [];
      })
    : [];
  const expectedTextAfterMedia =
    contract.expectedTextAfterMediaIncludes.length === 0 ||
    (
      expectedTextIndexes.length === 1 &&
      lastExpectedMediaIndex >= 0 &&
      expectedTextIndexes[0] === lastExpectedMediaIndex + 1
    );

  return {
    ...run,
    checks: [
      ...run.checks,
      ...(contract.mediaSequence.length > 0
        ? [
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
          ]
        : []),
      ...(contract.requireVariantSelectionTrace
        ? [{
            code: 'expected_variant_selection_trace',
            passed: selectedVariant,
          }]
        : []),
      ...(contract.expectedSelectedTreatmentIncludes
        ? [{
            code: 'expected_selected_treatment_trace',
            passed: Boolean(selectedTreatmentTrace),
          }]
        : []),
      ...(contract.expectedTextAfterMediaIncludes.length > 0
        ? [{
            code: 'expected_text_immediately_after_media_exactly_once',
            passed: expectedTextAfterMedia,
          }]
        : []),
      ...(contract.requireNoTreatmentSelection
        ? [{
            code: 'expected_no_treatment_selection',
            passed: !run.trace.some(
              (event) => event.stage === 'treatment.resolved',
            ),
          }]
        : []),
      ...(contract.requireNoMedia
        ? [{
            code: 'expected_no_media',
            passed: media.length === 0,
          }]
        : []),
    ],
  };
}

function isOutboundEffect(value: unknown): value is OutboundEffect {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function matchesExpectedMedia(
  effect: OutboundEffect | undefined,
  expected: ReplayBehaviorContract['mediaSequence'][number],
): boolean {
  return Boolean(
    effect?.kind === 'media' &&
    normalized(effect.mediaType) === expected.mediaType &&
    normalized(effect.caption).includes(expected.captionIncludes),
  );
}

function normalized(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLocaleLowerCase('pt-BR')
    : '';
}
