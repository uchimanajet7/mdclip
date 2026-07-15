import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(readStringOption("--repo-root") ?? process.cwd());
const manifestPath = path.join(repoRoot, ".github", "release-manifest.json");
const supportedCommands = ["validate", "body", "outputs"];
const releaseChangelogDirectory = ".github/release-changelog/";
const whatChangesHeading = "## What changes for you";
const installOrUpdateHeading = "## Install or update";
export const legacyReleaseChangelogFileList = Object.freeze([
  ".github/release-changelog/v0.1.0.md",
  ".github/release-changelog/v0.1.1.md",
  ".github/release-changelog/v0.1.2.md",
  ".github/release-changelog/v0.1.3.md",
  ".github/release-changelog/v0.1.4.md",
  ".github/release-changelog/v0.2.0.md",
]);
const legacyReleaseChangelogFiles = new Set(legacyReleaseChangelogFileList);

if (isMainModule()) {
  await main();
}

async function main() {
  const command = process.argv[2];

  if (!supportedCommands.includes(command)) {
    throw new Error("Usage: node scripts/release-manifest.mjs validate|body|outputs [--repo-root path]");
  }

  if (process.argv.includes("--publish-to-raycast")) {
    throw new Error("Raycast Store publish validation is inactive. Use GitHub Release validation without Store flags.");
  }

  const manifest = await readJson(manifestPath);

  if (command === "validate") {
    await validateManifest(manifest);
  }

  if (command === "body") {
    await validateManifest(manifest);
    process.stdout.write(`${await createReleaseBody(manifest)}\n`);
  }

  if (command === "outputs") {
    await validateManifest(manifest);
    process.stdout.write(`tag=${manifest.tag}\n`);
    process.stdout.write(`title=${manifest.title}\n`);
  }
}

export async function validateManifest(releaseManifest) {
  assert.equal(typeof releaseManifest.tag, "string", "release-manifest.json tag must be a string");
  assert.match(releaseManifest.tag, /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, "tag must use vX.Y.Z format");

  assert.equal(typeof releaseManifest.title, "string", "release-manifest.json title must be a string");
  assert(releaseManifest.title.length > 0, "release title must not be empty");

  assert.equal(typeof releaseManifest.previousGitHubReleaseTag, "string", "previousGitHubReleaseTag must be a string");
  assert.match(
    releaseManifest.previousGitHubReleaseTag,
    /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
    "previousGitHubReleaseTag must use vX.Y.Z format",
  );
  assert.notEqual(
    releaseManifest.previousGitHubReleaseTag,
    releaseManifest.tag,
    "previousGitHubReleaseTag must not be the same as tag",
  );

  assert.equal(
    typeof releaseManifest.githubReleaseChangelogFile,
    "string",
    "githubReleaseChangelogFile must be a string",
  );
  assert(
    releaseManifest.githubReleaseChangelogFile.startsWith(releaseChangelogDirectory),
    `githubReleaseChangelogFile must be under ${releaseChangelogDirectory}`,
  );
  assert(
    releaseManifest.githubReleaseChangelogFile.endsWith(`${releaseManifest.tag}.md`),
    "githubReleaseChangelogFile file name must match tag",
  );

  const changelogText = await readReleaseChangelogFile(releaseManifest.githubReleaseChangelogFile);
  assert(changelogText.trim().length > 0, "githubReleaseChangelogFile must not be empty");
  validateReleaseChangelog(releaseManifest.githubReleaseChangelogFile, changelogText);
}

export function validateReleaseChangelog(file, changelogText) {
  const lines = normalizeReleaseChangelogLines(changelogText);

  if (legacyReleaseChangelogFiles.has(file)) {
    validateCorrectionMarkers(lines, { legacy: true });
    return;
  }

  assert.equal(lines[0], whatChangesHeading, `release body must start with exactly: ${whatChangesHeading}`);

  const headings = lines.filter((line) => /^#{1,6}(?:\s|$)/.test(line));
  assert.deepEqual(
    headings,
    [whatChangesHeading, installOrUpdateHeading],
    "release body must contain exactly the two approved headings in the approved order",
  );

  const installOrUpdateIndex = lines.indexOf(installOrUpdateHeading);
  assert(installOrUpdateIndex > 0, `release body must contain exactly: ${installOrUpdateHeading}`);

  const whatChangesLines = lines.slice(1, installOrUpdateIndex);
  const installOrUpdateLines = lines.slice(installOrUpdateIndex + 1);

  validateBulletSection(whatChangesHeading, whatChangesLines);
  validateBulletSection(installOrUpdateHeading, installOrUpdateLines);
  validateCorrectionMarkers(lines, { legacy: false });
}

function validateBulletSection(heading, lines) {
  const contentLines = lines.filter((line) => line.length > 0);

  assert(contentLines.length > 0, `${heading} must contain at least one list item`);

  for (const line of contentLines) {
    assert.match(line, /^- \S/, `${heading} may contain only non-empty '- ' list items`);
  }
}

function validateCorrectionMarkers(lines, { legacy }) {
  const listItems = lines.filter((line) => /^- \S/.test(line));
  const correctionItemIndexes = [];

  for (const [index, line] of listItems.entries()) {
    if (!line.startsWith("- **Correction")) {
      continue;
    }

    const match = line.match(/^- \*\*Correction \((\d{4})-(\d{2})-(\d{2})\):\*\* \S/);
    assert(match, "Correction items must start with exactly: - **Correction (YYYY-MM-DD):**");
    assertValidCalendarDate(match[1], match[2], match[3]);
    correctionItemIndexes.push(index);
  }

  if (correctionItemIndexes.length === 0) {
    return;
  }

  if (legacy) {
    assert.deepEqual(
      correctionItemIndexes,
      correctionItemIndexes.map((_, index) => index),
      "legacy Correction items must be the first body list items",
    );
    return;
  }

  for (const heading of [whatChangesHeading, installOrUpdateHeading]) {
    const headingIndex = lines.indexOf(heading);
    const nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && /^#{1,6}(?:\s|$)/.test(line));
    const sectionEnd = nextHeadingIndex === -1 ? lines.length : nextHeadingIndex;
    const sectionItems = lines.slice(headingIndex + 1, sectionEnd).filter((line) => /^- \S/.test(line));
    const sectionCorrectionIndexes = sectionItems
      .map((line, index) => (line.startsWith("- **Correction") ? index : -1))
      .filter((index) => index !== -1);

    assert.deepEqual(
      sectionCorrectionIndexes,
      sectionCorrectionIndexes.map((_, index) => index),
      `${heading} Correction items must precede ordinary items`,
    );
  }
}

function assertValidCalendarDate(yearText, monthText, dayText) {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  assert(
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day,
    "Correction date must be a valid calendar date",
  );
}

function normalizeReleaseChangelogLines(changelogText) {
  return changelogText.replaceAll("\r\n", "\n").replace(/\n+$/, "").split("\n");
}

async function createReleaseBody(releaseManifest) {
  return (await readReleaseChangelogFile(releaseManifest.githubReleaseChangelogFile)).trimEnd();
}

async function readReleaseChangelogFile(file) {
  return readFile(path.join(repoRoot, file), "utf8");
}

function readStringOption(name) {
  const optionIndex = process.argv.indexOf(name);

  if (optionIndex === -1) {
    return undefined;
  }

  const value = process.argv[optionIndex + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} must have a value`);
  }

  return value;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isMainModule() {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}
