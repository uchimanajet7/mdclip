import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, ".github", "release-manifest.json");

const command = process.argv[2];

if (!["validate", "body", "outputs"].includes(command)) {
  throw new Error("Usage: node scripts/release-manifest.mjs validate|body|outputs [--publish-to-raycast true|false]");
}

const manifest = await readJson(manifestPath);

if (command === "validate") {
  const publishToRaycast = readBooleanOption("--publish-to-raycast");
  await validateManifest(manifest, publishToRaycast);
}

if (command === "body") {
  await validateManifest(manifest, false);
  process.stdout.write(`${await createReleaseBody(manifest)}\n`);
}

if (command === "outputs") {
  await validateManifest(manifest, false);
  process.stdout.write(`tag=${manifest.tag}\n`);
  process.stdout.write(`title=${manifest.title}\n`);
}

async function validateManifest(releaseManifest, publishToRaycast) {
  assert.equal(typeof releaseManifest.tag, "string", "release-manifest.json tag must be a string");
  assert.match(releaseManifest.tag, /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, "tag must use vX.Y.Z format");
  assert.equal(typeof releaseManifest.title, "string", "release-manifest.json title must be a string");
  assert(releaseManifest.title.length > 0, "release title must not be empty");
  assert.equal(typeof releaseManifest.repository, "string", "release-manifest.json repository must be a string");
  assert.match(releaseManifest.repository, /^[^/\s]+\/[^/\s]+$/, "repository must use owner/repository format");

  const bodySource = releaseManifest.githubRelease?.bodySource;
  assert(["changelog-entry", "manifest-notes"].includes(bodySource), "githubRelease.bodySource is invalid");

  if (publishToRaycast && bodySource !== "changelog-entry") {
    throw new Error("Raycast publishing requires githubRelease.bodySource to be changelog-entry");
  }

  if (bodySource === "changelog-entry") {
    const entry = await readChangelogEntry(releaseManifest);
    assert(entry.body.length > 0, "changelog entry body must not be empty");
  }

  if (bodySource === "manifest-notes") {
    const notes = releaseManifest.githubRelease?.notes;
    assert(Array.isArray(notes), "githubRelease.notes must be an array");
    assert(notes.length > 0, "githubRelease.notes must not be empty");
    for (const note of notes) {
      assert.equal(typeof note, "string", "githubRelease.notes entries must be strings");
      assert(note.length > 0, "githubRelease.notes entries must not be empty");
    }
  }
}

async function createReleaseBody(releaseManifest) {
  if (releaseManifest.githubRelease.bodySource === "manifest-notes") {
    return releaseManifest.githubRelease.notes.map((note) => `- ${note}`).join("\n");
  }

  const entry = await readChangelogEntry(releaseManifest);
  const changelogUrl = [
    `https://github.com/${releaseManifest.repository}/blob/${releaseManifest.tag}`,
    entry.file.split(path.sep).join("/"),
  ].join("/");

  return [
    `See [${entry.file} / ${releaseManifest.changelog.entryTitle}](${changelogUrl}#${entry.anchor}).`,
    "",
    entry.body,
  ].join("\n");
}

async function readChangelogEntry(releaseManifest) {
  const changelog = releaseManifest.changelog;
  assert(changelog, "changelog must be defined when githubRelease.bodySource is changelog-entry");
  assert.equal(typeof changelog.file, "string", "changelog.file must be a string");
  assert.equal(typeof changelog.entryTitle, "string", "changelog.entryTitle must be a string");

  const filePath = path.join(repoRoot, changelog.file);
  const text = await readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const headingPattern = new RegExp(`^## \\[${escapeRegExp(changelog.entryTitle)}\\] - .+$`);
  const startIndex = lines.findIndex((line) => headingPattern.test(line));

  assert.notEqual(startIndex, -1, `CHANGELOG.md entry not found: ${changelog.entryTitle}`);

  const bodyLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      break;
    }
    bodyLines.push(lines[index]);
  }

  return {
    file: changelog.file,
    heading: lines[startIndex],
    anchor: createGitHubHeadingAnchor(lines[startIndex].replace(/^##\s+/, "")),
    body: trimBlankLines(bodyLines).join("\n"),
  };
}

function createGitHubHeadingAnchor(headingText) {
  return headingText
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function trimBlankLines(lines) {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start].trim() === "") {
    start += 1;
  }

  while (end > start && lines[end - 1].trim() === "") {
    end -= 1;
  }

  return lines.slice(start, end);
}

function readBooleanOption(name) {
  const optionIndex = process.argv.indexOf(name);

  if (optionIndex === -1) {
    return false;
  }

  const value = process.argv[optionIndex + 1];

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
