const test = require("node:test");
const assert = require("node:assert/strict");
const { createAssessmentPattern } = require("../src/platforms/generic.adapter");
const { getPlatformAdapter } = require("../src/platforms");

test("createAssessmentPattern escapa palavras-chave", () => {
  const pattern = createAssessmentPattern(["quiz", "prova final"]);

  assert.equal(pattern.test("Module quiz"), true);
  assert.equal(pattern.test("prova final"), true);
  assert.equal(pattern.test("lecture"), false);
});

test("getPlatformAdapter escolhe Coursera e fallback generico", () => {
  assert.equal(typeof getPlatformAdapter("coursera").detectLesson, "function");
  assert.equal(typeof getPlatformAdapter("custom").detectLesson, "function");
});
