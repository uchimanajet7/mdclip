import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPeerDependencyBlockers,
  formatHeldDependency,
  summarizePeerDependencyBlockers,
} from "./peer-dependency-report.mjs";

const root = { location: "/repo" };
const raycastConfig = packageNode("@raycast/eslint-config", "2.2.0", "dev", root);
const typescriptEslint = packageNode("typescript-eslint", "8.63.0", "prod", raycastConfig);
const typescriptEslintParser = packageNode("@typescript-eslint/parser", "8.63.0", "prod", typescriptEslint);
const tsApiUtils = packageNode("ts-api-utils", "2.5.0", "prod", typescriptEslint);
const explanations = [
  {
    name: "typescript",
    version: "6.0.3",
    dependents: [
      peerDependent(">=4.8.4 <6.1.0", raycastConfig),
      peerDependent(">=4.8.4 <6.1.0", typescriptEslint),
      peerDependent(">=4.8.4 <6.1.0", typescriptEslintParser),
      peerDependent(">=4.8.4", tsApiUtils),
    ],
  },
];

test("collects only peer dependencies that reject the candidate version", () => {
  const blockers = collectPeerDependencyBlockers(explanations, "7.0.2");

  assert.deepEqual(
    blockers.map((blocker) => ({
      name: blocker.name,
      path: blocker.path,
      requiredRange: blocker.requiredRange,
    })),
    [
      {
        name: "@raycast/eslint-config",
        path: ["@raycast/eslint-config@2.2.0"],
        requiredRange: ">=4.8.4 <6.1.0",
      },
      {
        name: "typescript-eslint",
        path: ["@raycast/eslint-config@2.2.0", "typescript-eslint@8.63.0"],
        requiredRange: ">=4.8.4 <6.1.0",
      },
      {
        name: "@typescript-eslint/parser",
        path: ["@raycast/eslint-config@2.2.0", "typescript-eslint@8.63.0", "@typescript-eslint/parser@8.63.0"],
        requiredRange: ">=4.8.4 <6.1.0",
      },
    ],
  );
});

test("shows direct and nearest transitive blockers without flooding the report", () => {
  const blockers = collectPeerDependencyBlockers(explanations, "7.0.2");
  const summary = summarizePeerDependencyBlockers(blockers);

  assert.deepEqual(
    summary.visibleBlockers.map((blocker) => blocker.name),
    ["@raycast/eslint-config", "typescript-eslint"],
  );
  assert.equal(summary.hiddenTransitiveBlockerCount, 1);
});

test("formats an actionable peer dependency report", () => {
  const blockers = collectPeerDependencyBlockers(explanations, "7.0.2");

  assert.deepEqual(
    formatHeldDependency({
      name: "typescript",
      currentVersion: "6.0.3",
      latestVersion: "7.0.2",
      blockers,
      resolverOutput: "",
    }),
    [
      "- typescript: kept 6.0.3; latest is 7.0.2",
      "  Blocked by:",
      '  - @raycast/eslint-config@2.2.0 requires typescript ">=4.8.4 <6.1.0" (direct devDependency)',
      '  - typescript-eslint@8.63.0 requires typescript ">=4.8.4 <6.1.0" (via @raycast/eslint-config@2.2.0)',
      "  - 1 additional transitive package requires an incompatible peer range; run `npm explain typescript` for the complete dependency tree",
    ],
  );
});

function packageNode(name, version, type, from) {
  return {
    name,
    version,
    location: `node_modules/${name}`,
    dependents: [{ type, from }],
  };
}

function peerDependent(spec, from) {
  return {
    type: "peer",
    name: "typescript",
    spec,
    from,
  };
}
