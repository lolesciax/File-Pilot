import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const notice = JSON.parse(
  await readFile(new URL("src/content/privacy.json", root), "utf8"),
);
const text = [
  `# FilePilot — ${notice.title}`,
  "",
  `Last updated: ${notice.updated}`,
  "",
  notice.summary,
  "",
  ...notice.sections.flatMap((section, index) => [
    `## ${index + 1}. ${section.title}`,
    "",
    ...section.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(section.links ?? []).flatMap((link) => [
      `[${link.label}](${link.url})`,
      "",
    ]),
  ]),
].join("\n");
await writeFile(new URL("PRIVACY.md", root), text);
console.log("Updated PRIVACY.md from the shared privacy notice.");
