import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const workRoot = path.join(repoRoot, "local-verification");
const fixtureRoot = path.join(workRoot, "local-verification-fixtures");
const distRoot = path.join(workRoot, "local-verification-dist");

await rm(fixtureRoot, { recursive: true, force: true });
await rm(distRoot, { recursive: true, force: true });
await mkdir(fixtureRoot, { recursive: true });
await mkdir(distRoot, { recursive: true });

await verifyManifestMetadata();
await verifyPackageScripts();
await verifyDependabotConfig();
await verifyIconGenerationScript();
await verifyReleaseManifest();
await verifyCommandEntryPoints();
await verifyPromptSetPreferences();
await verifyMarkdownFileListing();
await verifyPreview();
await verifyDynamicPlaceholdersExpansion();

console.log("local verification passed");

async function verifyManifestMetadata() {
  const packageJson = JSON.parse(await readText("package.json"));

  assert.deepEqual(packageJson.keywords, ["prompt", "prompts", "ai", "markdown", "clipboard", "snippet"]);
}

async function verifyPackageScripts() {
  const packageJson = JSON.parse(await readText("package.json"));
  const scripts = packageJson.scripts ?? {};

  assert.deepEqual(Object.keys(scripts).sort(), [
    "build",
    "check",
    "check:format",
    "check:lint",
    "check:local",
    "check:type",
    "demo:clean",
    "demo:setup",
    "dev",
    "fix-lint",
    "format",
    "icon:generate",
    "lint",
    "lint:local",
    "migrate",
    "publish",
    "sync:readme-media",
    "update:dependencies",
  ]);

  assert.equal(scripts.check, "npm run check:type && npm run lint:local && npm run check:local");
  assert.equal(scripts["check:type"], "tsc -p tsconfig.json --noEmit");
  assert.equal(scripts["check:lint"], "eslint src/**");
  assert.equal(scripts["check:format"], "prettier --check src");
  assert.equal(scripts["check:local"], "node scripts/local-verification.mjs");
  assert.equal(scripts["update:dependencies"], "node scripts/update-dependencies.mjs");
  assert.equal(scripts.dev, "ray develop");
  assert.equal(scripts["demo:setup"], "node scripts/demo-prompts.mjs setup");
  assert.equal(scripts["demo:clean"], "node scripts/demo-prompts.mjs clean");
  assert.equal(scripts["sync:readme-media"], "node scripts/sync-readme-media.mjs");
  assert.equal(scripts["icon:generate"], "node scripts/generate-icon.mjs");
  assert.equal(scripts.build, "ray build -e dist");
  assert.equal(scripts["lint:local"], "npm run check:lint && npm run check:format");
  assert.equal(scripts.lint, "ray lint");
  assert.equal(scripts["fix-lint"], "eslint src/** --fix && prettier --write src");
  assert.equal(scripts.migrate, "npx --yes @raycast/migration@latest .");
  assert.equal(scripts.publish, "npx @raycast/api@latest publish");
  assert.equal(scripts.format, "prettier --write src");

  for (const name of [
    "check",
    "check:type",
    "check:lint",
    "check:format",
    "check:local",
    "lint:local",
    "fix-lint",
    "demo:setup",
    "demo:clean",
    "format",
  ]) {
    assert(!/\bray\s+/.test(scripts[name]), `${name} must not call Raycast CLI`);
  }

  await assertFileExists(path.join(repoRoot, "scripts", "demo-prompts.mjs"));
  await assertFileExists(path.join(repoRoot, "scripts", "release-manifest.mjs"));
  await assertFileExists(path.join(repoRoot, "scripts", "generate-icon.mjs"));
  await assertFileExists(path.join(repoRoot, "scripts", "sync-readme-media.mjs"));
  await assertFileExists(path.join(repoRoot, "scripts", "update-dependencies.mjs"));
}

