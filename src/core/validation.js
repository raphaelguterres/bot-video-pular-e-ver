const fs = require("fs");

const TIME_LIMITS = Object.freeze({
  pollIntervalMs: [250, 60000],
  autoAdvanceWaitMs: [1000, 120000],
  nonVideoWaitMs: [5000, 600000],
});

function isHttpUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function isValidSelector(selector) {
  return typeof selector === "string" && selector.trim().length > 0;
}

function validateNumberRange(name, value, min, max, label, errors) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    errors.push(`${label} precisa estar entre ${min} e ${max}.`);
  }
}

function validateConfig(config = {}, options = {}) {
  const errors = [];

  if (options.requireStartUrl !== false) {
    if (!config.startUrl || !isHttpUrl(config.startUrl)) {
      errors.push("Informe uma URL inicial valida começando com http:// ou https://.");
    }
  }

  if (!config.browserCdpUrl || !isHttpUrl(config.browserCdpUrl)) {
    errors.push("Informe uma URL CDP valida, como http://127.0.0.1:9222.");
  }

  validateNumberRange("playbackRate", config.playbackRate, 0.25, 4, "A velocidade", errors);

  for (const [key, [min, max]] of Object.entries(TIME_LIMITS)) {
    validateNumberRange(key, config[key], min, max, key, errors);
  }

  if (!isValidSelector(config.videoSelector)) {
    errors.push("Informe um seletor CSS de video valido.");
  }

  if (
    config.browserExecutablePath &&
    !config.useExistingBrowser &&
    !fs.existsSync(config.browserExecutablePath)
  ) {
    errors.push(`Nao encontrei o Brave em: ${config.browserExecutablePath}`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function assertValidConfig(config, options) {
  const validation = validateConfig(config, options);
  if (!validation.ok) {
    const error = new Error(validation.errors[0]);
    error.name = "ConfigValidationError";
    error.errors = validation.errors;
    throw error;
  }

  return config;
}

function assertValidPlaybackRate(playbackRate) {
  const parsedRate = Number(playbackRate);
  if (!Number.isFinite(parsedRate) || parsedRate < 0.25 || parsedRate > 4) {
    throw new Error("A velocidade precisa estar entre 0.25x e 4x.");
  }

  return parsedRate;
}

module.exports = {
  TIME_LIMITS,
  assertValidConfig,
  assertValidPlaybackRate,
  isHttpUrl,
  validateConfig,
};
