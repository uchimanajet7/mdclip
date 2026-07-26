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

export async function getToolchainFreshness(repoRoot = process.cwd()) {
  const selected = await readProjectToolchain(repoRoot);
  const latest = await getLatestStableNode();
  const nodeUpdateAvailable = compareVersions(latest.nodeVersion, selected.nodeVersion) > 0;
  const bundledNpmMeetsMinimum = compareVersions(latest.npmVersion, selected.minimumNpmVersion) >= 0;

  return {
    latest,
    selected: {
      nodeVersion: selected.nodeVersion,
      minimumNpmVersion: selected.minimumNpmVersion,
    },
    nodeUpdateAvailable,
    bundledNpmMeetsMinimum,
    actionable: nodeUpdateAvailable,
  };
}

export function formatToolchainFreshness(status) {
  const lines = [
    `Selected Node.js: ${status.selected.nodeVersion}`,
    `Latest stable Node.js: ${status.latest.nodeVersion}`,
    `npm bundled with latest stable Node.js: ${status.latest.npmVersion}`,
    `Minimum npm required by MdClip: ${status.selected.minimumNpmVersion}`,
    status.bundledNpmMeetsMinimum
      ? "Bundled npm status: compatible"
      : `Bundled npm status: incompatible (requires npm >=${status.selected.minimumNpmVersion})`,
  ];

  lines.push(
    status.nodeUpdateAvailable
      ? `Node.js status: update available (${status.selected.nodeVersion} -> ${status.latest.nodeVersion})`
      : "Node.js status: current",
  );

  return lines;
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

async function getLatestStableNode() {
  const releases = await fetchJson(nodeReleaseIndex);

  if (!Array.isArray(releases)) {
    throw new Error("Node.js release index did not return an array");
  }

  const latestStable = releases.find(
    (release) =>
      typeof release?.version === "string" &&
      /^v\d+\.\d+\.\d+$/.test(release.version) &&
      typeof release.npm === "string" &&
      /^\d+\.\d+\.\d+$/.test(release.npm),
  );

  if (!latestStable) {
    throw new Error("Node.js release index did not contain a stable release with bundled npm");
  }

  return {
    nodeVersion: parseExactVersion(latestStable.version.replace(/^v/, ""), "latest stable Node.js version"),
    npmVersion: parseExactVersion(latestStable.npm, "bundled npm version"),
  };
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "mdclip-toolchain-check" },
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
