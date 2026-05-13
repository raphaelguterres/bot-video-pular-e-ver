const form = {
  platformPreset: document.getElementById("platformPreset"),
  startUrl: document.getElementById("startUrl"),
  browserCdpUrl: document.getElementById("browserCdpUrl"),
  browserExecutablePath: document.getElementById("browserExecutablePath"),
  videoSelector: document.getElementById("videoSelector"),
  autoAdvanceWaitMs: document.getElementById("autoAdvanceWaitMs"),
  pollIntervalMs: document.getElementById("pollIntervalMs"),
  nonVideoWaitMs: document.getElementById("nonVideoWaitMs"),
  playbackRate: document.getElementById("playbackRate"),
  useExistingBrowser: document.getElementById("useExistingBrowser"),
  stopOnAssessment: document.getElementById("stopOnAssessment"),
  autoAdvanceNonVideo: document.getElementById("autoAdvanceNonVideo"),
  simulationMode: document.getElementById("simulationMode"),
};

const ui = {
  statusPill: document.getElementById("statusPill"),
  connectionStatus: document.getElementById("connectionStatus"),
  completedVideos: document.getElementById("completedVideos"),
  botStatus: document.getElementById("botStatus"),
  currentTitle: document.getElementById("currentTitle"),
  currentUrl: document.getElementById("currentUrl"),
  timeReadout: document.getElementById("timeReadout"),
  progressBar: document.getElementById("progressBar"),
  eventLog: document.getElementById("eventLog"),
  speedValue: document.getElementById("speedValue"),
  assessmentPanel: document.getElementById("assessmentPanel"),
  assessmentTitle: document.getElementById("assessmentTitle"),
  assessmentUrl: document.getElementById("assessmentUrl"),
  assessmentConfidence: document.getElementById("assessmentConfidence"),
  historySummary: document.getElementById("historySummary"),
  historyList: document.getElementById("historyList"),
  studyPanel: document.getElementById("studyPanel"),
  studyTitle: document.getElementById("studyTitle"),
  studyMeta: document.getElementById("studyMeta"),
  studyChecklist: document.getElementById("studyChecklist"),
  studyPrompts: document.getElementById("studyPrompts"),
  checkBrave: document.getElementById("checkBrave"),
  openBrave: document.getElementById("openBrave"),
  startBot: document.getElementById("startBot"),
  stopBot: document.getElementById("stopBot"),
  clearLog: document.getElementById("clearLog"),
  importSettings: document.getElementById("importSettings"),
  exportSettings: document.getElementById("exportSettings"),
  diagnosticButton: document.getElementById("diagnosticButton"),
  themeToggle: document.getElementById("themeToggle"),
};

let running = false;

function collectSettings() {
  return {
    startUrl: form.startUrl.value.trim(),
    platformPreset: form.platformPreset.value || "coursera",
    browserCdpUrl: form.browserCdpUrl.value.trim(),
    browserExecutablePath: form.browserExecutablePath.value.trim(),
    videoSelector: form.videoSelector.value.trim() || "video",
    autoAdvanceWaitMs: Number(form.autoAdvanceWaitMs.value),
    pollIntervalMs: Number(form.pollIntervalMs.value),
    nonVideoWaitMs: Number(form.nonVideoWaitMs.value),
    playbackRate: Number(form.playbackRate.value),
    useExistingBrowser: form.useExistingBrowser.checked,
    stopOnAssessment: form.stopOnAssessment.checked,
    autoAdvanceNonVideo: form.autoAdvanceNonVideo.checked,
    simulationMode: form.simulationMode.checked,
    headless: false,
  };
}

function applySettings(settings) {
  form.platformPreset.value = settings.platformPreset || "coursera";
  form.startUrl.value = settings.startUrl || "";
  form.browserCdpUrl.value = settings.browserCdpUrl || "http://127.0.0.1:9222";
  form.browserExecutablePath.value = settings.browserExecutablePath || "";
  form.videoSelector.value = settings.videoSelector || "video";
  form.autoAdvanceWaitMs.value = settings.autoAdvanceWaitMs || 8000;
  form.pollIntervalMs.value = settings.pollIntervalMs || 1000;
  form.nonVideoWaitMs.value = settings.nonVideoWaitMs || 45000;
  form.playbackRate.value = settings.playbackRate || 1;
  form.useExistingBrowser.checked = Boolean(settings.useExistingBrowser);
  form.stopOnAssessment.checked = settings.stopOnAssessment !== false;
  form.autoAdvanceNonVideo.checked = settings.autoAdvanceNonVideo !== false;
  form.simulationMode.checked = Boolean(settings.simulationMode);
  updateSpeedValue();
}

