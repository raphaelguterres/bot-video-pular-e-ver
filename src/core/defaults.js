const DEFAULT_NEXT_BUTTON_SELECTORS = [
  "button[aria-label*='Proximo' i]",
  "button[aria-label*='Próximo' i]",
  "button[aria-label*='Next' i]",
  "a[aria-label*='Proximo' i]",
  "a[aria-label*='Próximo' i]",
  "a[aria-label*='Next' i]",
  "button[data-testid*='next' i]",
  "a[data-testid*='next' i]",
  ".next",
  ".next-button",
];

const DEFAULT_COMPLETION_BUTTON_SELECTORS = [
  "button:has-text('Mark as complete')",
  "button:has-text('Mark complete')",
  "button:has-text('Complete')",
  "button:has-text('Concluir')",
  "button:has-text('Marcar como concluido')",
  "button:has-text('Marcar como concluído')",
  "button[aria-label*='complete' i]",
  "button[aria-label*='concluir' i]",
];

const DEFAULT_ASSESSMENT_KEYWORDS = [
  "assessment",
  "assignment",
  "exam",
  "graded",
  "quiz",
  "questionario",
  "questionário",
  "prova",
  "avaliacao",
  "avaliação",
  "teste",
  "pergunta",
  "questao",
  "questão",
];

function getDefaultBravePath(platform = process.platform, env = process.env) {
  const candidatesByPlatform = {
    win32: [
      `${env.ProgramFiles || "C:\\Program Files"}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${env["ProgramFiles(x86)"] || "C:\\Program Files (x86)"}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      `${env.LOCALAPPDATA || ""}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    ],
    darwin: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
    linux: [
      "/usr/bin/brave-browser",
      "/usr/bin/brave",
      "/usr/bin/brave-browser-stable",
      "/snap/bin/brave",
    ],
  };

  return (candidatesByPlatform[platform] || candidatesByPlatform.linux)[0];
}

const DEFAULT_CONFIG = {
  startUrl: "",
  headless: false,
  platformPreset: "coursera",
  useExistingBrowser: true,
  browserCdpUrl: "http://127.0.0.1:9222",
  browserExecutablePath: getDefaultBravePath(),
  browserChannel: null,
  pollIntervalMs: 1000,
  autoAdvanceWaitMs: 8000,
  autoAdvanceNonVideo: true,
  nonVideoWaitMs: 45000,
  videoSelector: "video",
  playbackRate: 1,
  stopOnAssessment: true,
  assessmentKeywords: DEFAULT_ASSESSMENT_KEYWORDS,
  nextButtonSelectors: DEFAULT_NEXT_BUTTON_SELECTORS,
  completionButtonSelectors: DEFAULT_COMPLETION_BUTTON_SELECTORS,
};

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_ASSESSMENT_KEYWORDS,
  DEFAULT_COMPLETION_BUTTON_SELECTORS,
  DEFAULT_NEXT_BUTTON_SELECTORS,
  getDefaultBravePath,
};
