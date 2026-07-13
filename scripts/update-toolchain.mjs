import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { formatToolchainFreshness, getToolchainFreshness } from "./toolchain.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, "package.json");
const packageLockPath = path.join(repoRoot, "package-lock.json");
const nodeVersionPath = path.join(repoRoot, ".node-version");
const status = await getToolchainFreshness(repoRoot);

for (const line of formatToolchainFreshness(status)) {
  console.log(line);
}

if (status.npmHeldByDependabot) {
  console.warn(
    `npm ${status.latest.npmVersion} remains an explicit hold because Dependabot Core main does not support its major. GitHub hosted Dependabot still requires execution evidence.`,
  );
}

if (!status.actionable) {
  console.log("Selected Node.js and npm are current for the approved toolchain policy.");
  process.exit(0);
}

const originalPackageJsonText = await readFile(packageJsonPath, "utf8");
const originalPackageLockText = await readFile(packageLockPath, "utf8");
const originalNodeVersionText = await readFile(nodeVersionPath, "utf8");
const updatedPackageJson = JSON.parse(originalPackageJsonText);
const targetNodeVersion = status.latest.nodeVersion;
const targetNpmVersion = status.compatible.npmVersion;

updatedPackageJson.packageManager = `npm@${targetNpmVersion}`;
updatedPackageJson.devEngines = {
  ...updatedPackageJson.devEngines,
  packageManager: {
    name: "npm",
    version: targetNpmVersion,
    onFail: "error",
  },
};

try {
  await Promise.all([
    writeFile(nodeVersionPath, `${targetNodeVersion}\n`),
    writeFile(packageJsonPath, `${JSON.stringify(updatedPackageJson, null, 2)}\n`),
  ]);

  await run("node", ["scripts/setup-npm.mjs"]);
  await run("npm", ["install", "--package-lock-only", "--ignore-scripts"]);
} catch (error) {
  await Promise.all([
    writeFile(nodeVersionPath, originalNodeVersionText),
    writeFile(packageJsonPath, originalPackageJsonText),
    writeFile(packageLockPath, originalPackageLockText),
  ]);

  try {
    await run("node", ["scripts/setup-npm.mjs"]);
  } catch (restoreError) {
    throw new AggregateError(
      [error, restoreError],
      "Unable to update the selected toolchain and unable to restore the original global npm",
    );
  }

  throw new Error("Unable to update the selected toolchain; restored toolchain metadata", { cause: error });
}

console.log(`Updated .node-version to ${targetNodeVersion}.`);
console.log(`Updated packageManager and devEngines.packageManager to npm ${targetNpmVersion}.`);

const runningNodeVersion = process.version.replace(/^v/, "");

if (runningNodeVersion !== targetNodeVersion) {
  console.warn(`Toolchain metadata is updated, but verification is not complete under Node.js ${runningNodeVersion}.`);
  console.warn(`Switch to Node.js ${targetNodeVersion}, then run:`);
  console.warn("  node scripts/setup-npm.mjs");
  console.warn("  npm ci");
  console.warn("  npm run lint");
  console.warn("  npm run lint:raycast");
  console.warn("  npm run build");
  process.exitCode = 2;
} else {
  await run("npm", ["run", "check:dependencies"]);
  console.log("Toolchain metadata passed dependency-policy verification under the selected Node.js version.");
}

async function run(command, args) {
  console.log(`> ${[command, ...args].join(" ")}`);
  const result = await execFileAsync(command, args, {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}
