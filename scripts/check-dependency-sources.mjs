import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { compareVersions, parseMinimumNpmVersion } from "./toolchain.mjs";

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
]);

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
const selectedNodeVersion = (await readFile(nodeVersionPath, "utf8")).trim();
parseMinimumNpmVersion(packageJson.engines?.npm);

assert.match(selectedNodeVersion, /^\d+\.\d+\.\d+$/, `${nodeVersionPath} must pin an exact stable Node.js version`);
assert.equal(
  compareVersions(selectedNodeVersion, minimumNodeVersion.slice(2)) >= 0,
  true,
  `${nodeVersionPath} must satisfy engines.node`,
);
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
  Object.hasOwn(packageJson, "packageManager"),
  false,
  `${packageJsonPath} must not require an exact npm version`,
);
assert.equal(
  packageJson.devEngines?.packageManager,
  undefined,
  `${packageJsonPath} devEngines must not require an exact npm version`,
);
assert.equal(
  Object.hasOwn(packageJson.scripts ?? {}, "check:toolchain"),
  false,
  `${packageJsonPath} must not expose a separate toolchain freshness gate`,
);
assert.equal(
  Object.hasOwn(packageJson.scripts ?? {}, "update:toolchain"),
  false,
  `${packageJsonPath} must not split Node.js selection from dependency maintenance`,
);
assert.equal(
  packageJson.scripts?.["update:dependencies"],
  "node scripts/update-dependencies.mjs",
  `${packageJsonPath} must expose the established local dependency apply-and-verify task`,
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
const raycastApiLockfilePackage = packageLock.packages?.["node_modules/@raycast/api"];
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

const raycastNodeTypesContracts = [
  raycastApiLockfilePackage?.dependencies?.["@types/node"],
  raycastApiLockfilePackage?.peerDependencies?.["@types/node"],
].filter(Boolean);
const uniqueRaycastNodeTypesContracts = [...new Set(raycastNodeTypesContracts)];

assert.equal(
  uniqueRaycastNodeTypesContracts.length,
  1,
  `${packageLockPath} @raycast/api must declare one consistent @types/node runtime contract`,
);
assert.match(
  uniqueRaycastNodeTypesContracts[0] ?? "",
  /^\d+\.\d+\.\d+$/,
  `${packageLockPath} @raycast/api must declare an exact @types/node runtime contract`,
);
assert.equal(
  packageJson.devDependencies?.["@types/node"],
  uniqueRaycastNodeTypesContracts[0],
  `${packageJsonPath} @types/node must match the Raycast-managed extension runtime instead of the local maintenance Node.js`,
);
assert.equal(
  rootLockfilePackage?.devDependencies?.["@types/node"],
  uniqueRaycastNodeTypesContracts[0],
  `${packageLockPath} root @types/node must match package.json and the @raycast/api runtime contract`,
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

const dependencyUpdater = await readFile("scripts/update-dependencies.mjs", "utf8");
const toolchainHelper = await readFile("scripts/toolchain.mjs", "utf8");

assert.equal(
  toolchainHelper.includes("compareVersions(release.npm, minimumNpmVersion) >= 0"),
  true,
  "Node.js selection must choose a stable release whose bundled npm satisfies the project minimum",
);
assert.equal(
  toolchainHelper.includes("refusing to downgrade the project selection"),
  true,
  "Node.js selection must not turn a stale or inconsistent release index into a project downgrade",
);
assert.equal(
  /\b(?:writeFile|execFile|spawn)\b/.test(toolchainHelper) || /\b(?:mise|nvm|fnm|volta|asdf)\b/.test(toolchainHelper),
  false,
  "the toolchain helper must remain read-only and independent of local Node.js version managers",
);

const dependencyUpdateCommands = [
  "const toolchainPlan = await getToolchainUpdatePlan(repoRoot)",
  "if (runningNodeVersion !== toolchainPlan.target.nodeVersion)",
  "await writeFile(toolchainPlan.selected.nodeVersionPath",
  'await run("npm", ["run", "check:dependencies"])',
  'await run("npm", ["ci"])',
  'await run("npm", ["run", "migrate"])',
  'await run("npx", ["--yes", "npm-check-updates@latest", "--reject", "@types/node"])',
  '"--enginesNode"',
  '"--upgrade"',
  'await run("npm", ["update", "--ignore-scripts"])',
  "if (await alignNodeTypesWithRaycastRuntime())",
  'await run("npm", ["install", "--ignore-scripts"])',
  'await run("npm", ["run", "check:dependencies"])',
  'await run("npm", ["ci"])',
  'await run("npm", ["run", "lint"])',
  'await run("npm", ["run", "build"])',
  'await run("npm", ["run", "lint:raycast"])',
];
let previousDependencyUpdateCommandIndex = -1;
const dependencyUpdateCommandIndices = dependencyUpdateCommands.map((command) => {
  const commandIndex = dependencyUpdater.indexOf(command, previousDependencyUpdateCommandIndex + 1);
  previousDependencyUpdateCommandIndex = commandIndex;
  return commandIndex;
});

assert.equal(
  dependencyUpdateCommandIndices.every((index) => index !== -1),
  true,
  "dependency updates must preserve the unified preflight, Node selection, policy, migration, candidate, Raycast runtime alignment, clean-install, and verification order",
);
assert.equal(
  findAllIndices(dependencyUpdater, 'await run("npm", ["ci"])').length,
  2,
  "dependency updates must verify one clean baseline and one clean resolved result",
);
assert.equal(
  findAllIndices(dependencyUpdater, 'await run("npm", ["update", "--ignore-scripts"])').length,
  1,
  "dependency updates must refresh the complete compatible transitive graph once",
);
assert.equal(
  findAllIndices(dependencyUpdater, 'await run("npm", ["install", "--ignore-scripts"])').length,
  1,
  "dependency updates must re-resolve the manifest when Raycast runtime type alignment changes it",
);
assert.equal(
  findAllIndices(dependencyUpdater, '"@types/node"').length >= 4 &&
    dependencyUpdater.includes('"--reject", "@types/node"'),
  true,
  "dependency updates must keep @types/node out of generic latest-version selection and align it from @raycast/api",
);
assert.equal(
  dependencyUpdater.includes("Switch Node.js with your preferred version manager") &&
    dependencyUpdater.includes("No files were changed."),
  true,
  "dependency updates must leave local Node.js management to the maintainer and report the no-write preflight stop",
);
assert.equal(
  dependencyUpdater.includes("--legacy-peer-deps") ||
    dependencyUpdater.includes("--force") ||
    dependencyUpdater.includes("dangerously-allow-all-scripts"),
  false,
  "dependency updates must not bypass peer or install-script policy",
);

const workflowPaths = (await readdir(".github/workflows"))
  .filter((fileName) => /\.ya?ml$/.test(fileName))
  .map((fileName) => `.github/workflows/${fileName}`)
  .sort();
const workflowContents = new Map(
  await Promise.all(workflowPaths.map(async (workflowPath) => [workflowPath, await readFile(workflowPath, "utf8")])),
);
const splitToolchainWorkflowPaths = workflowPaths.filter((workflowPath) =>
  /(?:check:toolchain|update:toolchain|scripts\/toolchain\.mjs|nodejs\.org\/dist\/index\.json)/.test(
    workflowContents.get(workflowPath),
  ),
);
const setupNodeWorkflowPaths = workflowPaths.filter((workflowPath) =>
  workflowContents.get(workflowPath).includes("uses: actions/setup-node@"),
);

assert.deepEqual(
  splitToolchainWorkflowPaths,
  [],
  "workflows must not restore a separate Node.js freshness gate outside dependency maintenance",
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
    `${workflowPath} must disable every setup-node npm cache`,
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

const dependencyCheckCommand = "run: npm run check:dependencies";
const installCommand = "run: npm ci";
const buildWorkflow = workflowContents.get(".github/workflows/build.yml");
const buildCheckIndex = buildWorkflow.indexOf(dependencyCheckCommand);
const buildInstallIndex = buildWorkflow.indexOf(installCommand);

assert.equal(
  buildCheckIndex !== -1 && buildCheckIndex < buildInstallIndex,
  true,
  "build workflow must verify dependency policy before its only npm ci",
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
assert.equal(releaseWorkflow.includes(installCommand), false, "release metadata jobs must not reinstall dependencies");

const publishWorkflow = workflowContents.get(".github/workflows/publish-release-to-raycast.yml");
const publishCheckoutIndex = publishWorkflow.indexOf("path: release-source");
const publishNodeIndex = publishWorkflow.indexOf("node-version-file: release-source/.node-version");
const publishCommandIndex = publishWorkflow.indexOf("run: node scripts/publish-raycast-pr.mjs");

assert.equal(
  publishCheckoutIndex < publishNodeIndex && publishNodeIndex < publishCommandIndex,
  true,
  "Raycast publish must select the release artifact Node.js before the nested npm install path",
);

const publishScript = await readFile("scripts/publish-raycast-pr.mjs", "utf8");
assert.equal(
  publishScript.includes('runCommand("npm", ["ci"]') &&
    publishScript.includes('runCommand("npx", ["--yes", "@raycast/api@latest", "publish"]'),
  true,
  "Raycast publish nested npm and npx commands must use the configured registry and latest official Raycast CLI",
);

const registryNeutralFiles = [
  "scripts/toolchain.mjs",
  "scripts/update-dependencies.mjs",
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
  "dependency acquisition, update, CI, and publish paths must inherit the configured registry",
);

const scriptPaths = (await readdir("scripts"))
  .filter((fileName) => fileName.endsWith(".mjs") && fileName !== "check-dependency-sources.mjs")
  .map((fileName) => `scripts/${fileName}`);
const globalNpmMutationPaths = [...scriptPaths, ...workflowPaths];
const globalNpmMutationLocations = [];

for (const filePath of globalNpmMutationPaths) {
  const contents = await readFile(filePath, "utf8");

  if (
    /\bnpm\s+(?:install|i|add|update|upgrade|uninstall|remove|rm)\b[^\n]*(?:--global|-g)(?:\s|$)/.test(contents) ||
    /\[\s*["'](?:install|i|add|update|upgrade|uninstall|remove|rm)["']\s*,\s*["'](?:--global|-g)["']/.test(contents)
  ) {
    globalNpmMutationLocations.push(filePath);
  }
}

assert.deepEqual(
  globalNpmMutationLocations,
  [],
  "project scripts and workflows must not install, update, replace, or remove global npm",
);

const duplicatedToolchainVersionFiles = [];

for (const filePath of workflowPaths) {
  const contents = await readFile(filePath);

  if (contents.includes(`node-version: ${selectedNodeVersion}`)) {
    duplicatedToolchainVersionFiles.push(filePath);
  }
}

assert.deepEqual(
  duplicatedToolchainVersionFiles,
  [],
  "workflow files must derive the Node.js version from .node-version",
);

console.log("dependency source and maintenance verification passed");

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
