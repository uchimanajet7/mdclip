import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { formatToolchainFreshness, getToolchainFreshness } from "./toolchain.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, "package.json");
const packageLockPath = path.join(repoRoot, "package-lock.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const dependencyTargets = [
  ...Object.keys(packageJson.dependencies ?? {}).map((name) => ({ name, saveFlag: "--save" })),
  ...Object.keys(packageJson.devDependencies ?? {}).map((name) => ({ name, saveFlag: "--save-dev" })),
];
const heldDependencies = [];

await updateProjectToolchain();

if (dependencyTargets.length > 0) {
  await run("npm", ["update", "--save", "--strict-peer-deps"]);
  await updateDirectDependenciesToLatest(dependencyTargets);
}

await run("npm", ["run", "check:dependencies"]);
await run("npm", ["run", "migrate"]);
await run("npm", ["run", "check"]);

if (heldDependencies.length > 0) {
  console.warn("Latest versions blocked by peer dependencies:");

  for (const dependency of heldDependencies) {
    console.warn(
      `- ${dependency.name}: kept ${dependency.currentVersion}; latest is ${dependency.latestVersion}; ${dependency.reason}`,
    );
  }
}

console.log("Dependencies updated.");

async function updateProjectToolchain() {
  const status = await getToolchainFreshness(repoRoot);

  for (const line of formatToolchainFreshness(status)) {
    console.log(line);
  }

  if (status.nodeUpdateAvailable) {
    await writeFile(path.join(repoRoot, ".node-version"), `${status.latest.nodeVersion}\n`);
    console.log(`Updated .node-version to the latest Node.js LTS ${status.latest.nodeVersion}.`);
  }

  if (status.npmHeldByDependabot) {
    console.warn(
      `npm ${status.latest.npmVersion} is held because current Dependabot does not support npm ${status.latest.npmVersion.split(".")[0]}.`,
    );
  }

  if (!status.compatibleNpmUpdateAvailable) {
    return;
  }

  const packageJsonBefore = await readFile(packageJsonPath, "utf8");
  const updatedPackageJson = JSON.parse(packageJsonBefore);
  updatedPackageJson.packageManager = `npm@${status.compatible.npmVersion}`;
  await writeFile(packageJsonPath, `${JSON.stringify(updatedPackageJson, null, 2)}\n`);

  try {
    await run("node", ["scripts/setup-npm.mjs"]);
  } catch (error) {
    await writeFile(packageJsonPath, packageJsonBefore);
    await run("node", ["scripts/setup-npm.mjs"]);
    throw new Error(`Unable to adopt npm ${status.compatible.npmVersion}; restored the previous npm selection`, {
      cause: error,
    });
  }

  console.log(`Updated packageManager to npm@${status.compatible.npmVersion}.`);
}

async function updateDirectDependenciesToLatest(targets) {
  const latestVersions = new Map(
    await Promise.all(targets.map(async (target) => [target.name, await getLatestVersion(target.name)])),
  );
  const baselineVersions = new Map(
    await Promise.all(targets.map(async (target) => [target.name, await getInstalledVersion(target.name)])),
  );
  let pendingTargets = targets.filter(
    (target) => baselineVersions.get(target.name) !== latestVersions.get(target.name),
  );
  const peerConflicts = new Map();

  while (pendingTargets.length > 0) {
    const deferredTargets = [];
    let updatedCount = 0;

    for (const target of pendingTargets) {
      const latestVersion = latestVersions.get(target.name);

      if ((await getInstalledVersion(target.name)) === latestVersion) {
        continue;
      }

      const result = await tryInstallVersion(target, latestVersion);

      if (result.status === "updated") {
        updatedCount += 1;
        peerConflicts.delete(target.name);
      } else {
        deferredTargets.push(target);
        peerConflicts.set(target.name, result);
      }
    }

    pendingTargets = deferredTargets;

    if (updatedCount === 0) {
      break;
    }
  }

  for (const target of pendingTargets) {
    const latestVersion = latestVersions.get(target.name);
    const baselineVersion = baselineVersions.get(target.name);
    const peerConflict = peerConflicts.get(target.name);
    const compatibleVersion = await getNewestPeerCompatibleVersion(target.name, baselineVersion, peerConflict.output);

    if (compatibleVersion !== baselineVersion) {
      const result = await tryInstallVersion(target, compatibleVersion);

      if (result.status === "updated") {
        heldDependencies.push({
          name: target.name,
          currentVersion: compatibleVersion,
          latestVersion,
          reason: formatPeerConflictReason(peerConflict.output, target.name),
        });
        continue;
      }
    }

    heldDependencies.push({
      name: target.name,
      currentVersion: await getInstalledVersion(target.name),
      latestVersion,
      reason: formatPeerConflictReason(peerConflict.output, target.name),
    });
  }
}

