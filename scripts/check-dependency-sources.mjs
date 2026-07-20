import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { compareVersions, parseMinimumNpmVersion, parseNpmPackageManager } from "./toolchain.mjs";

const execFileAsync = promisify(execFile);
const npmrcPath = ".npmrc";
const nodeVersionPath = ".node-version";
const packageJsonPath = "package.json";
const packageLockPath = "package-lock.json";
const minimumNodeVersion = ">=22.22.2";
const minimumNpmVersion = ">=11.17.0";
const expectedNpmrcLines = [
  "omit-lockfile-registry-resolved=true",
  "strict-peer-deps=true",
  "strict-allow-scripts=true",
  "engine-strict=true",
];
const nodeWorkflowVersionFiles = new Map([
  [".github/workflows/build.yml", [".node-version"]],
  [".github/workflows/release.yml", [".node-version", ".node-version"]],
  [".github/workflows/publish-release-to-raycast.yml", ["release-source/.node-version"]],
  [".github/workflows/toolchain-freshness.yml", [".node-version"]],
]);
const forbiddenRegistryHost = ["npm", "flatt", "tech"].join(".");

const npmrcLines = (await readFile(npmrcPath, "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith(";"));

assert.deepEqual(
  npmrcLines,
  expectedNpmrcLines,
  `${npmrcPath} must omit registry resolved URLs, enforce peer dependencies and install-script review, and contain no registry or authentication settings`,
);

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const selectedNpmVersion = parseNpmPackageManager(packageJson.packageManager);
const selectedNodeVersion = (await readFile(nodeVersionPath, "utf8")).trim();
const minimumSelectedNpmVersion = parseMinimumNpmVersion(packageJson.engines?.npm);

assert.match(selectedNodeVersion, /^\d+\.\d+\.\d+$/, `${nodeVersionPath} must pin an exact stable Node.js version`);
assert.equal(
  packageJson.engines?.node,
  minimumNodeVersion,
  `${packageJsonPath} must declare the Raycast Node.js minimum`,
);
assert.equal(
  packageJson.engines?.npm,
  minimumNpmVersion,
  `${packageJsonPath} must require an npm version that enforces the install-script policy`,
);
assert.equal(
  compareVersions(selectedNpmVersion, minimumSelectedNpmVersion) >= 0,
  true,
  `${packageJsonPath} packageManager must satisfy engines.npm`,
);
assert.deepEqual(
  packageJson.devEngines?.packageManager,
  { name: "npm", version: selectedNpmVersion, onFail: "error" },
  `${packageJsonPath} devEngines must enforce the exact selected npm version`,
);
assert.equal(
  packageJson.scripts?.["check:toolchain"],
  "node scripts/check-toolchain-freshness.mjs",
  `${packageJsonPath} must expose the read-only toolchain freshness check`,
);
assert.equal(
  packageJson.scripts?.["update:toolchain"],
  "node scripts/update-toolchain.mjs",
  `${packageJsonPath} must separate toolchain updates from dependency updates`,
);
assert.equal(
  packageJson.scripts?.migrate,
  "npx --yes @raycast/migration@latest .",
  `${packageJsonPath} migration must run the latest official Raycast migration package non-interactively`,
);

const projectDependencyNames = Object.keys({
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
  ...(packageJson.optionalDependencies ?? {}),
});
assert.equal(
  projectDependencyNames.includes("@raycast/migration"),
  false,
  `${packageJsonPath} must not pin the on-demand Raycast migration package as a project dependency`,
);

const packageLock = JSON.parse(await readFile(packageLockPath, "utf8"));
const rootLockfilePackage = packageLock.packages?.[""];
const packageEntries = Object.entries(packageLock.packages ?? {});
const resolvedEntries = packageEntries.filter(([, packageMetadata]) => packageMetadata.resolved !== undefined);
const missingIntegrityEntries = packageEntries.filter(
  ([packagePath, packageMetadata]) =>
    packagePath.length > 0 &&
    packageMetadata.version !== undefined &&
    packageMetadata.link !== true &&
    packageMetadata.inBundle !== true &&
    packageMetadata.integrity === undefined,
);
const installScriptPackages = [
  ...new Set(
    packageEntries
      .filter(([, packageMetadata]) => packageMetadata.hasInstallScript === true)
      .map(([packagePath]) => packageNameFromLockfilePath(packagePath)),
  ),
].sort();
const installScriptPolicy = packageJson.allowScripts ?? {};
const installScriptPolicyPackages = Object.keys(installScriptPolicy).sort();
const invalidInstallScriptPolicyValues = Object.entries(installScriptPolicy)
  .filter(([, decision]) => typeof decision !== "boolean")
  .map(([packageName]) => packageName);

assert.deepEqual(
  rootLockfilePackage?.engines,
  packageJson.engines,
  `${packageLockPath} root engines must match package.json`,
);
assert.deepEqual(
  resolvedEntries.map(([packagePath]) => packagePath),
  [],
  `${packageLockPath} must not pin registry-specific resolved URLs`,
);
assert.deepEqual(
  missingIntegrityEntries.map(([packagePath]) => packagePath),
  [],
  `${packageLockPath} packages must retain integrity metadata`,
);
assert.deepEqual(
  installScriptPolicyPackages,
  installScriptPackages,
  `${packageJsonPath} allowScripts must review every package with an install script by package name, without version pins or stale entries`,
);
assert.deepEqual(invalidInstallScriptPolicyValues, [], `${packageJsonPath} allowScripts decisions must be boolean`);

const setupNpmScript = await readFile("scripts/setup-npm.mjs", "utf8");
assert.equal(
  setupNpmScript.includes('readStringOption("--repo-root")') &&
    setupNpmScript.includes("mkdtempSync") &&
    setupNpmScript.includes("cwd: bootstrapRoot") &&
    setupNpmScript.includes("--ignore-scripts"),
  true,
  "npm bootstrap must support artifact roots and install the selected npm from the configured registry outside the guarded repository without lifecycle scripts",
);

const dependencyUpdater = await readFile("scripts/update-dependencies.mjs", "utf8");
const initialDependencyCheckIndex = dependencyUpdater.indexOf('await run("npm", ["run", "check:dependencies"])');
const migrationCommand = 'await run("npm", ["run", "migrate"])';
const migrationIndex = dependencyUpdater.indexOf(migrationCommand);
const dependencyManifestReadIndex = dependencyUpdater.indexOf(
  'const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))',
);
const dependencyUpdateIndex = dependencyUpdater.indexOf(
  'await run("npm", ["update", "--save", "--strict-peer-deps", "--ignore-scripts"])',
);
assert.equal(
  dependencyUpdater.includes("getToolchainFreshness") ||
    dependencyUpdater.includes('writeFile(path.join(repoRoot, ".node-version")'),
  false,
  "dependency updates must not change the selected Node.js or npm toolchain",
);
assert.equal(
  dependencyUpdater.includes("mdclip-dependency-resolution-") &&
    dependencyUpdater.includes("--package-lock-only") &&
    dependencyUpdater.includes("--ignore-scripts") &&
    dependencyUpdater.includes('await run("npm", ["ci"])'),
  true,
  "dependency updates must use isolated npm resolution, suppress lifecycle scripts while changing the lockfile, and then perform one clean install through the configured registry",
);
assert.equal(
  initialDependencyCheckIndex !== -1 &&
    initialDependencyCheckIndex < migrationIndex &&
    migrationIndex < dependencyManifestReadIndex &&
    dependencyManifestReadIndex < dependencyUpdateIndex,
  true,
  "dependency updates must verify policy, run the latest Raycast migration through the configured registry, rebuild targets from its result, and only then update dependencies",
);
assert.equal(
  findAllIndices(dependencyUpdater, migrationCommand).length,
  1,
  "dependency updates must run Raycast migration exactly once before advancing dependency versions",
);

const workflowPaths = (await readdir(".github/workflows"))
  .filter((fileName) => /\.ya?ml$/.test(fileName))
  .map((fileName) => `.github/workflows/${fileName}`)
  .sort();
const workflowContents = new Map(
  await Promise.all(workflowPaths.map(async (workflowPath) => [workflowPath, await readFile(workflowPath, "utf8")])),
);
const setupNodeWorkflowPaths = workflowPaths.filter((workflowPath) =>
  workflowContents.get(workflowPath).includes("uses: actions/setup-node@"),
);

assert.deepEqual(
  setupNodeWorkflowPaths,
  [...nodeWorkflowVersionFiles.keys()].sort(),
  "every workflow that uses setup-node must have an explicit bootstrap classification",
);

for (const [workflowPath, workflow] of workflowContents) {
  assert.equal(/^[ \t]+cache:\s*["']?npm["']?\s*$/m.test(workflow), false, `${workflowPath} must not cache npm`);

  for (const match of workflow.matchAll(/^\s*uses:\s+([^\s#]+)(?:\s+#.*)?$/gm)) {
    const actionReference = match[1];

    if (actionReference.startsWith("./")) {
      continue;
    }

    assert.match(
      actionReference,
      /^[^@]+@[0-9a-f]{40}$/,
      `${workflowPath} external actions must use immutable full commit SHAs`,
    );
  }
}

for (const [workflowPath, expectedVersionFiles] of nodeWorkflowVersionFiles) {
  const workflow = workflowContents.get(workflowPath);

  assert.equal(
    findAllIndices(workflow, "uses: actions/setup-node@").length,
    expectedVersionFiles.length,
    `${workflowPath} must have the expected Node.js setup paths`,
  );
  assert.equal(
    findAllIndices(workflow, "package-manager-cache: false").length,
    expectedVersionFiles.length,
    `${workflowPath} must disable every setup-node npm cache before npm bootstrap`,
  );
  assert.equal(
    /^\s*node-version:/m.test(workflow),
    false,
    `${workflowPath} must not duplicate a literal Node.js version`,
  );

  const configuredVersionFiles = [...workflow.matchAll(/^\s*node-version-file:\s*(\S+)\s*$/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(
    configuredVersionFiles,
    expectedVersionFiles,
    `${workflowPath} must derive every Node.js setup from the expected source artifact`,
  );
}

const setupNpmCommand = "run: node scripts/setup-npm.mjs";
const dependencyCheckCommand = "run: npm run check:dependencies";
const installCommand = "run: npm ci";
const buildWorkflow = workflowContents.get(".github/workflows/build.yml");
const buildSetupIndex = buildWorkflow.indexOf(setupNpmCommand);
const buildCheckIndex = buildWorkflow.indexOf(dependencyCheckCommand);
const buildInstallIndex = buildWorkflow.indexOf(installCommand);

assert.equal(
  buildSetupIndex !== -1 && buildSetupIndex < buildCheckIndex && buildCheckIndex < buildInstallIndex,
  true,
  "build workflow must bootstrap selected npm and verify policy before its only npm ci",
);
assert.equal(findAllIndices(buildWorkflow, installCommand).length, 1, "build workflow must own one dependency install");
assert.equal(
  /NPM_CONFIG_(?:REGISTRY|USERCONFIG|GLOBALCONFIG)/.test(buildWorkflow),
  false,
  "build workflow must leave registry and npm config selection to the execution environment",
);

const releaseWorkflow = workflowContents.get(".github/workflows/release.yml");
assert.equal(
  releaseWorkflow.includes("uses: ./.github/workflows/build.yml"),
  true,
  "release workflow must reuse the verified build workflow",
);
assert.equal(releaseWorkflow.includes(setupNpmCommand), false, "release metadata jobs must not bootstrap unused npm");
assert.equal(releaseWorkflow.includes(installCommand), false, "release metadata jobs must not reinstall dependencies");

const publishWorkflow = workflowContents.get(".github/workflows/publish-release-to-raycast.yml");
const publishCheckoutIndex = publishWorkflow.indexOf("path: release-source");
const publishNodeIndex = publishWorkflow.indexOf("node-version-file: release-source/.node-version");
const publishNpmIndex = publishWorkflow.indexOf("run: node scripts/setup-npm.mjs --repo-root release-source");
const publishCommandIndex = publishWorkflow.indexOf("run: node scripts/publish-raycast-pr.mjs");

assert.equal(
  publishCheckoutIndex < publishNodeIndex &&
    publishNodeIndex < publishNpmIndex &&
    publishNpmIndex < publishCommandIndex,
  true,
  "Raycast publish must select the release artifact Node.js and npm before the nested install path",
);

const publishScript = await readFile("scripts/publish-raycast-pr.mjs", "utf8");
assert.equal(
  publishScript.includes('runCommand("npm", ["ci"]') &&
    publishScript.includes('runCommand("npx", ["--yes", "@raycast/api@latest", "publish"]'),
  true,
  "Raycast publish nested npm and npx commands must use the configured registry and latest official Raycast CLI",
);

const registryNeutralFiles = [
  "scripts/setup-npm.mjs",
  "scripts/toolchain.mjs",
  "scripts/update-dependencies.mjs",
  "scripts/update-toolchain.mjs",
  "scripts/publish-raycast-pr.mjs",
  ".github/workflows/build.yml",
];
const registryOverrideMarkers = [
  "registry.npmjs.org",
  "NPM_CONFIG_REGISTRY",
  "NPM_CONFIG_USERCONFIG",
  "NPM_CONFIG_GLOBALCONFIG",
  "npm-registry-policy",
  "--registry=",
];
const registryOverrideLocations = [];

for (const filePath of registryNeutralFiles) {
  const contents = await readFile(filePath, "utf8");

  for (const marker of registryOverrideMarkers) {
    if (contents.includes(marker)) {
      registryOverrideLocations.push(`${filePath}: ${marker}`);
    }
  }
}

assert.deepEqual(
  registryOverrideLocations,
  [],
  "dependency acquisition, bootstrap, update, CI, and publish paths must inherit the configured registry",
);

const freshnessWorkflow = workflowContents.get(".github/workflows/toolchain-freshness.yml");
assert.equal(
  freshnessWorkflow.includes("permissions:\n  contents: read"),
  true,
  "toolchain freshness workflow must remain read-only",
);
assert.equal(
  freshnessWorkflow.includes('cron: "17 9 * * 2"') && freshnessWorkflow.includes('timezone: "Asia/Tokyo"'),
  true,
  "toolchain freshness workflow must run weekly away from the start of the hour",
);
assert.equal(
  freshnessWorkflow.indexOf(setupNpmCommand) < freshnessWorkflow.indexOf("run: npm run check:toolchain"),
  true,
  "toolchain freshness workflow must bootstrap npm before the project freshness check",
);

const { stdout: repositoryFilesOutput } = await execFileAsync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
    encoding: "buffer",
    maxBuffer: 1024 * 1024 * 20,
  },
);
const repositoryFiles = repositoryFilesOutput
  .toString("utf8")
  .split("\0")
  .filter((filePath) => filePath.length > 0);
const forbiddenRegistryFiles = [];
const duplicatedToolchainVersionFiles = [];
const duplicatedNpmVersionDeclaration = `${["NPM", "VERSION"].join("_")}: ${selectedNpmVersion}`;

for (const filePath of repositoryFiles) {
  const contents = await readFile(filePath);

  if (contents.includes(forbiddenRegistryHost)) {
    forbiddenRegistryFiles.push(filePath);
  }

  if (
    filePath.startsWith(".github/workflows/") &&
    (contents.includes(duplicatedNpmVersionDeclaration) || contents.includes(`node-version: ${selectedNodeVersion}`))
  ) {
    duplicatedToolchainVersionFiles.push(filePath);
  }
}

assert.deepEqual(
  forbiddenRegistryFiles,
  [],
  `repository files must not contain the workstation-specific registry host ${forbiddenRegistryHost}`,
);
assert.deepEqual(
  duplicatedToolchainVersionFiles,
  [],
  "workflow files must derive Node.js and npm versions from their repository sources of truth",
);

console.log("dependency source and toolchain verification passed");

function packageNameFromLockfilePath(packagePath) {
  const nodeModulesSegment = "node_modules/";
  const packageLocation = packagePath.slice(packagePath.lastIndexOf(nodeModulesSegment) + nodeModulesSegment.length);
  const packagePathSegments = packageLocation.split("/");

  return packageLocation.startsWith("@") ? packagePathSegments.slice(0, 2).join("/") : packagePathSegments[0];
}

function findAllIndices(contents, value) {
  const indices = [];
  let searchIndex = 0;

  while ((searchIndex = contents.indexOf(value, searchIndex)) !== -1) {
    indices.push(searchIndex);
    searchIndex += value.length;
  }

  return indices;
}