function populatePresets(presets) {
  form.platformPreset.textContent = "";
  for (const preset of presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    form.platformPreset.appendChild(option);
  }
}

function setRunning(nextRunning) {
  running = nextRunning;
  ui.startBot.disabled = running;
  ui.stopBot.disabled = !running;
  ui.openBrave.disabled = running;
}

function setStatus(status, message) {
  ui.statusPill.className = "status-pill";
  if (["running", "opening", "connecting", "advancing", "waiting_video", "reading"].includes(status)) {
    ui.statusPill.classList.add("running");
  }
  if (["error", "finished", "assessment"].includes(status)) {
    ui.statusPill.classList.add(status);
  }

  ui.statusPill.textContent = statusLabel(status);
  ui.botStatus.textContent = message || statusLabel(status);
}

function statusLabel(status) {
  const labels = {
    connecting: "Conectando",
    opening: "Abrindo",
    running: "Rodando",
    waiting_video: "Aguardando",
    reading: "Leitura",
    advancing: "Avancando",
    stopped: "Parado",
    finished: "Finalizado",
    assessment: "Avaliacao",
    error: "Erro",
  };

  return labels[status] || "Parado";
}

function updateSpeedValue() {
  ui.speedValue.textContent = `${Number(form.playbackRate.value).toFixed(2)}x`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function appendLog(message, level = "info") {
  const time = new Date().toLocaleTimeString();
  const li = document.createElement("li");
  const timeNode = document.createElement("span");
  const levelNode = document.createElement("strong");
  const messageNode = document.createElement("span");
  timeNode.textContent = time;
  levelNode.textContent = level.toUpperCase();
  levelNode.className = `level-${level}`;
  messageNode.textContent = message;
  li.append(timeNode, levelNode, messageNode);
  ui.eventLog.appendChild(li);
  ui.eventLog.scrollTop = ui.eventLog.scrollHeight;
}

function formatMinutes(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0 min";
  }

  return `${Math.round(seconds / 60)} min`;
}

function renderList(target, items, renderItem) {
  target.textContent = "";

  for (const item of items) {
    const li = document.createElement("li");
    renderItem(li, item);
    target.appendChild(li);
  }
}

function renderHistory(summary) {
  const totals = summary?.totals || {};
  const recentLessons = summary?.recentLessons || [];
  ui.historySummary.textContent = `${totals.completedLessons || 0}/${totals.lessons || 0} aulas`;

  renderList(ui.historyList, recentLessons, (li, lesson) => {
    const title = document.createElement("strong");
    title.textContent = lesson.title || "Aula sem titulo";
    const meta = document.createElement("small");
    meta.textContent = `${lesson.completedAt ? "Concluida" : "Em andamento"} · ${formatMinutes(
      lesson.duration || lesson.maxCurrentTime
    )}`;
    li.append(title, meta);
  });

  if (recentLessons.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma aula registrada ainda.";
    ui.historyList.appendChild(li);
  }
}

function renderStudyGuide(guide) {
  ui.studyPanel.classList.add("active");
  ui.studyTitle.textContent = guide.title || "Avaliacao detectada";
  ui.studyMeta.textContent = `${guide.completedLessons || 0} aulas concluidas · ${formatMinutes(
    guide.totalSeconds
  )} rastreados`;

  renderList(ui.studyChecklist, guide.checklist || [], (li, item) => {
    li.textContent = item;
  });

  renderList(ui.studyPrompts, guide.reviewPrompts || [], (li, item) => {
    const title = document.createElement("strong");
    title.textContent = item.title;
    const prompt = document.createElement("small");
    prompt.textContent = item.prompt;
    li.append(title, prompt);
  });
}

function updateProgress(event) {
  ui.completedVideos.textContent = String(event.completedVideos || 0);
  ui.currentTitle.textContent = event.title || "Video sem titulo";
  ui.currentUrl.textContent = event.url || "-";
  ui.timeReadout.textContent = `${formatTime(event.currentTime)} / ${formatTime(event.duration)}`;

  const percent =
    Number.isFinite(event.duration) && event.duration > 0
      ? Math.min(100, Math.max(0, (event.currentTime / event.duration) * 100))
      : 0;
  ui.progressBar.style.width = `${percent}%`;
}