async function getLatestVersion(packageName) {
  const { stdout } = await runQuiet("npm", ["view", `${packageName}@latest`, "version", "--json"]);
  return parseNpmViewVersions(stdout).at(-1);
}

async function getInstalledVersion(packageName) {
  const packageLock = JSON.parse(await readFile(packageLockPath, "utf8"));
  const version = packageLock.packages?.[`node_modules/${packageName}`]?.version;

  if (typeof version !== "string") {
    throw new Error(`Unable to read the installed version of ${packageName} from package-lock.json`);
  }

  return version;
}

async function getNewestPeerCompatibleVersion(packageName, baselineVersion, errorOutput) {
  const peerRanges = extractPeerRanges(errorOutput, packageName);

  if (peerRanges.length === 0) {
    return baselineVersion;
  }

  const matchingVersionLists = await Promise.all(
    peerRanges.map(async (peerRange) => {
      const { stdout } = await runQuiet("npm", ["view", `${packageName}@${peerRange}`, "version", "--json"]);
      return parseNpmViewVersions(stdout);
    }),
  );
  const matchingVersions = matchingVersionLists.reduce(
    (intersection, versions) => intersection.filter((version) => versions.includes(version)),
    matchingVersionLists[0],
  );

  if (!matchingVersions.includes(baselineVersion)) {
    return baselineVersion;
  }

  return matchingVersions.at(-1) ?? baselineVersion;
}

async function tryInstallVersion(target, version) {
  const args = ["install", `${target.name}@${version}`, target.saveFlag, "--strict-peer-deps"];
  const packageJsonBefore = await readFile(packageJsonPath, "utf8");
  const packageLockBefore = await readFile(packageLockPath, "utf8");

  console.log(`> npm ${args.join(" ")}`);

  try {
    const result = await execFileAsync("npm", args, commandOptions());
    writeCommandOutput(result);
    return { status: "updated" };
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;

    if (!isPeerDependencyConflict(output)) {
      writeCommandOutput(error);
      throw error;
    }

    const packageJsonAfter = await readFile(packageJsonPath, "utf8");
    const packageLockAfter = await readFile(packageLockPath, "utf8");

    if (packageJsonAfter !== packageJsonBefore || packageLockAfter !== packageLockBefore) {
      throw new Error(`npm changed dependency metadata while rejecting ${target.name}@${version}`);
    }

    return { status: "peer-conflict", output };
  }
}

function extractPeerRanges(errorOutput, packageName) {
  const escapedPackageName = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const peerRangePattern = new RegExp(`peer(?:Optional)? ${escapedPackageName}@"([^"]+)"`, "g");
  return [...new Set([...errorOutput.matchAll(peerRangePattern)].map((match) => match[1]))];
}

function formatPeerConflictReason(errorOutput, packageName) {
  const peerRanges = extractPeerRanges(errorOutput, packageName);

  if (peerRanges.length > 0) {
    return `required peer range${peerRanges.length === 1 ? "" : "s"}: ${peerRanges.join(", ")}`;
  }

  return "the current dependency tree rejected the latest version with ERESOLVE";
}

function isPeerDependencyConflict(output) {
  return /\bERESOLVE\b/.test(output) && /\bpeer(?:Optional)?\b/.test(output);
}

function parseNpmViewVersions(stdout) {
  const parsed = JSON.parse(stdout);
  const versions = Array.isArray(parsed) ? parsed : [parsed];
  const stringVersions = versions.filter((version) => typeof version === "string");

  if (stringVersions.length === 0) {
    throw new Error("npm view did not return a package version");
  }

  return stringVersions;
}

async function run(command, args) {
  console.log(`> ${[command, ...args].join(" ")}`);

  try {
    const result = await execFileAsync(command, args, commandOptions());
    writeCommandOutput(result);
  } catch (error) {
    writeCommandOutput(error);
    throw error;
  }
}

async function runQuiet(command, args) {
  return await execFileAsync(command, args, commandOptions());
}

function commandOptions() {
  return {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 20,
  };
}

function writeCommandOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}
