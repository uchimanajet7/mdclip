import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { findPeerDependencyBlockers, formatHeldDependency } from "./peer-dependency-report.mjs";
import { compareVersions } from "./toolchain.mjs";

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
    for (const line of formatHeldDependency(dependency)) {
      console.warn(line);
    }
  }
}

console.log("Dependencies updated.");

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
  const latestPeerConflicts = new Map();
  while (pendingTargets.length > 0) {
    const deferredTargets = [];
    let updatedCount = 0;

    for (const target of pendingTargets) {
      const latestVersion = latestVersions.get(target.name);

      if ((await getInstalledVersion(target.name)) === latestVersion) {
        continue;
      }

      const result = await tryResolveVersion(target, latestVersion);

      if (result.status === "compatible") {
        latestPeerConflicts.delete(target.name);
        await installVersion(target, latestVersion);
        updatedCount += 1;
      } else {
        latestPeerConflicts.set(target.name, result.output);
        deferredTargets.push(target);
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
    const compatibleVersion = await getNewestPeerCompatibleVersion(target, baselineVersion, latestVersion);

    if (compatibleVersion !== baselineVersion) {
      await installVersion(target, compatibleVersion);
    }

    heldDependencies.push({
      name: target.name,
      currentVersion: await getInstalledVersion(target.name),
      latestVersion,
      blockers: await findPeerDependencyBlockers(target.name, latestVersion, repoRoot),
      resolverOutput: latestPeerConflicts.get(target.name),
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

async function getNewestPeerCompatibleVersion(target, baselineVersion, latestVersion) {
  const { stdout } = await runQuiet("npm", ["view", target.name, "versions", "--json"]);
  const candidates = parseNpmViewVersions(stdout)
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
    .filter((version) => compareVersions(version, baselineVersion) > 0 && compareVersions(version, latestVersion) < 0)
    .sort((left, right) => compareVersions(right, left));

  for (const candidate of candidates) {
    const result = await tryResolveVersion(target, candidate);

    if (result.status === "compatible") {
      return candidate;
    }
  }

  return baselineVersion;
}

async function tryResolveVersion(target, version) {
  const args = ["install", `${target.name}@${version}`, target.saveFlag, "--strict-peer-deps"];
  const temporaryProject = await mkdtemp(path.join(os.tmpdir(), "mdclip-dependency-resolution-"));

  try {
    await Promise.all([
      copyFile(packageJsonPath, path.join(temporaryProject, "package.json")),
      copyFile(packageLockPath, path.join(temporaryProject, "package-lock.json")),
      copyFile(path.join(repoRoot, ".npmrc"), path.join(temporaryProject, ".npmrc")),
    ]);

    try {
      await execFileAsync(
        "npm",
        [...args, "--package-lock-only", "--ignore-scripts"],
        commandOptions(temporaryProject),
      );
      return { status: "compatible" };
    } catch (error) {
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;

      if (!isPeerDependencyConflict(output)) {
        writeCommandOutput(error);
        throw error;
      }

      return { status: "peer-conflict", output: output.trim() };
    }
  } finally {
    await rm(temporaryProject, { recursive: true, force: true });
  }
}

async function installVersion(target, version) {
  const args = ["install", `${target.name}@${version}`, target.saveFlag, "--strict-peer-deps"];
  await run("npm", args);
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

async function runQuiet(command, args, cwd = repoRoot) {
  return await execFileAsync(command, args, commandOptions(cwd));
}

function commandOptions(cwd = repoRoot) {
  return {
    cwd,
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
