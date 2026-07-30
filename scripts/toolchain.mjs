import { readFile } from "node:fs/promises";
import path from "node:path";

export const nodeReleaseIndex = "https://nodejs.org/dist/index.json";

export async function readProjectToolchain(repoRoot = process.cwd()) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const nodeVersionPath = path.join(repoRoot, ".node-version");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const nodeVersion = parseExactVersion((await readFile(nodeVersionPath, "utf8")).trim(), ".node-version");
  const minimumNpmVersion = parseMinimumNpmVersion(packageJson.engines?.npm);

  return {
    nodeVersion,
    minimumNpmVersion,
    packageJson,
    packageJsonPath,
    nodeVersionPath,
  };
}

export async function getToolchainUpdatePlan(repoRoot = process.cwd()) {
  const selected = await readProjectToolchain(repoRoot);
  const target = await getLatestCompatibleStableNode(selected.minimumNpmVersion);
  const selectionComparison = compareVersions(selected.nodeVersion, target.nodeVersion);

  if (selectionComparison > 0) {
    throw new Error(
      `.node-version ${selected.nodeVersion} is newer than the latest compatible stable Node.js ${target.nodeVersion}; refusing to downgrade the project selection`,
    );
  }

  return {
    target,
    selected: {
      nodeVersion: selected.nodeVersion,
      minimumNpmVersion: selected.minimumNpmVersion,
      nodeVersionPath: selected.nodeVersionPath,
    },
    nodeVersionChangeRequired: selectionComparison < 0,
  };
}

export function formatToolchainUpdatePlan(plan) {
  return [
    `Current .node-version: ${plan.selected.nodeVersion}`,
    `Target stable Node.js: ${plan.target.nodeVersion}`,
    `npm bundled with target Node.js: ${plan.target.npmVersion}`,
    `Minimum npm required by MdClip: ${plan.selected.minimumNpmVersion}`,
    plan.nodeVersionChangeRequired
      ? `Project Node.js selection: update required (${plan.selected.nodeVersion} -> ${plan.target.nodeVersion})`
      : "Project Node.js selection: current",
  ];
}

export function parseMinimumNpmVersion(value) {
  if (typeof value !== "string") {
    throw new Error("package.json engines.npm must define a minimum npm version");
  }

  const match = value.match(/^>=(\d+\.\d+\.\d+)$/);

  if (!match) {
    throw new Error(`package.json engines.npm must use a >= exact-version range; received ${value}`);
  }

  return match[1];
}

export function compareVersions(left, right) {
  const leftParts = parseExactVersion(left, "version").split(".").map(Number);
  const rightParts = parseExactVersion(right, "version").split(".").map(Number);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }

  return 0;
}

async function getLatestCompatibleStableNode(minimumNpmVersion) {
  const releases = await fetchJson(nodeReleaseIndex);

  if (!Array.isArray(releases)) {
    throw new Error("Node.js release index did not return an array");
  }

  const latestCompatibleStable = releases.find(
    (release) =>
      typeof release?.version === "string" &&
      /^v\d+\.\d+\.\d+$/.test(release.version) &&
      typeof release.npm === "string" &&
      /^\d+\.\d+\.\d+$/.test(release.npm) &&
      compareVersions(release.npm, minimumNpmVersion) >= 0,
  );

  if (!latestCompatibleStable) {
    throw new Error(`Node.js release index did not contain a stable release with bundled npm >=${minimumNpmVersion}`);
  }

  return {
    nodeVersion: parseExactVersion(latestCompatibleStable.version.replace(/^v/, ""), "target stable Node.js version"),
    npmVersion: parseExactVersion(latestCompatibleStable.npm, "bundled npm version"),
  };
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "mdclip-dependency-maintenance" },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
  }

  return await response.text();
}

function parseExactVersion(value, label) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`${label} must be an exact stable version; received ${value}`);
  }

  return value;
}
