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

if (!status.bundledNpmMeetsMinimum) {
  console.error(
    `Latest stable Node.js ${status.latest.nodeVersion} bundles npm ${status.latest.npmVersion}, which does not meet MdClip's npm >=${status.selected.minimumNpmVersion} requirement.`,
  );
  process.exitCode = 1;
}

if (status.actionable) {
  console.error("Toolchain update is available. Run npm run update:toolchain and review the resulting changes.");
  process.exitCode = 1;
} else if (status.bundledNpmMeetsMinimum) {
  console.log("Toolchain freshness check passed.");
}
