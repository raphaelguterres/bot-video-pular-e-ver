const fs = require("fs");
const path = require("path");
const { DEFAULT_CONFIG } = require("./defaults");
const { applyPreset } = require("./presets");

function readBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "sim"].includes(String(value).toLowerCase());
}

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readClampedNumber(value, fallback, min, max) {
  const parsed = readNumber(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeConfig(input = {}, env = process.env) {
  const presetInput = applyPreset(input);
  const browserExecutablePath =
    env.BROWSER_EXECUTABLE_PATH ||
    presetInput.browserExecutablePath ||
    DEFAULT_CONFIG.browserExecutablePath;
  const browserChannel =
    env.BROWSER_CHANNEL ||
    presetInput.browserChannel ||
    (browserExecutablePath ? null : DEFAULT_CONFIG.browserChannel);

  return {
    ...DEFAULT_CONFIG,
    ...presetInput,
    platformPreset: presetInput.platformPreset || DEFAULT_CONFIG.platformPreset,
    startUrl: env.START_URL || presetInput.startUrl || DEFAULT_CONFIG.startUrl,
    headless: readBoolean(env.HEADLESS, readBoolean(presetInput.headless, DEFAULT_CONFIG.headless)),
    useExistingBrowser: readBoolean(
      env.USE_EXISTING_BROWSER,
      readBoolean(presetInput.useExistingBrowser, DEFAULT_CONFIG.useExistingBrowser)
    ),
    pollIntervalMs: readClampedNumber(presetInput.pollIntervalMs, DEFAULT_CONFIG.pollIntervalMs, 250, 60000),
    autoAdvanceWaitMs: readClampedNumber(
      presetInput.autoAdvanceWaitMs,
      DEFAULT_CONFIG.autoAdvanceWaitMs,
      1000,
      120000
    ),
    autoAdvanceNonVideo: readBoolean(
      presetInput.autoAdvanceNonVideo,
      DEFAULT_CONFIG.autoAdvanceNonVideo
    ),
    nonVideoWaitMs: readClampedNumber(
      presetInput.nonVideoWaitMs,
      DEFAULT_CONFIG.nonVideoWaitMs,
      5000,
      600000
    ),
    playbackRate: readClampedNumber(presetInput.playbackRate, DEFAULT_CONFIG.playbackRate, 0.25, 4),
    stopOnAssessment: readBoolean(presetInput.stopOnAssessment, DEFAULT_CONFIG.stopOnAssessment),
    simulationMode: readBoolean(presetInput.simulationMode, DEFAULT_CONFIG.simulationMode),
    browserCdpUrl: env.BROWSER_CDP_URL || presetInput.browserCdpUrl || DEFAULT_CONFIG.browserCdpUrl,
    browserExecutablePath,
    browserChannel,
    videoSelector: presetInput.videoSelector || DEFAULT_CONFIG.videoSelector,
    nextButtonSelectors: Array.isArray(presetInput.nextButtonSelectors)
      ? presetInput.nextButtonSelectors
      : DEFAULT_CONFIG.nextButtonSelectors,
    completionButtonSelectors: Array.isArray(presetInput.completionButtonSelectors)
      ? presetInput.completionButtonSelectors
      : DEFAULT_CONFIG.completionButtonSelectors,
    assessmentKeywords: Array.isArray(presetInput.assessmentKeywords)
      ? presetInput.assessmentKeywords
      : DEFAULT_CONFIG.assessmentKeywords,
  };
}

function loadConfigFromWorkspace(cwd = process.cwd()) {
  const configPath = path.resolve(cwd, "config.json");
  const exampleConfigPath = path.resolve(cwd, "config.example.json");
  const rawConfig = fs.existsSync(configPath)
    ? readJsonIfExists(configPath)
    : readJsonIfExists(exampleConfigPath);

  return normalizeConfig(rawConfig);
}

module.exports = {
  loadConfigFromWorkspace,
  normalizeConfig,
  readBoolean,
  readJsonIfExists,
};
