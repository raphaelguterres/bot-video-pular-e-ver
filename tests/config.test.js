const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeConfig } = require("../src/core/config");

test("normalizeConfig aplica defaults e preset Coursera", () => {
  const config = normalizeConfig({
    startUrl: "https://www.coursera.org/learn/demo/lecture/abc/intro",
    playbackRate: 9,
  });

  assert.equal(config.platformPreset, "coursera");
  assert.equal(config.videoSelector, "video");
  assert.equal(config.playbackRate, 4);
  assert.equal(config.autoAdvanceNonVideo, true);
});

test("normalizeConfig preserva modo simulacao", () => {
  const config = normalizeConfig({
    startUrl: "https://example.com/course",
    simulationMode: true,
  });

  assert.equal(config.simulationMode, true);
});
