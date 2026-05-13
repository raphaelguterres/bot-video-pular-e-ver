const fs = require("fs");
const { spawn } = require("child_process");
const { getDefaultBravePath } = require("./defaults");

function getCdpPort(browserCdpUrl = "http://127.0.0.1:9222") {
  try {
    return new URL(browserCdpUrl).port || "9222";
  } catch {
    return "9222";
  }
}

function getBraveDebugCommand(options = {}) {
  const bravePath = options.browserExecutablePath || getDefaultBravePath();
  const port = options.port || getCdpPort(options.browserCdpUrl);

  if (process.platform === "win32") {
    return `& "${bravePath}" --remote-debugging-port=${port}`;
  }

  return `"${bravePath}" --remote-debugging-port=${port}`;
}

async function getCdpStatus(browserCdpUrl = "http://127.0.0.1:9222", timeoutMs = 1500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${browserCdpUrl.replace(/\/$/, "")}/json/version`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, message: `HTTP ${response.status}` };
    }

    const version = await response.json();
    return {
      ok: true,
      browser: version.Browser || "Chromium",
      webSocketDebuggerUrl: version.webSocketDebuggerUrl || null,
    };
  } catch (error) {
    return { ok: false, message: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function openBraveDebug(options = {}) {
  const browserExecutablePath = options.browserExecutablePath || getDefaultBravePath();
  const browserCdpUrl = options.browserCdpUrl || "http://127.0.0.1:9222";
  const port = getCdpPort(browserCdpUrl);

  if (!fs.existsSync(browserExecutablePath)) {
    throw new Error(`Brave nao encontrado em: ${browserExecutablePath}`);
  }

  const currentStatus = await getCdpStatus(browserCdpUrl);
  if (currentStatus.ok) {
    return { alreadyOpen: true, ...currentStatus };
  }

  const child = spawn(browserExecutablePath, [`--remote-debugging-port=${port}`], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const nextStatus = await getCdpStatus(browserCdpUrl);
  return {
    alreadyOpen: false,
    ...nextStatus,
  };
}

module.exports = {
  getBraveDebugCommand,
  getCdpPort,
  getCdpStatus,
  openBraveDebug,
};
