import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(readStringOption("--repo-root") ?? process.cwd());
const manifestPath = path.join(repoRoot, ".github", "release-manifest.json");
const supportedCommands = ["validate", "body", "outputs"];

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

async function validateManifest(releaseManifest, options = {}) {
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
    releaseManifest.githubReleaseChangelogFile.startsWith(".github/release-changelog/"),
    "githubReleaseChangelogFile must be under .github/release-changelog/",
  );
  assert(
    releaseManifest.githubReleaseChangelogFile.endsWith(`${releaseManifest.tag}.md`),
    "githubReleaseChangelogFile file name must match tag",
  );

  const changelogText = await readReleaseChangelogFile(releaseManifest.githubReleaseChangelogFile);
  assert(changelogText.trim().length > 0, "githubReleaseChangelogFile must not be empty");
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
