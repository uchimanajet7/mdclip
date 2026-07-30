import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { formatToolchainUpdatePlan, getToolchainUpdatePlan } from "./toolchain.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();

const toolchainPlan = await getToolchainUpdatePlan(repoRoot);

for (const line of formatToolchainUpdatePlan(toolchainPlan)) {
  console.log(line);
}

const runningNodeVersion = process.version.replace(/^v/, "");

if (runningNodeVersion !== toolchainPlan.target.nodeVersion) {
  throw new Error(
    `Dependency maintenance requires Node.js ${toolchainPlan.target.nodeVersion}, but the current process is Node.js ${runningNodeVersion}. Switch Node.js with your preferred version manager, then rerun npm run update:dependencies. No files were changed.`,
  );
}

if (toolchainPlan.nodeVersionChangeRequired) {
  await writeFile(toolchainPlan.selected.nodeVersionPath, `${toolchainPlan.target.nodeVersion}\n`);
  console.log(`Updated .node-version to ${toolchainPlan.target.nodeVersion}.`);
}

await run("npm", ["run", "check:dependencies"]);
await run("npm", ["ci"]);
await run("npm", ["run", "migrate"]);
await run("npx", ["--yes", "npm-check-updates@latest", "--reject", "@types/node"]);
await run("npx", [
  "--yes",
  "npm-check-updates@latest",
  "--peer",
  "--enginesNode",
  "--reject",
  "@types/node",
  "--upgrade",
]);
await run("npm", ["update", "--ignore-scripts"]);

if (await alignNodeTypesWithRaycastRuntime()) {
  await run("npm", ["install", "--ignore-scripts"]);
}

await run("npm", ["run", "check:dependencies"]);
await run("npm", ["ci"]);
await run("npm", ["run", "lint"]);
await run("npm", ["run", "build"]);
await run("npm", ["run", "lint:raycast"]);

console.log("Dependencies updated and verified.");

async function alignNodeTypesWithRaycastRuntime() {
  const packageJsonPath = new URL("../package.json", import.meta.url);
  const raycastApiPackagePath = new URL("../node_modules/@raycast/api/package.json", import.meta.url);
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const raycastApiPackage = JSON.parse(await readFile(raycastApiPackagePath, "utf8"));
  const dependencyContract = raycastApiPackage.dependencies?.["@types/node"];
  const peerContract = raycastApiPackage.peerDependencies?.["@types/node"];
  const declaredContracts = [...new Set([dependencyContract, peerContract].filter(Boolean))];

  if (declaredContracts.length !== 1 || !/^\d+\.\d+\.\d+$/.test(declaredContracts[0])) {
    throw new Error(
      `@raycast/api must declare one exact @types/node runtime contract; received ${declaredContracts.join(", ") || "none"}`,
    );
  }

  const runtimeNodeTypesVersion = declaredContracts[0];

  if (packageJson.devDependencies?.["@types/node"] === runtimeNodeTypesVersion) {
    console.log(`@types/node already matches the Raycast runtime contract (${runtimeNodeTypesVersion}).`);
    return false;
  }

  if (!packageJson.devDependencies || !Object.hasOwn(packageJson.devDependencies, "@types/node")) {
    throw new Error("package.json devDependencies must contain @types/node");
  }

  packageJson.devDependencies["@types/node"] = runtimeNodeTypesVersion;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`Aligned @types/node with the Raycast runtime contract (${runtimeNodeTypesVersion}).`);
  return true;
}

async function run(command, args) {
  console.log(`> ${[command, ...args].join(" ")}`);

  try {
    const result = await execFileAsync(command, args, commandOptions());
    writeCommandOutput(result);
  } catch (error) {
    writeCommandOutput(error);
    console.error(
      "Dependency update stopped. Review the command output and current working-tree changes before deciding the next step.",
    );
    throw error;
  }
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
