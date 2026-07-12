import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
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
const installWorkflowSetupCounts = new Map([
  [".github/workflows/build.yml", 1],
  [".github/workflows/release.yml", 2],
]);
const nodeWorkflowSetupCounts = new Map([
  [".github/workflows/build.yml", 1],
  [".github/workflows/release.yml", 2],
  [".github/workflows/publish-release-to-raycast.yml", 1],
  [".github/workflows/toolchain-freshness.yml", 1],
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
  { name: "npm", version: minimumNpmVersion, onFail: "error" },
  `${packageJsonPath} devEngines must fail source operations that use an npm version below the policy minimum`,
);
assert.equal(
  packageJson.scripts?.["check:toolchain"],
  "node scripts/check-toolchain-freshness.mjs",
  `${packageJsonPath} must expose the read-only toolchain freshness check`,
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

const setupNpmCommand = "run: node scripts/setup-npm.mjs";
const dependencyCheckCommand = "run: npm run check:dependencies";
const installCommand = "run: npm ci";

for (const [workflowPath, expectedSetupCount] of installWorkflowSetupCounts) {
  const workflow = await readFile(workflowPath, "utf8");
  const setupCommandIndices = findAllIndices(workflow, setupNpmCommand);
  const dependencyCheckCommandIndices = findAllIndices(workflow, dependencyCheckCommand);
  const installCommandIndices = findAllIndices(workflow, installCommand);

  assert.equal(
    setupCommandIndices.length,
    expectedSetupCount,
    `${workflowPath} must set up package.json#packageManager for every install path`,
  );
  assert.equal(
    dependencyCheckCommandIndices.length,
    expectedSetupCount,
    `${workflowPath} must verify dependency policy for every install path`,
  );
  assert.equal(installCommandIndices.length, expectedSetupCount, `${workflowPath} must use the expected install paths`);

  for (let installIndex = 0; installIndex < expectedSetupCount; installIndex += 1) {
    assert.equal(
      setupCommandIndices[installIndex] < dependencyCheckCommandIndices[installIndex] &&
        dependencyCheckCommandIndices[installIndex] < installCommandIndices[installIndex],
      true,
      `${workflowPath} must set up selected npm and verify dependency policy before each npm ci`,
    );
  }
}

for (const [workflowPath, expectedSetupCount] of nodeWorkflowSetupCounts) {
  const workflow = await readFile(workflowPath, "utf8");

  assert.equal(
    findAllIndices(workflow, "node-version-file: .node-version").length,
    expectedSetupCount,
    `${workflowPath} must use .node-version for every Node.js setup path`,
  );
  assert.equal(
    /^\s*node-version:/m.test(workflow),
    false,
    `${workflowPath} must not duplicate a literal Node.js version`,
  );
}

const freshnessWorkflow = await readFile(".github/workflows/toolchain-freshness.yml", "utf8");
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
  freshnessWorkflow.includes("run: npm run check:toolchain"),
  true,
  "toolchain freshness workflow must run the project freshness check",
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
