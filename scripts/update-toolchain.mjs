import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { formatToolchainFreshness, getToolchainFreshness } from "./toolchain.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const nodeVersionPath = path.join(repoRoot, ".node-version");
const status = await getToolchainFreshness(repoRoot);

for (const line of formatToolchainFreshness(status)) {
  console.log(line);
}

if (!status.bundledNpmMeetsMinimum) {
  throw new Error(
    `Latest stable Node.js ${status.latest.nodeVersion} bundles npm ${status.latest.npmVersion}, which does not meet MdClip's npm >=${status.selected.minimumNpmVersion} requirement`,
  );
}

if (!status.actionable) {
  console.log("Selected Node.js is current.");
  process.exit(0);
}

const originalNodeVersionText = await readFile(nodeVersionPath, "utf8");
const targetNodeVersion = status.latest.nodeVersion;

try {
  await writeFile(nodeVersionPath, `${targetNodeVersion}\n`);
} catch (error) {
  await writeFile(nodeVersionPath, originalNodeVersionText);
  throw new Error("Unable to update the selected Node.js version; restored .node-version", { cause: error });
}

console.log(`Updated .node-version to ${targetNodeVersion}.`);

const runningNodeVersion = process.version.replace(/^v/, "");

if (runningNodeVersion !== targetNodeVersion) {
  console.warn(`Toolchain metadata is updated, but verification is not complete under Node.js ${runningNodeVersion}.`);
  console.warn(`Switch to Node.js ${targetNodeVersion}, then run:`);
  console.warn("  npm ci");
  console.warn("  npm run lint");
  console.warn("  npm run lint:raycast");
  console.warn("  npm run build");
  process.exitCode = 2;
} else {
  await run("npm", ["run", "check:dependencies"]);
  console.log("Node.js selection passed dependency-policy verification.");
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
