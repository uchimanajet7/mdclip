import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const demoRoot = path.join(repoRoot, "demo", "markdown-sources");

const command = process.argv[2];

if (command === "setup") {
  await setupDemoMarkdownSources();
} else if (command === "clean") {
  await cleanDemoMarkdownSources();
} else {
  console.error("Usage: npm run demo:setup | npm run demo:clean");
  process.exitCode = 1;
}

async function setupDemoMarkdownSources() {
  await cleanDemoMarkdownSources();

  await writeDemoFile(
    "markdown-source-1/review.md",
    `# Review Checklist

Use this checklist at {now}.

- Correctness
- Regression risk
- Missing tests
`,
  );
  await writeDemoFile(
    "markdown-source-1/coding/refactor.MD",
    `# Refactor Notes

Small refactor planning notes.

Current time: {now}
`,
  );
  await writeDemoFile(
    "markdown-source-1/writing/blog-outline.md",
    `# Blog Outline

Title:

Audience: software engineers

Sections:
- Context
- Key points
- Next steps
`,
  );
  await writeDemoFile("markdown-source-1/ignored.txt", "This text file must not appear in MdClip.\n");
  await writeDemoFile("markdown-source-1/nested/notes.txt", "This nested text file must not appear in MdClip.\n");
  await writeDemoFile("markdown-source-1/.hidden/hidden.md", "# Hidden\n\nThis hidden file must not appear.\n");
  await writeDemoFile("markdown-source-1/.git/ignored.md", "# Git Ignored\n\nThis file must not appear.\n");
  await writeDemoFile(
    "markdown-source-1/node_modules/ignored.md",
    "# Dependency Ignored\n\nThis file must not appear.\n",
  );

  await writeDemoFile(
    "markdown-source-2/meeting/summary.md",
    `# Meeting Summary Template

Notes source:

{clipboard}

Summary:
- Decisions:
- Action items:
`,
  );
  await writeDemoFile(
    "markdown-source-2/research/latest-check.md",
    `# Current Context Header

Current time reference: {now}

Use this file when copied content needs a clear current-time context.
`,
  );
  await writeDemoFile(
    "markdown-source-2/placeholders/all-placeholders.md",
    `# Dynamic Placeholders Check

Use this file to verify Copy Expanded Content.

Date: {date}
Time: {time}
Date and time: {datetime}
Weekday: {day}
Time zone: {timezone}
Now: {now}
UUID 1: {uuid}
UUID 2: {uuid}
Clipboard:
{clipboard}
`,
  );
  await writeDemoFile("markdown-source-2/draft.txt", "This draft file must not appear in MdClip.\n");

  await writeDemoFile(
    "markdown-source-3/simple.md",
    `# Short Reply

Thanks. I will review this and follow up.
`,
  );
  await writeDemoFile(
    "markdown-source-3/placeholders/timezone.md",
    `# Time Zone Context

Current time zone: {timezone}
Current context: {now}
`,
  );

  console.log("Demo Markdown Sources created:");
  console.log(`Markdown Source 1 Folder: ${path.join(demoRoot, "markdown-source-1")}`);
  console.log(`Markdown Source 2 Folder: ${path.join(demoRoot, "markdown-source-2")}`);
  console.log(`Markdown Source 3 Folder: ${path.join(demoRoot, "markdown-source-3")}`);
}

async function cleanDemoMarkdownSources() {
  await assertSafeDemoRoot();
  await rm(demoRoot, { recursive: true, force: true });
}

async function writeDemoFile(relativePath, content) {
  const filePath = path.join(demoRoot, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

async function assertSafeDemoRoot() {
  const relativePath = path.relative(repoRoot, demoRoot);

  if (relativePath !== path.join("demo", "markdown-sources")) {
    throw new Error(`Refusing to remove unexpected path: ${demoRoot}`);
  }
}
