function createAssessmentPattern(keywords = []) {
  const escaped = keywords
    .filter(Boolean)
    .map((keyword) => String(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escaped.length === 0) {
    return /$a/i;
  }

  return new RegExp(`(${escaped.join("|")})`, "i");
}

async function findFirstVisible(page, selectors = []) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    try {
      if ((await locator.count()) === 0 || !(await locator.isVisible())) {
        continue;
      }

      if (await locator.isDisabled().catch(() => false)) {
        continue;
      }

      return { locator, selector };
    } catch {
      // Controls can be rerendered while we inspect them.
    }
  }

  return null;
}

async function clickFirstVisible(page, selectors = [], options = {}) {
  const match = await findFirstVisible(page, selectors);
  if (!match) {
    return null;
  }

  if (!options.simulationMode) {
    await match.locator.click();
  }

  return match.selector;
}

async function detectVideo(page, selector = "video") {
  return page.evaluate((videoSelector) => {
    const video = document.querySelector(videoSelector);

    if (!video) {
      return {
        found: false,
        pageUrl: location.href,
        pageTitle: document.title,
      };
    }

    return {
      found: true,
      contentType: "video",
      ended: video.ended,
      paused: video.paused,
      currentTime: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : null,
      src: video.currentSrc || video.src || null,
      pageUrl: location.href,
      pageTitle: document.title,
    };
  }, selector);
}

async function detectLesson(page) {
  return page.evaluate(() => ({
    found: Boolean(location.href && document.title),
    contentType: "content",
    pageUrl: location.href,
    pageTitle: document.title,
    title: document.title,
    url: location.href,
    duration: null,
    src: null,
  }));
}

async function detectAssessment(page, config = {}) {
  const keywordPattern = createAssessmentPattern(config.assessmentKeywords || []);

  return page.evaluate(
    ({ patternSource, patternFlags }) => {
      const keywordPattern = new RegExp(patternSource, patternFlags);
      const url = location.href;
      const title = document.title;
      const pathname = location.pathname.toLowerCase();
      const strongAssessmentPattern =
        /(graded quiz|practice quiz|module quiz|quiz|exam|assessment|assignment|prova|avaliacao|avaliação|questionario|questionário)/i;

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

      const headingText = Array.from(document.querySelectorAll("h1,h2,[role='heading']"))
        .slice(0, 8)
        .map((element) => element.textContent || "")
        .join(" ");
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
      const submitLike = /(submit|enviar|start|iniciar|fazer|retomar|resume)/i.test(buttonText);
      const answerControls = radioCount + checkboxCount + textAreaCount;
      const titleOrHeading = `${title} ${headingText}`;
      const reasons = [];
      let confidence = 0;

      if (/(\/quiz\/|\/exam\/|\/assignment|\/peer|\/review|\/programming)/i.test(pathname)) {
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

      if (strongAssessmentPattern.test(bodyText)) {
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

async function clickNext(page, config = {}) {
  return clickFirstVisible(page, config.nextButtonSelectors || [], {
    simulationMode: config.simulationMode,
  });
}

async function clickCompletion(page, config = {}) {
  const selector = await clickFirstVisible(page, config.completionButtonSelectors || [], {
    simulationMode: config.simulationMode,
  });
  if (selector && !config.simulationMode) {
    await page.waitForTimeout(800).catch(() => {});
  }
  return selector;
}

module.exports = {
  clickCompletion,
  clickFirstVisible,
  clickNext,
  createAssessmentPattern,
  detectAssessment,
  detectLesson,
  detectVideo,
  findFirstVisible,
};
