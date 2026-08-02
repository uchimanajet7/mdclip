import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { compareVersions, parseMinimumNodeVersion, parseMinimumNpmVersion } from "./toolchain.mjs";

const execFileAsync = promisify(execFile);
const directDependencySections = ["dependencies", "devDependencies", "optionalDependencies"];
const runtimeContractManagedDependencies = new Set(["@types/node"]);

export async function updateDependencies({ repoRoot = process.cwd(), runCommand = run } = {}) {
  const execute = runCommand === run ? createCommandRunner(repoRoot) : runCommand;
  const repoRootUrl = pathToFileURL(`${repoRoot}/`);
  const packageJsonPath = new URL("package.json", repoRootUrl);
  const packageLockPath = new URL("package-lock.json", repoRootUrl);
  const initialPackageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const initialPackageLock = JSON.parse(await readFile(packageLockPath, "utf8"));
  const runningNodeVersion = process.version.replace(/^v/, "");
  const runningNpmVersion = await readNpmVersion(execute);

  assertMaintenanceRuntime({
    nodeVersion: runningNodeVersion,
    npmVersion: runningNpmVersion,
    engines: initialPackageJson.engines,
  });
  console.log(
    `Dependency maintenance runtime satisfies package.json engines (Node.js ${runningNodeVersion}, npm ${runningNpmVersion}).`,
  );

  await execute("npm", ["run", "check:dependencies", "--", "--allow-direct-range-drift"]);
  await execute("npm", ["ci"]);
  await execute("npm", ["run", "migrate"]);
  printOutdatedReport("Dependency candidates before resolution:", await readOutdated(execute));
  await applyCompatibleDependencyUpdates(execute);

  if (await alignNodeTypesWithRaycastRuntime(repoRootUrl)) {
    await execute("npm", ["install", "--ignore-scripts"]);
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageLock = JSON.parse(await readFile(packageLockPath, "utf8"));
  const rangeDrift = getDirectDependencyRangeDrift(packageJson, packageLock);
  const directDependencyDowngrades = getDirectDependencyDowngrades(
    initialPackageJson,
    initialPackageLock,
    packageJson,
    packageLock,
  );

  if (rangeDrift.length > 0) {
    throw new Error(
      `Dependency update left package.json lower bounds behind the resolved direct dependencies: ${formatRangeDrift(rangeDrift)}`,
    );
  }

  if (directDependencyDowngrades.length > 0) {
    throw new Error(
      `Dependency update would downgrade resolved direct dependencies: ${formatDirectDependencyDowngrades(directDependencyDowngrades)}`,
    );
  }

  const finalOutdated = await readOutdated(execute);
  const finalStatus = classifyOutdated(finalOutdated, {
    contractManagedNames: runtimeContractManagedDependencies,
  });
  printOutdatedReport("Dependency status after resolution:", finalOutdated);

  if (finalStatus.allowedUpdatesPending.length > 0) {
    throw new Error(
      `Dependency update did not apply all versions allowed by package.json: ${finalStatus.allowedUpdatesPending.join(", ")}`,
    );
  }

  await execute("npm", ["run", "check:dependencies"]);
  await execute("npm", ["ci"]);
  await execute("npm", ["run", "lint"]);
  await execute("npm", ["run", "build"]);
  await execute("npm", ["run", "lint:raycast"]);

  console.log("Dependencies within declared ranges updated and verified.");

  if (finalStatus.contractManaged.length > 0) {
    console.log(
      `Managed by the @raycast/api runtime contract instead of the registry latest tag: ${finalStatus.contractManaged.join(", ")}`,
    );
  }

  if (finalStatus.maintainerDecisionRequired.length > 0) {
    console.log(
      `Maintainer decision required for latest versions outside declared ranges: ${finalStatus.maintainerDecisionRequired.join(", ")}`,
    );
  } else {
    console.log("No direct dependency requires a maintainer decision for a version outside its declared range.");
  }
}

export function assertMaintenanceRuntime({ nodeVersion, npmVersion, engines }) {
  const minimumNodeVersion = parseMinimumNodeVersion(engines?.node);
  const minimumNpmVersion = parseMinimumNpmVersion(engines?.npm);
  const unsupported = [];

  if (compareVersions(nodeVersion, minimumNodeVersion) < 0) {
    unsupported.push(`Node.js ${nodeVersion} does not satisfy ${engines.node}`);
  }

  if (compareVersions(npmVersion, minimumNpmVersion) < 0) {
    unsupported.push(`npm ${npmVersion} does not satisfy ${engines.npm}`);
  }

  if (unsupported.length > 0) {
    throw new Error(`Dependency maintenance runtime is outside package.json engines: ${unsupported.join("; ")}`);
  }
}

export async function applyCompatibleDependencyUpdates(runCommand) {
  await runCommand("npm", ["update", "--save", "--ignore-scripts"]);
}

export async function alignNodeTypesWithRaycastRuntime(repoRootUrl) {
  const packageJsonPath = new URL("package.json", repoRootUrl);
  const raycastApiPackagePath = new URL("node_modules/@raycast/api/package.json", repoRootUrl);
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const raycastApiPackage = JSON.parse(await readFile(raycastApiPackagePath, "utf8"));
  const runtimeNodeTypesVersion = getRaycastNodeTypesContract(raycastApiPackage);
  const declaredNodeTypesVersion = packageJson.devDependencies?.["@types/node"];

  if (!/^\d+\.\d+\.\d+$/.test(declaredNodeTypesVersion ?? "")) {
    throw new Error("package.json devDependencies must contain an exact @types/node version");
  }

  if (compareVersions(runtimeNodeTypesVersion, declaredNodeTypesVersion) < 0) {
    throw new Error(
      `@raycast/api requires @types/node ${runtimeNodeTypesVersion}, which would downgrade the root contract from ${declaredNodeTypesVersion}`,
    );
  }

  if (declaredNodeTypesVersion === runtimeNodeTypesVersion) {
    console.log(`@types/node matches the @raycast/api runtime contract (${runtimeNodeTypesVersion}).`);
    return false;
  }

  packageJson.devDependencies["@types/node"] = runtimeNodeTypesVersion;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`Aligned @types/node with the @raycast/api runtime contract (${runtimeNodeTypesVersion}).`);
  return true;
}

