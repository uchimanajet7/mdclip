import { execFile } from "node:child_process";
import { promisify } from "node:util";
import semver from "semver";

const execFileAsync = promisify(execFile);

export async function findPeerDependencyBlockers(packageName, candidateVersion, cwd = process.cwd()) {
  const { stdout } = await execFileAsync("npm", ["explain", packageName, "--json"], commandOptions(cwd));
  return collectPeerDependencyBlockers(JSON.parse(stdout), candidateVersion);
}

export function collectPeerDependencyBlockers(explanations, candidateVersion) {
  if (!Array.isArray(explanations)) {
    throw new Error("npm explain --json did not return an array");
  }

  if (!semver.valid(candidateVersion)) {
    throw new Error(`Candidate version must be valid semver; received ${candidateVersion}`);
  }

  const blockers = [];

  for (const explanation of explanations) {
    for (const dependent of explanation?.dependents ?? []) {
      if (!dependent?.type?.startsWith("peer") || !dependent.from?.name || !dependent.from?.version) {
        continue;
      }

      if (!semver.validRange(dependent.spec)) {
        throw new Error(
          `Unable to evaluate peer dependency range ${JSON.stringify(dependent.spec)} from ${dependent.from.name}@${dependent.from.version}`,
        );
      }

      if (semver.satisfies(candidateVersion, dependent.spec)) {
        continue;
      }

      const rootPath = findShortestRootPath(dependent.from);

      blockers.push({
        name: dependent.from.name,
        version: dependent.from.version,
        requiredRange: dependent.spec,
        path: rootPath.packages,
        rootDependencyType: rootPath.rootDependencyType,
      });
    }
  }

  return deduplicateBlockers(blockers).sort(compareBlockers);
}

export function summarizePeerDependencyBlockers(blockers) {
  const directBlockers = blockers.filter((blocker) => blocker.path.length === 1);
  const transitiveGroups = new Map();

  for (const blocker of blockers.filter((entry) => entry.path.length > 1)) {
    const groupKey = `${blocker.path[0]}\0${blocker.requiredRange}`;
    const group = transitiveGroups.get(groupKey) ?? [];
    group.push(blocker);
    transitiveGroups.set(groupKey, group);
  }

  const nearestTransitiveBlockers = [];

  for (const group of transitiveGroups.values()) {
    const minimumDepth = Math.min(...group.map((blocker) => blocker.path.length));
    nearestTransitiveBlockers.push(...group.filter((blocker) => blocker.path.length === minimumDepth));
  }

  const visibleBlockers = [...directBlockers, ...nearestTransitiveBlockers].sort(compareBlockers);

  return {
    visibleBlockers,
    hiddenTransitiveBlockerCount: blockers.length - visibleBlockers.length,
  };
}

export function formatHeldDependency(dependency) {
  const lines = [`- ${dependency.name}: kept ${dependency.currentVersion}; latest is ${dependency.latestVersion}`];

  if (dependency.blockers.length === 0) {
    lines.push("  npm reported a peer dependency conflict. Resolver output:");
    lines.push(...indentLines(dependency.resolverOutput, "  "));
    return lines;
  }

  const { visibleBlockers, hiddenTransitiveBlockerCount } = summarizePeerDependencyBlockers(dependency.blockers);
  lines.push("  Blocked by:");

  for (const blocker of visibleBlockers) {
    lines.push(
      `  - ${blocker.name}@${blocker.version} requires ${dependency.name} ${JSON.stringify(blocker.requiredRange)} (${formatDependencyPath(blocker)})`,
    );
  }

  if (hiddenTransitiveBlockerCount > 0) {
    const packageLabel = hiddenTransitiveBlockerCount === 1 ? "package requires" : "packages require";
    lines.push(
      `  - ${hiddenTransitiveBlockerCount} additional transitive ${packageLabel} an incompatible peer range; run \`npm explain ${dependency.name}\` for the complete dependency tree`,
    );
  }

  return lines;
}

function findShortestRootPath(node, visited = new Set()) {
  const packageIdentifier = `${node.name}@${node.version}`;
  const nodeIdentity = node.location ?? packageIdentifier;

  if (visited.has(nodeIdentity)) {
    return { packages: [packageIdentifier], rootDependencyType: "unknown" };
  }

  const nextVisited = new Set(visited).add(nodeIdentity);
  const paths = [];

  for (const dependent of node.dependents ?? []) {
    if (!dependent.from?.name) {
      paths.push({ packages: [packageIdentifier], rootDependencyType: dependent.type });
      continue;
    }

    const parentPath = findShortestRootPath(dependent.from, nextVisited);
    paths.push({
      packages: [...parentPath.packages, packageIdentifier],
      rootDependencyType: parentPath.rootDependencyType,
    });
  }

  return (
    paths.sort(compareRootPaths)[0] ?? {
      packages: [packageIdentifier],
      rootDependencyType: "unknown",
    }
  );
}

function deduplicateBlockers(blockers) {
  const uniqueBlockers = new Map();

  for (const blocker of blockers) {
    const key = [blocker.name, blocker.version, blocker.requiredRange, blocker.path[0]].join("\0");
    const current = uniqueBlockers.get(key);

    if (!current || compareBlockerPaths(blocker, current) < 0) {
      uniqueBlockers.set(key, blocker);
    }
  }

  return [...uniqueBlockers.values()];
}

function compareBlockers(left, right) {
  return (
    compareBlockerPaths(left, right) || `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`)
  );
}

function compareBlockerPaths(left, right) {
  return left.path.length - right.path.length || left.path.join(" -> ").localeCompare(right.path.join(" -> "));
}

function compareRootPaths(left, right) {
  return (
    left.packages.length - right.packages.length ||
    left.packages.join(" -> ").localeCompare(right.packages.join(" -> "))
  );
}

function formatDependencyPath(blocker) {
  if (blocker.path.length > 1) {
    return `via ${blocker.path.slice(0, -1).join(" -> ")}`;
  }

  const directDependencyLabels = {
    dev: "direct devDependency",
    optional: "direct optionalDependency",
    peer: "direct peerDependency",
    peerOptional: "direct optional peerDependency",
    prod: "direct dependency",
  };

  return directDependencyLabels[blocker.rootDependencyType] ?? "direct dependency";
}

function indentLines(output, prefix) {
  const normalizedOutput = output?.trim();
  return normalizedOutput ? normalizedOutput.split("\n").map((line) => `${prefix}${line}`) : [`${prefix}(none)`];
}

function commandOptions(cwd) {
  return {
    cwd,
    maxBuffer: 1024 * 1024 * 20,
  };
}