async function verifyDependabotConfig() {
  await assertFileExists(path.join(repoRoot, ".github", "dependabot.yml"));

  const dependabotConfig = await readText(".github/dependabot.yml");

  assert.match(dependabotConfig, /^version: 2$/m);
  assert.match(dependabotConfig, /package-ecosystem: "github-actions"/);
  assert.match(dependabotConfig, /package-ecosystem: "npm"/);
  assert.match(dependabotConfig, /directory: "\/"/);
  assert.equal(countMatches(dependabotConfig, /interval: "weekly"/g), 2);
  assert.equal(countMatches(dependabotConfig, /day: "monday"/g), 2);
  assert.equal(countMatches(dependabotConfig, /time: "09:00"/g), 2);
  assert.equal(countMatches(dependabotConfig, /timezone: "Asia\/Tokyo"/g), 2);
}

async function verifyIconGenerationScript() {
  const iconFixtureRoot = path.join(fixtureRoot, "icon-generate");
  const generatedIconPath = path.join(iconFixtureRoot, "assets", "icon.generated.png");
  const publicIconPath = path.join(iconFixtureRoot, "assets", "icon.png");
  const scriptPath = path.join(repoRoot, "scripts", "generate-icon.mjs");

  await mkdir(iconFixtureRoot, { recursive: true });

  const noResult = await execFileAsync(process.execPath, [scriptPath, "--no"], { cwd: iconFixtureRoot });
  assert.match(noResult.stdout, /Generated assets\/icon\.generated\.png\./);
  assert.match(noResult.stdout, /Skipped\. assets\/icon\.png was not changed\./);
  assert.equal(await fileExists(generatedIconPath), true);
  assert.equal(await fileExists(publicIconPath), false);

  const yesResult = await execFileAsync(process.execPath, [scriptPath, "--yes"], { cwd: iconFixtureRoot });
  assert.match(yesResult.stdout, /Generated assets\/icon\.generated\.png\./);
  assert.match(yesResult.stdout, /Updated assets\/icon\.png and removed assets\/icon\.generated\.png\./);
  assert.equal(await fileExists(publicIconPath), true);
  assert.equal(await fileExists(generatedIconPath), false);
}

