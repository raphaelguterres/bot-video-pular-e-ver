const { loadConfigFromWorkspace } = require("./core/config");
const { HistoryStore } = require("./core/history-store");
const { VideoCourseBot } = require("./core/video-course-bot");

async function main() {
  const bot = new VideoCourseBot(loadConfigFromWorkspace(), {
    historyStore: new HistoryStore("data/history.json"),
  });

  bot.on("event", (event) => {
    if (event.type === "log" || event.type === "status") {
      console.log(event.message);
    }
  });

  process.on("SIGINT", async () => {
    await bot.stop();
    process.exit(0);
  });

  await bot.start();
  await bot.waitUntilStopped();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
