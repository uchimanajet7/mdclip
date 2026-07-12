import { appendFile } from "node:fs/promises";
import { formatToolchainFreshness, getToolchainFreshness } from "./toolchain.mjs";

const status = await getToolchainFreshness(process.cwd());
const lines = formatToolchainFreshness(status);

for (const line of lines) {
  console.log(line);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    ["## Toolchain freshness", "", ...lines.map((line) => `- ${line}`), ""].join("\n"),
  );
}

if (status.npmHeldByDependabot) {
  console.warn(
    `::warning::npm ${status.latest.npmVersion} is available but held because current Dependabot does not support its major version.`,
  );
}

if (status.actionable) {
  console.error("Toolchain update is available. Run npm run update:dependencies and review the resulting changes.");
  process.exitCode = 1;
} else {
  console.log("Toolchain freshness check passed.");
}
