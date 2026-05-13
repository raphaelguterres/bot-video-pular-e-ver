const generic = require("./generic.adapter");

async function detectLesson(page) {
  return page.evaluate(() => {
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

async function detectAssessment(page, config = {}) {
  const keywordPattern = generic.createAssessmentPattern(config.assessmentKeywords || []);

  return page.evaluate(
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

module.exports = {
  clickCompletion: generic.clickCompletion,
  clickNext: generic.clickNext,
  detectAssessment,
  detectLesson,
  detectVideo: generic.detectVideo,
};