async function verifyReleaseManifest() {
  await assertFileExists(path.join(repoRoot, ".github", "release-manifest.json"));
  await assertFileExists(path.join(repoRoot, ".github", "workflows", "build.yml"));
  await assertFileExists(path.join(repoRoot, ".github", "workflows", "publish-release-to-raycast.yml"));
  await assertFileExists(path.join(repoRoot, ".github", "workflows", "release.yml"));
  await assertFileExists(path.join(repoRoot, "CHANGELOG.md"));
  await assertFileExists(path.join(repoRoot, "docs", "release-management.md"));

  const manifest = JSON.parse(await readText(".github/release-manifest.json"));
  assert.equal(manifest.tag, "v0.1.0");
  assert.equal(manifest.title, "v0.1.0");
  assert.equal(manifest.githubRelease.bodySource, "changelog-entry");
  assert.equal(manifest.changelog.file, "CHANGELOG.md");
  assert.equal(manifest.changelog.entryTitle, "Initial Release");

  const { stdout: releaseBody } = await execFileAsync(
    process.execPath,
    [path.join(repoRoot, "scripts", "release-manifest.mjs"), "body"],
    { cwd: repoRoot },
  );

  assert.match(releaseBody, /CHANGELOG\.md \/ Initial Release/);
  assert.match(releaseBody, /blob\/v0\.1\.0\/CHANGELOG\.md#initial-release---pr_merge_date/);
  assert.match(releaseBody, /Add Prompt Set 1, Prompt Set 2, Prompt Set 3, and All Prompt Sets commands\./);

  const publishWorkflow = await readText(".github/workflows/publish-release-to-raycast.yml");
  assert.match(publishWorkflow, /^ {10}RAYCAST_PUBLISH_GITHUB_TOKEN: \$\{\{ secrets\.RAYCAST_PUBLISH_GITHUB_TOKEN \}\}$/m);
  assert.match(publishWorkflow, /^ {10}GITHUB_ACCESS_TOKEN: \$\{\{ secrets\.RAYCAST_PUBLISH_GITHUB_TOKEN \}\}$/m);
  assert.doesNotMatch(publishWorkflow, /^ {10}GITHUB_TOKEN: \$\{\{ secrets\.RAYCAST_PUBLISH_GITHUB_TOKEN \}\}$/m);
  assert.doesNotMatch(publishWorkflow, /^ {10}GH_TOKEN: \$\{\{ secrets\.RAYCAST_PUBLISH_GITHUB_TOKEN \}\}$/m);

  await execFileAsync(
    process.execPath,
    [path.join(repoRoot, "scripts", "release-manifest.mjs"), "validate", "--publish-to-raycast", "true"],
    { cwd: repoRoot },
  );
}

async function verifyCommandEntryPoints() {
  const packageJson = JSON.parse(await readText("package.json"));

  for (const command of packageJson.commands ?? []) {
    const entryPoint = path.join(repoRoot, "src", `${command.name}.tsx`);
    await assertFileExists(entryPoint);
  }
}

async function verifyPromptSetPreferences() {
  const packageJson = JSON.parse(await readText("package.json"));
  const preferences = Object.fromEntries(
    (packageJson.preferences ?? []).map((preference) => [preference.name, preference]),
  );

  for (const index of [1, 2, 3]) {
    assert.equal(preferences[`folder${index}Enabled`].type, "checkbox");
    assert.equal(preferences[`folder${index}Enabled`].title, `Prompt Set ${index}`);
    assert.equal(preferences[`folder${index}Enabled`].label, `Enable Prompt Set ${index}`);
    assert.equal(preferences[`folder${index}Enabled`].default, true);
    assert.equal(preferences[`folder${index}Enabled`].required, false);
    assert.equal(preferences[`folder${index}Directory`].type, "directory");
    assert.equal(preferences[`folder${index}Directory`].required, false);
    assert.equal(preferences[`folder${index}DisplayName`].type, "textfield");
    assert.equal(preferences[`folder${index}DisplayName`].required, false);
  }
}

async function verifyPreviewPreferences() {
  const packageJson = JSON.parse(await readText("package.json"));
  const preferences = Object.fromEntries(
    (packageJson.preferences ?? []).map((preference) => [preference.name, preference]),
  );

  assert.equal(preferences.showPreview, undefined);
  assert.equal(preferences.previewLineCount.type, "textfield");
  assert.equal(preferences.previewLineCount.default, "10");
  assert.equal(preferences.previewMaxCharacters.type, "textfield");
  assert.equal(preferences.previewMaxCharacters.default, "4000");
}

async function verifyMarkdownFileListing() {
  const outputFile = path.join(distRoot, "markdownFiles.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "markdownFiles.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
  });

  const { listPromptFiles } = await import(pathToFileURL(outputFile));
  const promptRoot = path.join(fixtureRoot, "prompts");
  await mkdir(path.join(promptRoot, "nested"), { recursive: true });
  await mkdir(path.join(promptRoot, ".hidden"), { recursive: true });
  await mkdir(path.join(promptRoot, ".git"), { recursive: true });
  await mkdir(path.join(promptRoot, "node_modules"), { recursive: true });
  await writeFile(path.join(promptRoot, "a.md"), "# A\n");
  await writeFile(path.join(promptRoot, "nested", "b.MD"), "# B\n");
  await writeFile(path.join(promptRoot, "c.txt"), "C\n");
  await writeFile(path.join(promptRoot, ".hidden", "hidden.md"), "hidden\n");
  await writeFile(path.join(promptRoot, ".git", "ignored.md"), "git\n");
  await writeFile(path.join(promptRoot, "node_modules", "ignored.md"), "node_modules\n");

  const files = await listPromptFiles({
    id: 1,
    commandTitle: "Prompt Set 1",
    displayName: "Fixture",
    directory: promptRoot,
  });

  assert.deepEqual(
    files.map((file) => file.relativePath),
    ["a.md", path.join("nested", "b.MD")],
  );
  assert(files.every((file) => file.promptSet.displayName === "Fixture"));
  assert(files.every((file) => file.size > 0));
  assert(files.every((file) => file.updatedAt instanceof Date));

  const notDirectoryPath = path.join(fixtureRoot, "not-directory.md");
  await writeFile(notDirectoryPath, "# Not Directory\n");

  await assert.rejects(
    () =>
      listPromptFiles({
        id: 1,
        commandTitle: "Prompt Set 1",
        displayName: "Not Directory",
        directory: notDirectoryPath,
      }),
    /is not a directory/,
  );
}