export function getRaycastNodeTypesContract(raycastApiPackage) {
  const contracts = [
    raycastApiPackage.dependencies?.["@types/node"],
    raycastApiPackage.peerDependencies?.["@types/node"],
  ].filter(Boolean);
  const uniqueContracts = [...new Set(contracts)];

  if (uniqueContracts.length !== 1 || !/^\d+\.\d+\.\d+$/.test(uniqueContracts[0])) {
    throw new Error(
      `@raycast/api must declare one exact @types/node runtime contract; received ${uniqueContracts.join(", ") || "none"}`,
    );
  }

  return uniqueContracts[0];
}

export function classifyOutdated(outdated, { contractManagedNames = new Set() } = {}) {
  const allowedUpdatesPending = [];
  const contractManaged = [];
  const maintainerDecisionRequired = [];

  for (const [name, details] of Object.entries(outdated).sort(([left], [right]) => left.localeCompare(right))) {
    if (details.current !== details.wanted) {
      allowedUpdatesPending.push(`${name} (${details.current ?? "missing"} -> ${details.wanted})`);
    } else if (details.wanted !== details.latest) {
      const update = `${name} (${details.wanted} -> ${details.latest})`;
      if (contractManagedNames.has(name)) {
        contractManaged.push(update);
      } else {
        maintainerDecisionRequired.push(update);
      }
    }
  }

  return { allowedUpdatesPending, contractManaged, maintainerDecisionRequired };
}

