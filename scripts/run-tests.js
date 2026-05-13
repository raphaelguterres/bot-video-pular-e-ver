const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TEST_DIR = path.join(ROOT, "tests");

function listTests(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listTests(fullPath);
      }
      return entry.isFile() && entry.name.endsWith(".test.js") ? [fullPath] : [];
    })
    .sort();
}

for (const testFile of listTests(TEST_DIR)) {
  require(testFile);
}
