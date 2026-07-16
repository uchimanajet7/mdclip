import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ignoredDirectories = new Set([".git", "_local", "node_modules", "dist", "local-verification", "demo"]);

const documentFamilies = Object.freeze([
  {
    id: "readme",
    english: "README.md",
    japanese: "README.ja.md",
    englishSelector: "English | [日本語](README.ja.md)",
    japaneseSelector: "[English](README.md) | 日本語",
  },
  {
    id: "getting-started",
    english: "docs/getting-started.md",
    japanese: "docs/getting-started.ja.md",
    englishSelector: "English | [日本語](getting-started.ja.md)",
    japaneseSelector: "[English](getting-started.md) | 日本語",
  },
]);

const expectedPairedDocumentReferences = Object.freeze([
  reference("README.md", "README.ja.md"),
  reference("README.md", "docs/getting-started.md"),
  reference("README.ja.md", "README.md"),
  reference("README.ja.md", "docs/getting-started.ja.md"),
  reference("docs/getting-started.md", "README.md"),
  reference("docs/getting-started.md", "docs/getting-started.ja.md"),
  reference("docs/getting-started.ja.md", "README.ja.md"),
  reference("docs/getting-started.ja.md", "docs/getting-started.md"),
  reference("docs/local-verification.md", "docs/getting-started.ja.md"),
  reference("docs/release-management.md", "docs/getting-started.ja.md"),
  reference("docs/screenshot-media.md", "docs/getting-started.md"),
]);

const forbiddenPathFragments = Object.freeze([
  ["getting-started", "en", "md"].join("."),
  ["getting-started", "jp", "md"].join("."),
]);

if (isMainModule()) {
  await validateDocumentationLanguageContract({ repoRoot: process.cwd() });
  process.stdout.write("Documentation language contract passed.\n");
}

export async function validateDocumentationLanguageContract({ repoRoot }) {
  assert.equal(typeof repoRoot, "string", "repoRoot must be a string");

  const pairedPaths = new Set();

  for (const family of documentFamilies) {
    pairedPaths.add(family.english);
    pairedPaths.add(family.japanese);
    await validateFamilyMember(repoRoot, family.id, family.english, family.englishSelector);
    await validateFamilyMember(repoRoot, family.id, family.japanese, family.japaneseSelector);
  }

  const markdownFiles = await listMarkdownFiles(repoRoot);
  const actualPairedReferences = [];

  for (const source of markdownFiles) {
    const content = await readFile(path.join(repoRoot, source), "utf8");

    for (const forbiddenPath of forbiddenPathFragments) {
      assert(!content.includes(forbiddenPath), `${source} contains forbidden noncanonical path ${forbiddenPath}`);
    }

    for (const target of extractLocalMarkdownTargets(source, content)) {
      if (pairedPaths.has(target)) {
        actualPairedReferences.push(reference(source, target));
      }
    }
  }

  assert.deepEqual(
    [...new Set(actualPairedReferences)].sort(),
    [...expectedPairedDocumentReferences].sort(),
    "paired-document references must exactly match the registered same-language and reciprocal routes",
  );
}

async function validateFamilyMember(repoRoot, familyId, relativePath, expectedSelector) {
  let content;

  try {
    content = await readFile(path.join(repoRoot, relativePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      assert.fail(`${familyId} is missing required document ${relativePath}`);
    }
    throw error;
  }

  const lines = content.replaceAll("\r\n", "\n").split("\n");
  assert.match(lines[0] ?? "", /^# \S/, `${relativePath} must start with one H1 title`);
  assert.equal(lines[1], "", `${relativePath} must place one blank line after its H1 title`);
  assert.equal(
    lines[2],
    expectedSelector,
    `${relativePath} must place the exact reciprocal language selector immediately after its H1 title`,
  );
}

async function listMarkdownFiles(root, relativeDirectory = "") {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await listMarkdownFiles(root, relativePath)));
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

function extractLocalMarkdownTargets(source, content) {
  const targets = [];
  const linkPattern = /!?\[[^\]]*\]\(([^)\n]+)\)/g;

  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "").split(/\s+/)[0];

    if (!rawTarget || rawTarget.startsWith("#") || /^[a-z][a-z0-9+.-]*:/iu.test(rawTarget)) {
      continue;
    }

    const pathOnly = rawTarget.split("#", 1)[0].split("?", 1)[0];
    const resolved = pathOnly.startsWith("/")
      ? pathOnly.slice(1)
      : path.posix.join(path.posix.dirname(source), pathOnly);
    targets.push(path.posix.normalize(resolved));
  }

  return targets;
}

function reference(source, target) {
  return `${source} -> ${target}`;
}

function isMainModule() {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}