export function getDirectDependencyRangeDrift(packageJson, packageLock) {
  const drift = [];

  for (const section of directDependencySections) {
    for (const [name, declaredRange] of Object.entries(packageJson[section] ?? {})) {
      const rangeMatch = typeof declaredRange === "string" && declaredRange.match(/^(\^|~)?(\d+\.\d+\.\d+)$/);
      const installedVersion = packageLock.packages?.[`node_modules/${name}`]?.version;

      if (!rangeMatch || !installedVersion) {
        continue;
      }

      if (rangeMatch[2] !== installedVersion) {
        drift.push({ name, section, declaredRange, installedVersion });
      }
    }
  }

  return drift.sort((left, right) => left.name.localeCompare(right.name));
}

export function getDirectDependencyDowngrades(
  initialPackageJson,
  initialPackageLock,
  finalPackageJson,
  finalPackageLock,
) {
  const initialVersions = getResolvedDirectDependencyVersions(initialPackageJson, initialPackageLock);
  const finalVersions = getResolvedDirectDependencyVersions(finalPackageJson, finalPackageLock);
  const downgrades = [];

  for (const [name, initialVersion] of initialVersions) {
    const finalVersion = finalVersions.get(name);

    if (finalVersion && compareVersions(finalVersion, initialVersion) < 0) {
      downgrades.push({ name, initialVersion, finalVersion });
    }
  }

  return downgrades.sort((left, right) => left.name.localeCompare(right.name));
}

function formatRangeDrift(rangeDrift) {
  return rangeDrift
    .map(({ name, declaredRange, installedVersion }) => `${name} (${declaredRange}, resolved ${installedVersion})`)
    .join(", ");
}

function formatDirectDependencyDowngrades(downgrades) {
  return downgrades
    .map(({ name, initialVersion, finalVersion }) => `${name} (${initialVersion} -> ${finalVersion})`)
    .join(", ");
}

function getResolvedDirectDependencyVersions(packageJson, packageLock) {
  const names = new Set(directDependencySections.flatMap((section) => Object.keys(packageJson[section] ?? {})));

  return new Map(
    [...names]
      .map((name) => [name, packageLock.packages?.[`node_modules/${name}`]?.version])
      .filter(([, version]) => typeof version === "string"),
  );
}

async function readNpmVersion(runCommand) {
  const result = await runCommand("npm", ["--version"], { writeOutput: false });
  return result.stdout?.trim() ?? "";
}

async function readOutdated(runCommand) {
  const result = await runCommand("npm", ["outdated", "--json", "--long"], {
    acceptedExitCodes: [0, 1],
    writeOutput: false,
  });
  const output = result.stdout?.trim();

  if (!output) {
    return {};
  }

  const outdated = JSON.parse(output);

  if (Array.isArray(outdated) || outdated === null || typeof outdated !== "object") {
    throw new Error("npm outdated did not return a dependency object");
  }

  return outdated;
}

function printOutdatedReport(label, outdated) {
  console.log(label);

  const entries = Object.entries(outdated).sort(([left], [right]) => left.localeCompare(right));

  if (entries.length === 0) {
    console.log("  None");
    return;
  }

  for (const [name, details] of entries) {
    console.log(
      `  ${name}: current ${details.current ?? "missing"}, wanted ${details.wanted}, latest ${details.latest}`,
    );
  }
}

function createCommandRunner(repoRoot) {
  return (command, args, options) => run(command, args, options, repoRoot);
}

async function run(command, args, { acceptedExitCodes = [0], writeOutput = true } = {}, repoRoot = process.cwd()) {
  console.log(`> ${[command, ...args].join(" ")}`);

  try {
    const result = await execFileAsync(command, args, commandOptions(repoRoot));
    if (writeOutput) {
      writeCommandOutput(result);
    }
    return result;
  } catch (error) {
    if (acceptedExitCodes.includes(Number(error.code))) {
      if (writeOutput) {
        writeCommandOutput(error);
      }
      return error;
    }

    writeCommandOutput(error);
    console.error(
      "Dependency update stopped. Review the command output and current working-tree changes before deciding the next step.",
    );
    throw error;
  }
}

function commandOptions(repoRoot) {
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await updateDependencies();
}
