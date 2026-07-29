import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();

await run("npm", ["run", "check:toolchain"]);
await run("npm", ["run", "check:dependencies"]);
await run("npm", ["ci"]);
await run("npm", ["run", "migrate"]);
await run("npm", ["run", "check:dependencies"]);
await run("npx", ["--yes", "npm-check-updates@latest"]);
await run("npx", ["--yes", "npm-check-updates@latest", "--peer", "--enginesNode", "--upgrade"]);
await run("npm", ["install", "--ignore-scripts"]);
await run("npm", ["run", "check:dependencies"]);
await run("npm", ["ci"]);
await run("npm", ["run", "lint"]);
await run("npm", ["run", "build"]);
await run("npm", ["run", "lint:raycast"]);

console.log("Dependencies updated and verified.");

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
