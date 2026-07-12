import { execFileSync } from "node:child_process";
import { readProjectToolchain } from "./toolchain.mjs";

const repoRoot = process.cwd();
const { npmVersion } = await readProjectToolchain(repoRoot);
const currentVersion = runForOutput("npm", ["--version"]);

if (currentVersion !== npmVersion) {
  console.log(`Installing project npm ${npmVersion}; current npm is ${currentVersion}.`);
  execFileSync("npm", ["install", "--global", `npm@${npmVersion}`], {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

const installedVersion = runForOutput("npm", ["--version"]);

if (installedVersion !== npmVersion) {
  throw new Error(`Expected npm ${npmVersion} after setup, but npm ${installedVersion} is active`);
}

console.log(`npm ${installedVersion} is active.`);

function runForOutput(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}