async function verifyPreview() {
  await verifyPreviewPreferences();

  const outputFile = path.join(distRoot, "preview.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "preview.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
  });

  const { readPromptPreview } = await import(pathToFileURL(outputFile));
  const previewFilePath = path.join(fixtureRoot, "preview.md");
  await writeFile(previewFilePath, ["line1", "line2", "line3", "line4"].join("\n"));

  assert.equal(await readPromptPreview(previewFilePath, { lineCount: 2, maxCharacters: 1000 }), "line1\nline2");
  assert.equal(await readPromptPreview(previewFilePath, { lineCount: 10, maxCharacters: 8 }), "line1\nli");
}

async function verifyDynamicPlaceholdersExpansion() {
  const outputFile = path.join(distRoot, "dynamicPlaceholders.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "dynamicPlaceholders.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
    plugins: [
      {
        name: "raycast-api-stub",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /^@raycast\/api$/ }, () => ({
            path: "raycast-api-stub",
            namespace: "raycast-api-stub",
          }));
          pluginBuild.onLoad({ filter: /.*/, namespace: "raycast-api-stub" }, () => ({
            contents: `
globalThis.__promptLauncherClipboardReadCount = 0;
export const Clipboard = {
  readText: async () => {
    globalThis.__promptLauncherClipboardReadCount += 1;
    return "CLIPBOARD_TEXT";
  },
};
`,
            loader: "js",
          }));
        },
      },
    ],
  });

  const { expandDynamicPlaceholders } = await import(pathToFileURL(outputFile));
  const expanded = await expandDynamicPlaceholders(
    "date={date}\ntime={time}\ndatetime={datetime}\nday={day}\ntimezone={timezone}\nnow={now}\nuuid={uuid}\nclipboard={clipboard}",
  );

  assert.match(expanded, /date=.+/);
  assert.match(expanded, /time=.+/);
  assert.match(expanded, /datetime=.+/);
  assert(!expanded.includes("datetime={datetime}"));
  assert(!expanded.includes("day={day}"));
  assert.match(expanded, /timezone=(.+ )?UTC[+-]\d{2}:\d{2}/);
  assert(!expanded.includes("timezone={timezone}"));
  assert.match(expanded, /now=.+ (.+ )?UTC[+-]\d{2}:\d{2}/);
  assert(!expanded.includes("now={now}"));
  assert.match(expanded, /uuid=[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/);
  assert.match(expanded, /clipboard=CLIPBOARD_TEXT/);
  assert(!expanded.includes("{date}"));
  assert(!expanded.includes("{clipboard}"));
  assert.equal(globalThis.__promptLauncherClipboardReadCount, 1);

  globalThis.__promptLauncherClipboardReadCount = 0;
  await expandDynamicPlaceholders("date={date}\ntimezone={timezone}");
  assert.equal(globalThis.__promptLauncherClipboardReadCount, 0);
}

async function readText(relativePath) {
  return await import("node:fs/promises").then(({ readFile }) => readFile(path.join(repoRoot, relativePath), "utf8"));
}

async function assertFileExists(filePath) {
  await execFileAsync("test", ["-f", filePath]);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function countMatches(value, pattern) {
  return Array.from(value.matchAll(pattern)).length;
}
