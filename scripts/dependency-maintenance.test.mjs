import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCompatibleDependencyUpdates,
  assertMaintenanceRuntime,
  classifyOutdated,
  getDirectDependencyDowngrades,
  getDirectDependencyRangeDrift,
  getRaycastNodeTypesContract,
} from "./update-dependencies.mjs";

const engines = { node: ">=22.22.2", npm: ">=11.17.0" };

test("accepts any dependency-maintenance runtime that satisfies package.json engines", () => {
  for (const [nodeVersion, npmVersion] of [
    ["22.22.2", "11.17.0"],
    ["24.19.0", "11.17.0"],
    ["26.6.0", "11.18.0"],
  ]) {
    assert.doesNotThrow(() => assertMaintenanceRuntime({ nodeVersion, npmVersion, engines }));
  }
});

test("rejects a Node.js version below package.json engines", () => {
  assert.throws(
    () => assertMaintenanceRuntime({ nodeVersion: "22.22.1", npmVersion: "11.17.0", engines }),
    /Node\.js 22\.22\.1 does not satisfy >=22\.22\.2/,
  );
});

test("rejects an npm version below package.json engines", () => {
  assert.throws(
    () => assertMaintenanceRuntime({ nodeVersion: "24.19.0", npmVersion: "11.16.9", engines }),
    /npm 11\.16\.9 does not satisfy >=11\.17\.0/,
  );
});

test("applies compatible updates with manifest persistence and install scripts disabled", async () => {
  const calls = [];

  await applyCompatibleDependencyUpdates(async (command, args) => {
    calls.push([command, args]);
  });

  assert.deepEqual(calls, [["npm", ["update", "--save", "--ignore-scripts"]]]);
});

test("detects a manifest lower bound left behind its resolved direct dependency", () => {
  const packageJson = {
    dependencies: { "@raycast/api": "^1.104.23" },
  };
  const packageLock = {
    packages: {
      "node_modules/@raycast/api": { version: "1.104.24" },
    },
  };

  assert.deepEqual(getDirectDependencyRangeDrift(packageJson, packageLock), [
    {
      name: "@raycast/api",
      section: "dependencies",
      declaredRange: "^1.104.23",
      installedVersion: "1.104.24",
    },
  ]);

  packageJson.dependencies["@raycast/api"] = "^1.104.24";
  assert.deepEqual(getDirectDependencyRangeDrift(packageJson, packageLock), []);
});

test("separates allowed updates from latest versions that require a maintainer decision", () => {
  assert.deepEqual(
    classifyOutdated(
      {
        react: { current: "19.2.8", wanted: "19.2.9", latest: "19.2.9" },
        "@types/node": { current: "22.19.17", wanted: "22.19.17", latest: "26.1.2" },
        typescript: { current: "6.0.3", wanted: "6.0.3", latest: "7.0.2" },
      },
      { contractManagedNames: new Set(["@types/node"]) },
    ),
    {
      allowedUpdatesPending: ["react (19.2.8 -> 19.2.9)"],
      contractManaged: ["@types/node (22.19.17 -> 26.1.2)"],
      maintainerDecisionRequired: ["typescript (6.0.3 -> 7.0.2)"],
    },
  );
});

test("reads one exact Node type contract from @raycast/api dependencies and optional peers", () => {
  assert.equal(
    getRaycastNodeTypesContract({
      dependencies: { "@types/node": "22.19.17" },
      peerDependencies: { "@types/node": "22.19.17" },
    }),
    "22.19.17",
  );

  assert.throws(
    () =>
      getRaycastNodeTypesContract({
        dependencies: { "@types/node": "22.19.17" },
        peerDependencies: { "@types/node": "22.20.1" },
      }),
    /must declare one exact @types\/node runtime contract/,
  );
});

test("detects a resolved direct dependency downgrade", () => {
  const packageJson = { dependencies: { react: "^19.2.8" } };
  const initialPackageLock = { packages: { "node_modules/react": { version: "19.2.8" } } };
  const finalPackageLock = { packages: { "node_modules/react": { version: "19.2.7" } } };

  assert.deepEqual(getDirectDependencyDowngrades(packageJson, initialPackageLock, packageJson, finalPackageLock), [
    { name: "react", initialVersion: "19.2.8", finalVersion: "19.2.7" },
  ]);
});
