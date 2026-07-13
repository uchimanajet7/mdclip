import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readProjectToolchain } from "./toolchain.mjs";

const repoRoot = path.resolve(readStringOption("--repo-root") ?? process.cwd());
const { npmVersion } = await readProjectToolchain(repoRoot);
const bootstrapRoot = mkdtempSync(path.join(os.tmpdir(), "mdclip-npm-bootstrap-"));

try {
  const currentVersion = runForOutput("npm", ["--version"], bootstrapRoot);

  if (currentVersion !== npmVersion) {
    console.log(`Installing project npm ${npmVersion}; current npm is ${currentVersion}.`);
    execFileSync("npm", ["install", "--global", `npm@${npmVersion}`], {
      cwd: bootstrapRoot,
      stdio: "inherit",
    });
  }

  const installedVersion = runForOutput("npm", ["--version"], bootstrapRoot);

  if (installedVersion !== npmVersion) {
    throw new Error(`Expected npm ${npmVersion} after setup, but npm ${installedVersion} is active`);
  }

  console.log(`npm ${installedVersion} is active for ${repoRoot}.`);
} finally {
  rmSync(bootstrapRoot, { recursive: true, force: true });
}

function runForOutput(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
  }).trim();
}

function readStringOption(name) {
  const optionIndex = process.argv.indexOf(name);

  if (optionIndex === -1) {
    return undefined;
  }

  const value = process.argv[optionIndex + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} must have a value`);
  }

  return value;
}
