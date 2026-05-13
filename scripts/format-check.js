const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["src", "scripts", "tests", "docs"];
const EXTENSIONS = new Set([".js", ".json", ".md", ".html", ".css", ".yml", ".yaml"]);

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return entry.isFile() && EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

const files = [
  path.join(ROOT, "README.md"),
  path.join(ROOT, "CHANGELOG.md"),
  path.join(ROOT, "RELEASE.md"),
  path.join(ROOT, "package.json"),
  path.join(ROOT, "config.example.json"),
  ...SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir))),
].filter((file, index, all) => fs.existsSync(file) && all.indexOf(file) === index);

const issues = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      issues.push(`${path.relative(ROOT, file)}:${index + 1} tem espaco no fim da linha.`);
    }
  });

  if (!content.endsWith("\n")) {
    issues.push(`${path.relative(ROOT, file)} precisa terminar com quebra de linha.`);
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Format OK (${files.length} arquivos).`);
}
