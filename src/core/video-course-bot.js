const fs = require("fs");
const EventEmitter = require("events");
const { chromium } = require("playwright");
const { getBraveDebugCommand, getCdpStatus } = require("./brave");
const { normalizeConfig } = require("./config");
const { buildStudyGuide } = require("./study-guide");

const BRAVE_ALREADY_RUNNING_HINT =
  "Se o Brave ja estava aberto, esse comando nao ativa a porta no processo existente. Feche todas as janelas do Brave e confirme se nao sobrou brave.exe no Gerenciador de Tarefas antes de abrir de novo.";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSeconds(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes}min`;
}

function getVideoKey(state) {
  if (!state.found) {
    return null;
  }

  return [state.pageUrl || "", state.pageTitle || "", state.src || ""].join(" | ");
}

function normalizeLessonUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    return url.split("#")[0].split("?")[0];
  }
}

function getLessonKey(state) {
  if (!state?.pageUrl && !state?.url) {
    return null;
  }

  return normalizeLessonUrl(state.pageUrl || state.url);
}

function isPlaceholderCourseraTitle(title = "") {
  return /coursera/i.test(title) && /(home|semana|week)/i.test(title);
}

function formatVideoLabel(state) {
  if (!state.pageTitle) {
    return state.pageUrl;
  }

  return `${state.pageTitle} (${state.pageUrl})`;
}

function isVideoEnded(state) {
  return Boolean(
    state.ended ||
      (state.duration !== null &&
        state.duration > 0 &&
        state.duration - state.currentTime <= 0.5)
  );
}

function hasVideoChanged(before, after) {
  return Boolean(
    before.pageUrl !== after.pageUrl ||
      before.pageTitle !== after.pageTitle ||
      (before.src && after.src && before.src !== after.src)
  );
}

function createAssessmentPattern(keywords) {
  const escaped = keywords
    .filter(Boolean)
    .map((keyword) => String(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escaped.length === 0) {
    return /$a/i;
  }

  return new RegExp(`(${escaped.join("|")})`, "i");
}

class VideoCourseBot extends EventEmitter {
  constructor(initialConfig = {}, options = {}) {
    super();
    this.config = normalizeConfig(initialConfig);
    this.historyStore = options.historyStore || null;
    this.historySessionId = null;
    this.browser = null;
    this.page = null;
    this.ownsBrowser = false;
    this.running = false;
    this.loopPromise = null;
    this.handledEndedCount = 0;
    this.handledVideoKeys = new Set();
    this.completedVideos = 0;
    this.lastVideoKey = null;
    this.lastLessonKey = null;
    this.lastProgressKey = null;
    this.lastHistoryProgressKey = null;
    this.currentLessonReady = false;
    this.lastCompletedVideoSrc = null;
    this.activeNonVideoKey = null;
    this.nonVideoStartedAt = 0;
    this.handledNonVideoKeys = new Set();
    this.lastNonVideoStatusKey = null;
  }

  emitEvent(type, payload = {}) {
    this.emit("event", {
      type,
      at: new Date().toISOString(),
      ...payload,
    });
  }

  emitStatus(status, message, extra = {}) {
    this.emitEvent("status", { status, message, ...extra });
  }

  emitLog(message, level = "info", extra = {}) {
    this.emitEvent("log", { level, message, ...extra });
  }

  async start(options = {}) {
    if (this.running) {
      throw new Error("O bot ja esta em execucao.");
    }

    this.config = normalizeConfig({ ...this.config, ...options });
    if (!this.config.startUrl || this.config.startUrl.includes("exemplo.com")) {
      throw new Error("Informe a URL inicial do video ou curso.");
    }

    this.handledEndedCount = 0;
    this.handledVideoKeys = new Set();
    this.completedVideos = 0;
    this.lastVideoKey = null;
    this.lastLessonKey = null;
    this.lastProgressKey = null;
    this.lastHistoryProgressKey = null;
    this.currentLessonReady = false;
    this.lastCompletedVideoSrc = null;
    this.activeNonVideoKey = null;
    this.nonVideoStartedAt = 0;
    this.handledNonVideoKeys = new Set();
    this.lastNonVideoStatusKey = null;

    this.running = true;

    try {
      if (this.historyStore) {
        const session = this.historyStore.createSession(this.config);
        this.historySessionId = session.id;
        this.emitHistoryUpdate();
      }

      this.emitStatus("connecting", "Conectando ao navegador...");
      const opened = await this.openBotPage();
      this.browser = opened.browser;
      this.page = opened.page;
      this.ownsBrowser = opened.ownsBrowser;

      this.page.on("console", (message) => {
        if (message.type() === "error") {
          if (message.text().includes("ERR_BLOCKED_BY_CLIENT")) {
            return;
          }
          this.emitLog(`[pagina] ${message.text()}`, "warn");
        }
      });

      this.page.on("close", () => {
        if (this.running) {
          this.emitStatus("stopped", "A aba controlada pelo bot foi fechada.");
          this.running = false;
        }
      });

      this.emitStatus("opening", `Abrindo ${this.config.startUrl}`);
      await this.page.goto(this.config.startUrl, { waitUntil: "domcontentloaded" });
      await this.applyPlaybackRate();

      this.emitStatus("running", "Monitorando video...");
      this.loopPromise = this.monitorLoop().catch((error) => {
        this.running = false;
        this.emitStatus("error", error.message);
        this.emitEvent("error", { message: error.message, stack: error.stack || null });
      });

      return { started: true };
    } catch (error) {
      this.running = false;
      if (this.historyStore && this.historySessionId) {
        this.historyStore.finishSession(this.historySessionId, "failed");
        this.emitHistoryUpdate();
      }
      await this.closeResources();
      this.emitStatus("error", error.message);
      throw error;
    }
  }

  async waitUntilStopped() {
    return this.loopPromise;
  }

  async stop() {
    this.running = false;
    this.emitStatus("stopping", "Parando bot...");
    if (this.historyStore && this.historySessionId) {
      this.historyStore.finishSession(this.historySessionId, "stopped");
      this.emitHistoryUpdate();
    }
    await this.closeResources();
    this.emitStatus("stopped", "Bot parado.");
  }

  async closeResources() {
    if (this.page && !this.page.isClosed()) {
      await this.page.close().catch(() => {});
    }

    if (this.ownsBrowser && this.browser) {
      await this.browser.close().catch(() => {});
    }

    this.page = null;
    this.browser = null;
    this.ownsBrowser = false;
  }

  async setSpeed(playbackRate) {
    const parsedRate = Number(playbackRate);
    if (!Number.isFinite(parsedRate) || parsedRate < 0.25 || parsedRate > 4) {
      throw new Error("A velocidade precisa estar entre 0.25x e 4x.");
    }

    this.config.playbackRate = parsedRate;
    await this.applyPlaybackRate();
    this.emitEvent("speed", { playbackRate: parsedRate });
    return { playbackRate: parsedRate };
  }

  async openBotPage() {
    if (this.config.useExistingBrowser) {
      const cdpStatus = await getCdpStatus(this.config.browserCdpUrl);

      if (!cdpStatus.ok) {
        throw new Error(
          [
            `Nao encontrei a porta de depuracao do Brave em ${this.config.browserCdpUrl}.`,
            BRAVE_ALREADY_RUNNING_HINT,
            "Abra o Brave assim:",
            getBraveDebugCommand(this.config),
            `Detalhe tecnico: ${cdpStatus.message || "CDP indisponivel"}`,
          ].join("\n")
        );
      }

      const browser = await chromium.connectOverCDP(this.config.browserCdpUrl);
      const context = browser.contexts()[0] || (await browser.newContext());
      const page = await context.newPage();
      return { browser, page, ownsBrowser: false };
    }

    const launchOptions = { headless: this.config.headless };

    if (this.config.browserExecutablePath) {
      if (!fs.existsSync(this.config.browserExecutablePath)) {
        throw new Error(`Navegador nao encontrado em: ${this.config.browserExecutablePath}`);
      }

      const browser = await chromium.launch({
        ...launchOptions,
        executablePath: this.config.browserExecutablePath,
      });
      const page = await browser.newPage();
      return { browser, page, ownsBrowser: true };
    }

    if (this.config.browserChannel) {
      const browser = await chromium.launch({
        ...launchOptions,
        channel: this.config.browserChannel,
      });
      const page = await browser.newPage();
      return { browser, page, ownsBrowser: true };
    }

    const browser = await chromium.launch(launchOptions);
    const page = await browser.newPage();
    return { browser, page, ownsBrowser: true };
  }

  async monitorLoop() {
    while (this.running) {
      await this.ensureVideoListener();
      await this.applyPlaybackRate();

      const state = await this.getVideoState();
      if (!state.found) {
        const lessonState = await this.getLessonPageState();
        if (lessonState.found) {
          this.recordLessonPage(lessonState);
        }

        const assessment = await this.getAssessmentState();
        if (assessment.found && this.config.stopOnAssessment) {
          await this.pauseForAssessment(assessment);
          return;
        }

        if (
          this.config.autoAdvanceNonVideo &&
          lessonState.found &&
          lessonState.contentType === "content"
        ) {
          await this.handleNonVideoLesson(lessonState);
          continue;
        }

        this.emitStatus("waiting_video", "Nenhum video encontrado. Tentando novamente...");
        await sleep(this.config.pollIntervalMs);
        continue;
      }

      const currentVideoKey = getVideoKey(state);
      const currentLessonKey = getLessonKey(state);
      if (currentLessonKey && currentLessonKey !== this.lastLessonKey) {
        this.lastLessonKey = currentLessonKey;
        this.currentLessonReady = false;
        this.handledEndedCount = await this.getEndedCount().catch(() => this.handledEndedCount);
        this.recordLessonSeen(currentLessonKey, state);
        this.emitLog(`Aula reconhecida: ${formatVideoLabel(state)}`);
        this.emitEvent("video", {
          title: state.pageTitle,
          url: state.pageUrl,
          src: state.src,
          duration: state.duration,
        });
      }
      this.lastVideoKey = currentVideoKey || this.lastVideoKey;

      this.emitProgress(state);
      this.recordLessonProgress(currentLessonKey, state);

      const endedCount = await this.getEndedCount();
      const rawEnded = isVideoEnded(state);
      if (!rawEnded) {
        this.currentLessonReady = true;
      }

      const endedByEvent = this.currentLessonReady && endedCount > this.handledEndedCount;
      const endedByState = this.currentLessonReady && rawEnded;

      if (currentVideoKey && this.handledVideoKeys.has(currentVideoKey)) {
        await sleep(this.config.pollIntervalMs);
        continue;
      }

      if (!endedByEvent && !endedByState) {
        await sleep(this.config.pollIntervalMs);
        continue;
      }

      this.handledEndedCount = Math.max(this.handledEndedCount, endedCount);
      if (currentVideoKey) {
        this.handledVideoKeys.add(currentVideoKey);
        this.recordLessonComplete(currentLessonKey);
      }
      this.lastCompletedVideoSrc = state.src || this.lastCompletedVideoSrc;

      this.completedVideos += 1;
      this.emitEvent("video-ended", {
        completedVideos: this.completedVideos,
        title: state.pageTitle,
        url: state.pageUrl,
      });
      this.emitLog(`Video finalizado em ${formatVideoLabel(state)}`);
      this.emitStatus("advancing", "Video finalizado. Procurando proximo...");

      const changedState = await this.waitForVideoChange(state);
      if (changedState) {
        const assessment = await this.getAssessmentState();
        if (assessment.found && this.config.stopOnAssessment) {
          await this.pauseForAssessment(assessment);
          return;
        }

        this.emitEvent("next-video", {
          mode: "automatic",
          completedVideos: this.completedVideos,
          title: changedState.pageTitle,
          url: changedState.pageUrl,
        });
        this.emitLog(`Proximo video detectado automaticamente: ${formatVideoLabel(changedState)}`);
        continue;
      }

      const clickedSelector = await this.clickNextButton();
      if (!clickedSelector) {
        await this.finishCourse("Nao encontrei botao de proximo. Curso finalizado ou sem proxima aula.");
        return;
      }

      this.emitLog(`Cliquei no proximo usando: ${clickedSelector}`);
      await this.page.waitForLoadState("domcontentloaded").catch(() => {});

      const clickedChangedState = await this.waitForVideoChange(state);
      if (!clickedChangedState) {
        const postClickAssessment = await this.getAssessmentState();
        if (postClickAssessment.found && this.config.stopOnAssessment) {
          await this.pauseForAssessment(postClickAssessment);
          return;
        }

        await this.finishCourse("O bot clicou em proximo, mas nenhuma nova aula foi detectada.");
        return;
      }

      const changedPageAssessment = await this.getAssessmentState();
      if (changedPageAssessment.found && this.config.stopOnAssessment) {
        await this.pauseForAssessment(changedPageAssessment);
        return;
      }

      this.emitEvent("next-video", {
        mode: "click",
        selector: clickedSelector,
        completedVideos: this.completedVideos,
        title: clickedChangedState.pageTitle,
        url: clickedChangedState.pageUrl,
      });
      this.emitLog(`Proximo video aberto: ${formatVideoLabel(clickedChangedState)}`);
    }
  }

  async handleNonVideoLesson(state) {
    const lessonKey = getLessonKey(state);
    if (!lessonKey || this.handledNonVideoKeys.has(lessonKey)) {
      await sleep(this.config.pollIntervalMs);
      return;
    }

    if (this.activeNonVideoKey !== lessonKey) {
      this.activeNonVideoKey = lessonKey;
      this.nonVideoStartedAt = Date.now();
      this.lastNonVideoStatusKey = null;
      this.emitEvent("content", {
        title: state.pageTitle || state.title,
        url: state.pageUrl || state.url,
      });
      this.emitLog(`Conteudo sem video reconhecido: ${formatVideoLabel(state)}`);
    }

    const elapsed = Date.now() - this.nonVideoStartedAt;
    const remaining = this.config.nonVideoWaitMs - elapsed;

    if (remaining > 0) {
      const bucket = Math.ceil(remaining / 10000);
      const statusKey = `${lessonKey}|${bucket}`;
      if (statusKey !== this.lastNonVideoStatusKey) {
        this.lastNonVideoStatusKey = statusKey;
        this.emitStatus(
          "reading",
          `Conteudo sem video. Aguardando ${formatSeconds(remaining)} antes de avancar...`
        );
      }
      await sleep(this.config.pollIntervalMs);
      return;
    }

    const clickedCompletionSelector = await this.clickCompletionButton();
    if (clickedCompletionSelector) {
      this.emitLog(`Conclui conteudo usando: ${clickedCompletionSelector}`);
    }

    this.recordLessonComplete(lessonKey);
    this.handledNonVideoKeys.add(lessonKey);
    this.activeNonVideoKey = null;
    this.nonVideoStartedAt = 0;
    this.lastNonVideoStatusKey = null;

    this.emitStatus("advancing", "Conteudo sem video concluido. Procurando proximo...");
    const clickedSelector = await this.clickNextButton();
    if (!clickedSelector) {
      await this.finishCourse("Nao encontrei proximo item. Curso finalizado ou sem proximo conteudo.");
      return;
    }

    this.emitLog(`Cliquei no proximo usando: ${clickedSelector}`);
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
  }

  async finishCourse(message) {
    this.running = false;
    if (this.historyStore && this.historySessionId) {
      this.historyStore.finishSession(this.historySessionId, "finished");
      this.emitHistoryUpdate();
    }
    this.emitStatus("finished", message, { completedVideos: this.completedVideos });
    this.emitEvent("course-finished", {
      message,
      completedVideos: this.completedVideos,
    });
  }

  async pauseForAssessment(assessment) {
    this.running = false;
    let guide = null;

    if (this.historyStore && this.historySessionId) {
      this.historyStore.recordAssessment(this.historySessionId, assessment);
      const session = this.historyStore.getSession(this.historySessionId);
      guide = buildStudyGuide(session || {}, assessment);
      this.emitHistoryUpdate();
      this.emitEvent("study-guide", guide);
    }

    this.emitStatus("assessment", "Avaliacao detectada. Automacao pausada.", {
      completedVideos: this.completedVideos,
    });
    this.emitEvent("assessment-detected", {
      completedVideos: this.completedVideos,
      title: assessment.title,
      url: assessment.url,
      confidence: assessment.confidence,
      reasons: assessment.reasons,
      studyGuide: guide,
    });
    this.emitLog(`Avaliacao detectada: ${assessment.title || assessment.url}`, "warn");
  }

  emitHistoryUpdate() {
    if (!this.historyStore) {
      return;
    }

    this.emitEvent("history-update", this.historyStore.getSummary(this.historySessionId));
  }

  recordLessonSeen(lessonKey, state) {
    if (!this.historyStore || !this.historySessionId || !lessonKey) {
      return;
    }

    this.historyStore.recordLessonSeen(
      this.historySessionId,
      lessonKey,
      state,
      this.config.playbackRate
    );
    this.emitHistoryUpdate();
  }

  recordLessonPage(state) {
    const lessonKey = getLessonKey(state);
    if (!lessonKey || lessonKey === this.lastLessonKey) {
      return;
    }

    if (isPlaceholderCourseraTitle(state.pageTitle || state.title)) {
      return;
    }

    this.lastLessonKey = lessonKey;
    this.currentLessonReady = false;
    this.recordLessonSeen(lessonKey, state);
    this.emitLog(`Aula reconhecida: ${formatVideoLabel(state)}`);
    this.emitEvent("lesson", {
      title: state.pageTitle || state.title,
      url: state.pageUrl || state.url,
    });
  }

  recordLessonProgress(lessonKey, state) {
    if (!this.historyStore || !this.historySessionId || !lessonKey) {
      return;
    }

    const progressKey = [
      lessonKey,
      Math.floor((state.currentTime || 0) / 10),
      Math.floor(state.duration || 0),
    ].join("|");

    if (progressKey === this.lastHistoryProgressKey) {
      return;
    }

    this.lastHistoryProgressKey = progressKey;
    this.historyStore.updateLessonProgress(this.historySessionId, lessonKey, {
      currentTime: state.currentTime,
      duration: state.duration,
    });
    this.emitHistoryUpdate();
  }

  recordLessonComplete(lessonKey) {
    if (!this.historyStore || !this.historySessionId || !lessonKey) {
      return;
    }

    this.historyStore.completeLesson(this.historySessionId, lessonKey);
    this.emitHistoryUpdate();
  }

  emitProgress(state) {
    const progressKey = [
      state.pageUrl,
      state.pageTitle,
      Math.floor(state.currentTime || 0),
      Math.floor(state.duration || 0),
      this.config.playbackRate,
    ].join("|");

    if (progressKey === this.lastProgressKey) {
      return;
    }

    this.lastProgressKey = progressKey;
    this.emitEvent("progress", {
      title: state.pageTitle,
      url: state.pageUrl,
      currentTime: state.currentTime,
      duration: state.duration,
      playbackRate: this.config.playbackRate,
      completedVideos: this.completedVideos,
      ended: state.ended,
    });
  }

  async getVideoState() {
    return this.page.evaluate((selector) => {
      const video = document.querySelector(selector);

      if (!video) {
        return {
          found: false,
          pageUrl: location.href,
          pageTitle: document.title,
        };
      }

      return {
        found: true,
        ended: video.ended,
        paused: video.paused,
        currentTime: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : null,
        src: video.currentSrc || video.src || null,
        pageUrl: location.href,
        pageTitle: document.title,
      };
    }, this.config.videoSelector);
  }

  async getLessonPageState() {
    return this.page.evaluate(() => {
      const url = location.href;
      const title = document.title;
      const pathname = location.pathname.toLowerCase();
      const isCoursera = location.hostname.includes("coursera.org");
      const isCourseraLecture = isCoursera && pathname.includes("/lecture/");
      const isCourseraContent =
        isCoursera &&
        pathname.includes("/learn/") &&
        /(\/supplement\/|\/reading\/|\/ungradedwidget\/|\/item\/)/i.test(pathname);

      return {
        found: isCourseraLecture || isCourseraContent,
        contentType: isCourseraLecture ? "video" : "content",
        pageUrl: url,
        pageTitle: title,
        title,
        url,
        duration: null,
        src: null,
      };
    });
  }

  async getAssessmentState() {
    const keywords = this.config.assessmentKeywords || [];
    const keywordPattern = createAssessmentPattern(keywords);

    return this.page.evaluate(
      ({ patternSource, patternFlags }) => {
        const keywordPattern = new RegExp(patternSource, patternFlags);
        const url = location.href;
        const title = document.title;
        const hostname = location.hostname.toLowerCase();
        const pathname = location.pathname.toLowerCase();
        const isCoursera = hostname.includes("coursera.org");
        const isCourseraLecture = isCoursera && pathname.includes("/lecture/");
        const isAssessmentPath =
          /(\/quiz\/|\/exam\/|\/assignment|\/peer|\/review|\/programming)/i.test(pathname);
        const strongAssessmentPattern =
          /(graded quiz|practice quiz|module quiz|quiz|exam|assessment|assignment|prova|avaliacao|avaliação|questionario|questionário)/i;

        const headingText = Array.from(document.querySelectorAll("h1,h2,[role='heading']"))
          .slice(0, 8)
          .map((element) => element.textContent || "")
          .join(" ");
        const isVisible = (element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.width > 0 &&
            rect.height > 0
          );
        };
        const buttonText = Array.from(document.querySelectorAll("button,a"))
          .filter(isVisible)
          .slice(0, 80)
          .map((element) => element.textContent || element.getAttribute("aria-label") || "")
          .join(" ");
        const bodyText = (document.body?.innerText || "").slice(0, 6000);
        const radioCount = Array.from(document.querySelectorAll("input[type='radio']")).filter(
          isVisible
        ).length;
        const checkboxCount = Array.from(
          document.querySelectorAll("input[type='checkbox']")
        ).filter(isVisible).length;
        const textAreaCount = Array.from(document.querySelectorAll("textarea")).filter(
          isVisible
        ).length;
        const formCount = Array.from(document.querySelectorAll("form")).filter(isVisible).length;
        const submitLike = /(submit|enviar|concluir|start|iniciar|fazer|retomar|resume)/i.test(
          buttonText
        );
        const answerControls = radioCount + checkboxCount + textAreaCount;
        const titleOrHeading = `${title} ${headingText}`;
        const reasons = [];
        let confidence = 0;

        if (isCourseraLecture && !isAssessmentPath) {
          return {
            found: false,
            confidence: 0,
            reasons: ["coursera_lecture"],
            title,
            url,
            answerControls,
          };
        }

        if (isAssessmentPath || strongAssessmentPattern.test(pathname)) {
          confidence += 3;
          reasons.push("url");
        }

        if (
          strongAssessmentPattern.test(titleOrHeading) ||
          (keywordPattern.test(titleOrHeading) && answerControls > 0)
        ) {
          confidence += 2;
          reasons.push("titulo");
        }

        if (!isCourseraLecture && strongAssessmentPattern.test(bodyText)) {
          confidence += 1;
          reasons.push("conteudo");
        }

        if (answerControls > 0 && (submitLike || formCount > 0)) {
          confidence += 2;
          reasons.push("campos_de_resposta");
        }

        return {
          found: confidence >= 3,
          confidence,
          reasons,
          title,
          url,
          answerControls,
        };
      },
      {
        patternSource: keywordPattern.source,
        patternFlags: keywordPattern.flags,
      }
    );
  }

  async waitForVideoChange(previousState) {
    const timeoutAt = Date.now() + this.config.autoAdvanceWaitMs;

    while (this.running && Date.now() < timeoutAt) {
      await sleep(this.config.pollIntervalMs);
      const state = await this.getVideoState();

      if (state.found && hasVideoChanged(previousState, state)) {
        await this.applyPlaybackRate();
        return state;
      }
    }

    return null;
  }

  async clickNextButton() {
    for (const selector of this.config.nextButtonSelectors) {
      const locator = this.page.locator(selector).first();

      try {
        if ((await locator.count()) === 0 || !(await locator.isVisible())) {
          continue;
        }

        if (await locator.isDisabled().catch(() => false)) {
          continue;
        }

        await locator.click();
        return selector;
      } catch {
        // Some pages replace controls while we inspect them. Try the next selector.
      }
    }

    return null;
  }

  async clickCompletionButton() {
    for (const selector of this.config.completionButtonSelectors || []) {
      const locator = this.page.locator(selector).first();

      try {
        if ((await locator.count()) === 0 || !(await locator.isVisible())) {
          continue;
        }

        if (await locator.isDisabled().catch(() => false)) {
          continue;
        }

        await locator.click();
        await sleep(800);
        return selector;
      } catch {
        // Completion controls can be rerendered while the page settles.
      }
    }

    return null;
  }

  async ensureVideoListener() {
    await this.page.evaluate((selector) => {
      window.__videoBot = window.__videoBot || {
        endedCount: 0,
        lastEndedAt: null,
        listenedElement: null,
      };

      const video = document.querySelector(selector);
      if (!video || window.__videoBot.listenedElement === video) {
        return;
      }

      window.__videoBot.listenedElement = video;
      video.addEventListener("ended", () => {
        window.__videoBot.endedCount += 1;
        window.__videoBot.lastEndedAt = Date.now();
      });
    }, this.config.videoSelector);
  }

  async getEndedCount() {
    return this.page.evaluate(() => window.__videoBot?.endedCount || 0);
  }

  async applyPlaybackRate() {
    if (!this.page || this.page.isClosed()) {
      return;
    }

    await this.page
      .evaluate(
        ({ selector, playbackRate }) => {
          const videos = Array.from(document.querySelectorAll(selector));
          for (const video of videos) {
            video.defaultPlaybackRate = playbackRate;
            video.playbackRate = playbackRate;
          }
          return videos.length;
        },
        {
          selector: this.config.videoSelector,
          playbackRate: this.config.playbackRate,
        }
      )
      .catch(() => {});
  }
}

module.exports = {
  VideoCourseBot,
};
