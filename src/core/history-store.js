const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function createEmptyHistory() {
  return {
    version: 1,
    sessions: [],
  };
}

function normalizeLessonState(state = {}) {
  return {
    title: state.pageTitle || state.title || "Sem titulo",
    url: state.pageUrl || state.url || "",
    src: state.src || "",
    duration: Number.isFinite(state.duration) ? state.duration : null,
  };
}

function normalizeUrl(url = "") {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    return String(url).split("#")[0].split("?")[0];
  }
}

function isBetterTitle(nextTitle = "", currentTitle = "") {
  if (!nextTitle) {
    return false;
  }

  if (!currentTitle || currentTitle === "Sem titulo") {
    return true;
  }

  const currentIsPlaceholder = /coursera/i.test(currentTitle) && /(home|semana|week)/i.test(currentTitle);
  const nextIsPlaceholder = /coursera/i.test(nextTitle) && /(home|semana|week)/i.test(nextTitle);
  return currentIsPlaceholder && !nextIsPlaceholder;
}

function compactLessons(lessons = []) {
  const byUrl = new Map();

  for (const lesson of lessons) {
    const key = normalizeUrl(lesson.url || lesson.key);
    const existing = byUrl.get(key);

    if (!existing) {
      byUrl.set(key, { ...lesson });
      continue;
    }

    byUrl.set(key, {
      ...existing,
      ...lesson,
      title: isBetterTitle(lesson.title, existing.title) ? lesson.title : existing.title,
      firstSeenAt: existing.firstSeenAt || lesson.firstSeenAt,
      lastSeenAt: lesson.lastSeenAt || existing.lastSeenAt,
      completedAt: existing.completedAt || lesson.completedAt,
      maxCurrentTime: Math.max(existing.maxCurrentTime || 0, lesson.maxCurrentTime || 0),
      duration: Number.isFinite(lesson.duration) ? lesson.duration : existing.duration,
    });
  }

  return Array.from(byUrl.values());
}

class HistoryStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    return readJson(this.filePath, createEmptyHistory());
  }

  save(data) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  createSession(config = {}) {
    const data = this.load();
    const session = {
      id: randomUUID(),
      status: "running",
      startedAt: nowIso(),
      endedAt: null,
      platformPreset: config.platformPreset || "custom",
      startUrl: config.startUrl || "",
      playbackRate: config.playbackRate || 1,
      completedVideos: 0,
      lastUrl: config.startUrl || "",
      lessons: [],
      assessments: [],
    };

    data.sessions.unshift(session);
    data.sessions = data.sessions.slice(0, 40);
    this.save(data);
    return session;
  }

  updateSession(sessionId, patch = {}) {
    const data = this.load();
    const session = data.sessions.find((item) => item.id === sessionId);
    if (!session) {
      return null;
    }

    Object.assign(session, patch);
    this.save(data);
    return session;
  }

  recordLessonSeen(sessionId, lessonKey, state = {}, playbackRate = 1) {
    const data = this.load();
    const session = data.sessions.find((item) => item.id === sessionId);
    if (!session || !lessonKey) {
      return null;
    }

    const lessonState = normalizeLessonState(state);
    let lesson = session.lessons.find((item) => item.key === lessonKey);

    if (!lesson) {
      lesson = {
        key: lessonKey,
        ...lessonState,
        firstSeenAt: nowIso(),
        lastSeenAt: nowIso(),
        completedAt: null,
        maxCurrentTime: 0,
        playbackRate,
      };
      session.lessons.push(lesson);
    } else {
      Object.assign(lesson, {
        ...lessonState,
        title: isBetterTitle(lessonState.title, lesson.title) ? lessonState.title : lesson.title,
        lastSeenAt: nowIso(),
        playbackRate,
      });
    }

    session.lastUrl = lesson.url || session.lastUrl;
    this.save(data);
    return lesson;
  }

  updateLessonProgress(sessionId, lessonKey, progress = {}) {
    const data = this.load();
    const session = data.sessions.find((item) => item.id === sessionId);
    const lesson = session?.lessons.find((item) => item.key === lessonKey);
    if (!lesson) {
      return null;
    }

    const currentTime = Number(progress.currentTime || 0);
    lesson.maxCurrentTime = Math.max(lesson.maxCurrentTime || 0, currentTime);
    lesson.duration = Number.isFinite(progress.duration) ? progress.duration : lesson.duration;
    lesson.lastSeenAt = nowIso();
    this.save(data);
    return lesson;
  }

  completeLesson(sessionId, lessonKey) {
    const data = this.load();
    const session = data.sessions.find((item) => item.id === sessionId);
    const lesson = session?.lessons.find((item) => item.key === lessonKey);
    if (!session || !lesson) {
      return null;
    }

    if (!lesson.completedAt) {
      lesson.completedAt = nowIso();
      session.completedVideos = (session.completedVideos || 0) + 1;
    }

    session.lastUrl = lesson.url || session.lastUrl;
    this.save(data);
    return lesson;
  }

  recordAssessment(sessionId, assessment = {}) {
    const data = this.load();
    const session = data.sessions.find((item) => item.id === sessionId);
    if (!session) {
      return null;
    }

    const existing = session.assessments.find((item) => item.url === assessment.url);
    const entry = {
      detectedAt: nowIso(),
      title: assessment.title || "Avaliacao detectada",
      url: assessment.url || "",
      confidence: assessment.confidence || 0,
      reasons: assessment.reasons || [],
    };

    if (existing) {
      Object.assign(existing, entry);
    } else {
      session.assessments.push(entry);
    }

    session.status = "assessment";
    session.endedAt = nowIso();
    this.save(data);
    return entry;
  }

  finishSession(sessionId, status = "finished") {
    return this.updateSession(sessionId, {
      status,
      endedAt: nowIso(),
    });
  }

  getSession(sessionId) {
    const data = this.load();
    return data.sessions.find((item) => item.id === sessionId) || null;
  }

  getSummary(sessionId = null) {
    const data = this.load();
    const session = sessionId
      ? data.sessions.find((item) => item.id === sessionId)
      : data.sessions[0];
    const lessons = compactLessons(session?.lessons || []);
    const completedLessons = lessons.filter((lesson) => lesson.completedAt);
    const totalSeconds = completedLessons.reduce((sum, lesson) => {
      if (Number.isFinite(lesson.duration)) {
        return sum + lesson.duration;
      }
      return sum + (lesson.maxCurrentTime || 0);
    }, 0);

    return {
      totalSessions: data.sessions.length,
      activeSession: session || null,
      totals: {
        lessons: lessons.length,
        completedLessons: completedLessons.length,
        assessments: session?.assessments?.length || 0,
        totalSeconds,
      },
      recentLessons: lessons.slice(-8).reverse(),
      recentSessions: data.sessions.slice(0, 8).map((item) => ({
        id: item.id,
        status: item.status,
        startedAt: item.startedAt,
        endedAt: item.endedAt,
        startUrl: item.startUrl,
        platformPreset: item.platformPreset,
        completedVideos: item.completedVideos,
      })),
    };
  }
}

module.exports = {
  HistoryStore,
};