function handleBotEvent(event) {
  if (event.type === "status") {
    setStatus(event.status, event.message);
    appendLog(event.message, event.status === "error" ? "error" : "info");

    if (["stopped", "finished", "assessment", "error"].includes(event.status)) {
      setRunning(false);
    }
    return;
  }

  if (event.type === "log") {
    appendLog(event.message, event.level || "info");
    return;
  }

  if (event.type === "progress") {
    updateProgress(event);
    return;
  }

  if (event.type === "content") {
    ui.currentTitle.textContent = event.title || "Conteudo sem video";
    ui.currentUrl.textContent = event.url || "-";
    ui.timeReadout.textContent = "sem video";
    ui.progressBar.style.width = "0%";
    return;
  }

  if (event.type === "video-ended") {
    ui.completedVideos.textContent = String(event.completedVideos || 0);
    appendLog(`Video concluido: ${event.title || event.url}`, "info");
    return;
  }

  if (event.type === "next-video") {
    appendLog(`Proximo video: ${event.title || event.url}`, "info");
    return;
  }

  if (event.type === "simulation-step") {
    appendLog(`Simulacao: acao detectada em ${event.selector}`, "info");
    return;
  }

  if (event.type === "assessment-detected") {
    ui.assessmentPanel.classList.add("active");
    ui.assessmentTitle.textContent = event.title || "Avaliacao detectada";
    ui.assessmentUrl.textContent = event.url || "-";
    ui.assessmentConfidence.textContent = String(event.confidence || 0);
    appendLog(`Avaliacao pausada: ${(event.reasons || []).join(", ") || "sinal detectado"}`, "warn");
    if (event.studyGuide) {
      renderStudyGuide(event.studyGuide);
    }
    return;
  }

  if (event.type === "history-update") {
    renderHistory(event);
    return;
  }

  if (event.type === "study-guide") {
    renderStudyGuide(event);
    return;
  }

  if (event.type === "course-finished") {
    appendLog(event.message, "info");
  }
}

async function boot() {
  if (localStorage.getItem("videoBotTheme") === "dark") {
    document.body.classList.add("dark");
    ui.themeToggle.textContent = "Tema claro";
  }

  const presets = await window.videoBot.listPresets();
  populatePresets(presets);
  const settings = await window.videoBot.getSettings();
  applySettings(settings);
  renderHistory(await window.videoBot.getHistory());
  setRunning(false);
  setStatus("stopped", "Parado");

  window.videoBot.onBotEvent(handleBotEvent);
}

ui.checkBrave.addEventListener("click", async () => {
  const status = await window.videoBot.checkBrave(collectSettings());
  ui.connectionStatus.textContent = status.ok ? status.browser : "Sem conexao";
  appendLog(status.ok ? `CDP ativo: ${status.browser}` : `CDP indisponivel: ${status.message}`, status.ok ? "info" : "warn");
});

ui.openBrave.addEventListener("click", async () => {
  const settings = collectSettings();
  const result = await window.videoBot.openBraveDebug(settings);
  ui.connectionStatus.textContent = result.ok ? result.browser : "Sem conexao";
  appendLog(
    result.ok
      ? "Brave CDP esta pronto."
      : "Nao foi possivel ativar o CDP. Feche o Brave e tente de novo.",
    result.ok ? "info" : "warn"
  );
});

ui.startBot.addEventListener("click", async () => {
  try {
    const settings = collectSettings();
    await window.videoBot.saveSettings(settings);
    setRunning(true);
    await window.videoBot.start(settings);
  } catch (error) {
    setRunning(false);
    setStatus("error", error.message);
    appendLog(error.message, "error");
  }
});

ui.stopBot.addEventListener("click", async () => {
  await window.videoBot.stop();
  setRunning(false);
});

form.playbackRate.addEventListener("input", async () => {
  updateSpeedValue();
  if (running) {
    await window.videoBot.setSpeed(Number(form.playbackRate.value)).catch((error) => {
      appendLog(error.message, "error");
    });
  }
});

ui.clearLog.addEventListener("click", () => {
  ui.eventLog.textContent = "";
});

ui.importSettings.addEventListener("click", async () => {
  const result = await window.videoBot.importSettings();
  if (!result.canceled && result.settings) {
    applySettings(result.settings);
    appendLog("Configuracoes importadas.", "info");
  }
});

ui.exportSettings.addEventListener("click", async () => {
  const result = await window.videoBot.exportSettings();
  if (!result.canceled) {
    appendLog(`Configuracoes exportadas: ${result.filePath}`, "info");
  }
});

ui.diagnosticButton.addEventListener("click", async () => {
  const result = await window.videoBot.generateDiagnostic();
  appendLog(`Diagnostico gerado: ${result.filePath}`, "info");
});

ui.themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  ui.themeToggle.textContent = dark ? "Tema claro" : "Tema escuro";
  localStorage.setItem("videoBotTheme", dark ? "dark" : "light");
});

boot().catch((error) => {
  appendLog(error.message, "error");
});
