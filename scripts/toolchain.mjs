import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const dependabotNpmSupportSource =
  "https://raw.githubusercontent.com/dependabot/dependabot-core/main/npm_and_yarn/lib/dependabot/npm_and_yarn/npm_package_manager.rb";
export const nodeReleaseIndex = "https://nodejs.org/dist/index.json";

export async function readProjectToolchain(repoRoot = process.cwd()) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const nodeVersionPath = path.join(repoRoot, ".node-version");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const npmVersion = parseNpmPackageManager(packageJson.packageManager);
  const nodeVersion = parseExactVersion((await readFile(nodeVersionPath, "utf8")).trim(), ".node-version");

  return {
    nodeVersion,
    npmVersion,
    packageJson,
    packageJsonPath,
    nodeVersionPath,
  };
}

export async function getToolchainFreshness(repoRoot = process.cwd()) {
  const selected = await readProjectToolchain(repoRoot);
  const [latestNpm, latestNodeVersion, supportedNpmMajors] = await Promise.all([
    getNpmMetadata("npm@latest", repoRoot),
    getLatestNodeLts(),
    getDependabotSupportedNpmMajors(),
  ]);
  const latestNpmMajor = versionMajor(latestNpm.version);
  const latestSupportedNpmMajor = Math.max(...supportedNpmMajors.filter((major) => major <= latestNpmMajor));

  if (!Number.isFinite(latestSupportedNpmMajor)) {
    throw new Error(`Dependabot does not support any published npm major up to npm ${latestNpmMajor}`);
  }

  const compatibleNpm = supportedNpmMajors.includes(latestNpmMajor)
    ? latestNpm
    : await getNpmMetadata(`npm@^${latestSupportedNpmMajor}`, repoRoot);
  const npmUpdateAvailable = compareVersions(latestNpm.version, selected.npmVersion) > 0;
  const compatibleNpmUpdateAvailable = compareVersions(compatibleNpm.version, selected.npmVersion) > 0;
  const nodeUpdateAvailable = compareVersions(latestNodeVersion, selected.nodeVersion) > 0;
  const npmHeldByDependabot = npmUpdateAvailable && !supportedNpmMajors.includes(latestNpmMajor);

  return {
    latest: {
      nodeVersion: latestNodeVersion,
      npmVersion: latestNpm.version,
      npmNodeRange: latestNpm.nodeRange,
    },
    compatible: {
      npmVersion: compatibleNpm.version,
      npmNodeRange: compatibleNpm.nodeRange,
    },
    selected: {
      nodeVersion: selected.nodeVersion,
      npmVersion: selected.npmVersion,
    },
    dependabot: {
      supportedNpmMajors,
      source: dependabotNpmSupportSource,
    },
    nodeUpdateAvailable,
    npmUpdateAvailable,
    compatibleNpmUpdateAvailable,
    npmHeldByDependabot,
    actionable: nodeUpdateAvailable || compatibleNpmUpdateAvailable,
  };
}

export function formatToolchainFreshness(status) {
  const lines = [
    `Selected Node.js: ${status.selected.nodeVersion}`,
    `Latest Node.js LTS: ${status.latest.nodeVersion}`,
    `Selected npm: ${status.selected.npmVersion}`,
    `Latest npm: ${status.latest.npmVersion}`,
    `Latest npm Node.js range: ${status.latest.npmNodeRange}`,
    `Dependabot-supported npm majors: ${status.dependabot.supportedNpmMajors.join(", ")}`,
    `Latest Dependabot-compatible npm: ${status.compatible.npmVersion}`,
  ];

  if (status.npmHeldByDependabot) {
    lines.push(
      `npm status: held at ${status.selected.npmVersion} because Dependabot does not yet support npm ${versionMajor(status.latest.npmVersion)}`,
    );
  }

  if (status.compatibleNpmUpdateAvailable) {
    lines.push(`npm compatible update: available (${status.selected.npmVersion} -> ${status.compatible.npmVersion})`);
  } else {
    lines.push("npm compatible update: current");
  }

  lines.push(
    status.nodeUpdateAvailable
      ? `Node.js status: update available (${status.selected.nodeVersion} -> ${status.latest.nodeVersion})`
      : "Node.js status: current",
  );

  return lines;
}

export function parseNpmPackageManager(value) {
  if (typeof value !== "string") {
    throw new Error('package.json packageManager must be an exact version such as "npm@11.18.0"');
  }

  const match = value.match(/^npm@(\d+\.\d+\.\d+)$/);

  if (!match) {
    throw new Error(`package.json packageManager must pin an exact stable npm version; received ${value}`);
  }

  return match[1];
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

export function versionMajor(version) {
  return Number.parseInt(parseExactVersion(version, "version").split(".")[0], 10);
}

async function getNpmMetadata(spec, repoRoot) {
  const [versionResult, enginesResult] = await Promise.all([
    execFileAsync("npm", ["view", spec, "version", "--json"], commandOptions(repoRoot)),
    execFileAsync("npm", ["view", spec, "engines.node", "--json"], commandOptions(repoRoot)),
  ]);

  return {
    version: parseNpmViewString(versionResult.stdout, "npm latest version"),
    nodeRange: parseNpmViewString(enginesResult.stdout, "npm latest Node.js range"),
  };
}

async function getLatestNodeLts() {
  const releases = await fetchJson(nodeReleaseIndex);

  if (!Array.isArray(releases)) {
    throw new Error("Node.js release index did not return an array");
  }

  const latestLts = releases.find((release) => release?.lts && typeof release.version === "string");

  if (!latestLts) {
    throw new Error("Node.js release index did not contain an LTS release");
  }

  return parseExactVersion(latestLts.version.replace(/^v/, ""), "latest Node.js LTS version");
}

async function getDependabotSupportedNpmMajors() {
  const source = await fetchText(dependabotNpmSupportSource);
  const supportedVersionsBlock = source.match(/SUPPORTED_VERSIONS\s*=.*?\[(.*?)\]\.freeze/s)?.[1];

  if (!supportedVersionsBlock) {
    throw new Error("Unable to locate Dependabot SUPPORTED_VERSIONS for npm");
  }

  const majors = [
    ...new Set([...supportedVersionsBlock.matchAll(/NPM_V(\d+)/g)].map((match) => Number.parseInt(match[1], 10))),
  ].sort((left, right) => left - right);

  if (majors.length === 0) {
    throw new Error("Dependabot npm support list did not contain any npm majors");
  }

  return majors;
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

function parseNpmViewString(stdout, label) {
  const parsed = JSON.parse(stdout);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  const value = values.findLast((entry) => typeof entry === "string");

  if (!value) {
    throw new Error(`npm view did not return ${label}`);
  }

  return value;
}

function parseExactVersion(value, label) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`${label} must be an exact stable version; received ${value}`);
  }

  return value;
}

function commandOptions(repoRoot) {
  return {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 20,
  };
}
