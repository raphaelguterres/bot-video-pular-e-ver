const {
  DEFAULT_ASSESSMENT_KEYWORDS,
  DEFAULT_COMPLETION_BUTTON_SELECTORS,
  DEFAULT_NEXT_BUTTON_SELECTORS,
} = require("./defaults");

const PRESETS = {
  custom: {
    id: "custom",
    name: "Personalizado",
  },
  coursera: {
    id: "coursera",
    name: "Coursera",
    videoSelector: "video",
    autoAdvanceWaitMs: 10000,
    autoAdvanceNonVideo: true,
    nonVideoWaitMs: 45000,
    nextButtonSelectors: [
      "button[aria-label*='Next' i]",
      "button[aria-label*='Proximo' i]",
      "button[aria-label*='Próximo' i]",
      "a[aria-label*='Next' i]",
      "a[aria-label*='Proximo' i]",
      "a[aria-label*='Próximo' i]",
      "button[data-testid*='next' i]",
      "a[data-testid*='next' i]",
      "a[href*='/lecture/'][aria-label*='Next' i]",
      "button:has-text('Next')",
      "button:has-text('Próximo')",
      "a:has-text('Next')",
      "a:has-text('Próximo')",
      ...DEFAULT_NEXT_BUTTON_SELECTORS,
    ],
    completionButtonSelectors: [
      "button:has-text('Mark as complete')",
      "button:has-text('Complete item')",
      "button:has-text('Concluir')",
      "button:has-text('Marcar como concluido')",
      "button:has-text('Marcar como concluído')",
      ...DEFAULT_COMPLETION_BUTTON_SELECTORS,
    ],
    assessmentKeywords: [
      ...DEFAULT_ASSESSMENT_KEYWORDS,
      "graded quiz",
      "practice quiz",
      "module quiz",
      "peer-graded",
      "peer reviewed",
      "programming assignment",
      "submit assignment",
      "start assignment",
      "quiz do modulo",
      "questionario do modulo",
      "avaliacao do modulo",
    ],
  },
};

function getPreset(presetId) {
  return PRESETS[presetId] || PRESETS.custom;
}

function listPresets() {
  return Object.values(PRESETS).map(({ id, name }) => ({ id, name }));
}

function mergeUnique(base = [], extra = []) {
  return Array.from(new Set([...base, ...extra].filter(Boolean)));
}

function applyPreset(input = {}) {
  const platformPreset = input.platformPreset || "coursera";
  const preset = getPreset(platformPreset);

  if (preset.id === "custom") {
    return {
      ...input,
      platformPreset,
    };
  }

  return {
    ...preset,
    ...input,
    platformPreset,
    videoSelector: input.videoSelector || preset.videoSelector,
    autoAdvanceWaitMs: input.autoAdvanceWaitMs || preset.autoAdvanceWaitMs,
    autoAdvanceNonVideo:
      input.autoAdvanceNonVideo === undefined
        ? preset.autoAdvanceNonVideo
        : input.autoAdvanceNonVideo,
    nonVideoWaitMs: input.nonVideoWaitMs || preset.nonVideoWaitMs,
    nextButtonSelectors: mergeUnique(
      input.nextButtonSelectors || preset.nextButtonSelectors,
      preset.nextButtonSelectors
    ),
    completionButtonSelectors: mergeUnique(
      input.completionButtonSelectors || preset.completionButtonSelectors,
      preset.completionButtonSelectors
    ),
    assessmentKeywords: mergeUnique(
      input.assessmentKeywords || preset.assessmentKeywords,
      preset.assessmentKeywords
    ),
  };
}

module.exports = {
  PRESETS,
  applyPreset,
  getPreset,
  listPresets,
};
