function cleanTitle(title = "") {
  return String(title)
    .replace(/\s*\|\s*Coursera\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTopics(lessons = []) {
  return lessons
    .map((lesson) => cleanTitle(lesson.title))
    .filter(Boolean)
    .slice(-10);
}

function buildStudyGuide(session = {}, assessment = {}) {
  const lessons = session.lessons || [];
  const completedLessons = lessons.filter((lesson) => lesson.completedAt);
  const sourceLessons = completedLessons.length > 0 ? completedLessons : lessons;
  const topics = extractTopics(sourceLessons);
  const totalSeconds = sourceLessons.reduce((sum, lesson) => {
    if (Number.isFinite(lesson.duration)) {
      return sum + lesson.duration;
    }
    return sum + (lesson.maxCurrentTime || 0);
  }, 0);

  const reviewPrompts = topics.slice(-6).map((topic) => ({
    title: topic,
    prompt: `Explique com suas palavras os conceitos centrais de "${topic}" e anote um exemplo pratico.`,
  }));

  return {
    title: assessment.title || "Avaliacao detectada",
    url: assessment.url || "",
    generatedAt: new Date().toISOString(),
    completedLessons: completedLessons.length,
    trackedLessons: lessons.length,
    totalSeconds,
    topics,
    checklist: [
      "Revise os titulos das aulas concluidas antes de iniciar a avaliacao.",
      "Abra suas anotacoes ou transcricoes da plataforma, se existirem.",
      "Responda manualmente, usando o guia apenas como apoio de estudo.",
      "Se uma questao estiver duvidosa, volte para a aula relacionada em vez de chutar.",
    ],
    reviewPrompts,
  };
}

module.exports = {
  buildStudyGuide,
};
