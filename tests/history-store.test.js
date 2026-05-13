const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { HistoryStore } = require("../src/core/history-store");

function makeStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "video-bot-history-"));
  return {
    dir,
    store: new HistoryStore(path.join(dir, "history.json")),
  };
}

test("HistoryStore registra progresso e conclusao", () => {
  const { dir, store } = makeStore();
  const session = store.createSession({
    startUrl: "https://example.com/aula",
    platformPreset: "coursera",
  });

  store.recordLessonSeen(session.id, "lesson-1", {
    pageTitle: "Layer 4 | Coursera",
    pageUrl: "https://example.com/aula?x=1",
    duration: 420,
  });
  store.updateLessonProgress(session.id, "lesson-1", {
    currentTime: 120,
    duration: 420,
  });
  store.completeLesson(session.id, "lesson-1");

  const summary = store.getSummary(session.id);
  assert.equal(summary.totals.completedLessons, 1);
  assert.equal(summary.totals.totalSeconds, 420);

  fs.rmSync(dir, { recursive: true, force: true });
});

test("HistoryStore compacta titulos temporarios por URL", () => {
  const { dir, store } = makeStore();
  const session = store.createSession({
    startUrl: "https://example.com/aula",
    platformPreset: "coursera",
  });

  store.recordLessonSeen(session.id, "https://example.com/aula", {
    pageTitle: "CISSP Home - Semana week | Coursera",
    pageUrl: "https://example.com/aula?x=1",
  });
  store.recordLessonSeen(session.id, "https://example.com/aula", {
    pageTitle: "Layer 4 | Coursera",
    pageUrl: "https://example.com/aula?x=2",
  });

  const summary = store.getSummary(session.id);
  assert.equal(summary.totals.lessons, 1);
  assert.equal(summary.recentLessons[0].title, "Layer 4 | Coursera");

  fs.rmSync(dir, { recursive: true, force: true });
});
