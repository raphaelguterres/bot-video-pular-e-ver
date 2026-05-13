const test = require("node:test");
const assert = require("node:assert/strict");
const { validateConfig, assertValidPlaybackRate } = require("../src/core/validation");
const { normalizeConfig } = require("../src/core/config");

test("validateConfig rejeita URL inicial invalida", () => {
  const config = normalizeConfig({ startUrl: "nota-url" });
  const result = validateConfig(config);

  assert.equal(result.ok, false);
  assert.match(result.errors[0], /URL inicial valida/);
});

test("validateConfig aceita configuracao minima valida", () => {
  const config = normalizeConfig({
    startUrl: "https://www.coursera.org/learn/demo/lecture/abc/intro",
  });
  const result = validateConfig(config);

  assert.equal(result.ok, true);
});

test("assertValidPlaybackRate limita velocidade", () => {
  assert.equal(assertValidPlaybackRate(1.5), 1.5);
  assert.throws(() => assertValidPlaybackRate(9), /velocidade/);
});
