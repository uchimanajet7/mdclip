import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  alignDependenciesWithRaycastContracts,
  applyMajorDependencyDeclarations,
  applyCompatibleDependencyUpdates,
  assertMaintenanceRuntime,
  classifyOutdated,
  formatRaycastContractStatus,
  getDirectDependencyDowngrades,
  getDirectDependencyRangeDrift,
  getMajorUpdateCandidates,
  getRaycastDependencyContracts,
  parseUpdateArguments,
  updateDependencies,
} from "./update-dependencies.mjs";

const engines = { node: ">=22.22.2", npm: ">=11.17.0" };
const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
// Published API metadata and the exact pins produced by the official 2.10.0 migration.
const raycastApiPackage = {
  version: "2.10.1",
  dependencies: { "@types/node": "26.6.5", "@types/react": "19.3.0", react: "19.3.1" },
  peerDependencies: { "@types/node": "26.6.5", "@types/react": "19.3.0" },
};
const contractSections = { "@types/node": "devDependencies", "@types/react": "devDependencies", react: "dependencies" };

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

test("requires one explicit supported flag before major-version updates", () => {
  assert.deepEqual(parseUpdateArguments([]), { allowMajor: false });
  assert.deepEqual(parseUpdateArguments(["--allow-major"]), { allowMajor: true });
  assert.throws(() => parseUpdateArguments(["--latest"]), /unsupported dependency update arguments: --latest/);
  assert.throws(
    () => parseUpdateArguments(["--allow-major", "--allow-major"]),
    /--allow-major may be specified only once/,
  );
});

test("selects all direct major candidates except all three Raycast-managed dependencies", () => {
  assert.deepEqual(
    getMajorUpdateCandidates(
      {
        "@raycast/api": { current: "1.104.25", wanted: "1.104.25", latest: "2.0.5" },
        "@types/node": { current: "22.19.17", wanted: "22.19.17", latest: "26.2.0" },
        "@types/react": { current: "19.3.0", wanted: "19.3.0", latest: "20.0.0" },
        react: { current: "19.3.1", wanted: "19.3.1", latest: "20.0.0" },
        typescript: { current: "6.0.3", wanted: "6.0.3", latest: "7.0.2" },
      },
      { contractManagedNames: new Set(Object.keys(contractSections)) },
    ),
    [
      { name: "@raycast/api", current: "1.104.25", wanted: "1.104.25", latest: "2.0.5" },
      { name: "typescript", current: "6.0.3", wanted: "6.0.3", latest: "7.0.2" },
    ],
  );
});

test("promotes major candidates together while preserving Raycast and TypeScript tooling contracts", () => {
  const packageJson = {
    dependencies: { "@raycast/api": "^1.104.25", react: "^19.2.8" },
    devDependencies: {
      "@raycast/eslint-config": "^2.2.0",
      "@types/node": "22.19.17",
      "@types/react": "^19.2.18",
      typescript: "^6.0.3",
    },
  };
  const candidates = [
    { name: "@raycast/api", current: "1.104.25", wanted: "1.104.25", latest: "2.10.1" },
    { name: "typescript", current: "6.0.3", wanted: "6.0.3", latest: "7.0.2" },
  ];

  const result = applyMajorDependencyDeclarations(packageJson, candidates, {
    raycastApiPackage: {
      ...raycastApiPackage,
    },
    typeScriptCompatibilityVersion: "6.0.2",
  });

  assert.equal(result.packageJson.dependencies["@raycast/api"], "^2.10.1");
  assert.equal(result.packageJson.devDependencies["@types/node"], "26.6.5");
  assert.equal(result.packageJson.devDependencies["@types/react"], "19.3.0");
  assert.equal(result.packageJson.dependencies.react, "19.3.1");
  assert.equal(result.packageJson.devDependencies["@typescript/native"], "npm:typescript@^7.0.2");
  assert.equal(result.packageJson.devDependencies.typescript, "npm:@typescript/typescript6@^6.0.2");
  assert.deepEqual(result.appliedUpdates, [
    "@raycast/api (^1.104.25 -> ^2.10.1)",
    "typescript (^6.0.3 -> TypeScript 7.0.2 CLI with @typescript/typescript6 6.0.2 tooling API)",
  ]);
  assert.equal(packageJson.dependencies["@raycast/api"], "^1.104.25");
  assert.equal(packageJson.devDependencies.typescript, "^6.0.3");
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

test("checks npm alias lower bounds against their resolved direct versions", () => {
  const packageJson = {
    devDependencies: {
      "@typescript/native": "npm:typescript@^7.0.1",
      typescript: "npm:@typescript/typescript6@^6.0.1",
    },
  };
  const packageLock = {
    packages: {
      "node_modules/@typescript/native": { version: "7.0.2" },
      "node_modules/typescript": { version: "6.0.2" },
    },
  };

  assert.deepEqual(getDirectDependencyRangeDrift(packageJson, packageLock), [
    {
      name: "@typescript/native",
      section: "devDependencies",
      declaredRange: "npm:typescript@^7.0.1",
      installedVersion: "7.0.2",
    },
    {
      name: "typescript",
      section: "devDependencies",
      declaredRange: "npm:@typescript/typescript6@^6.0.1",
      installedVersion: "6.0.2",
    },
  ]);

  packageJson.devDependencies["@typescript/native"] = "npm:typescript@^7.0.2";
  packageJson.devDependencies.typescript = "npm:@typescript/typescript6@^6.0.2";
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
      contractManaged: [
        {
          name: "@types/node",
          selectedVersion: "22.19.17",
          latestVersion: "26.1.2",
        },
      ],
      maintainerDecisionRequired: ["typescript (6.0.3 -> 7.0.2)"],
    },
  );
});

test("reports a Raycast-managed version without implying that registry latest was selected", () => {
  assert.deepEqual(
    formatRaycastContractStatus(
      [
        {
          name: "@types/node",
          selectedVersion: "22.19.17",
          latestVersion: "26.2.0",
        },
      ],
      "2.0.5",
    ),
    [
      "@types/node: using 22.19.17 as required by @raycast/api 2.0.5.",
      "Registry latest for @types/node is 26.2.0 and was intentionally not selected.",
    ],
  );
});

test("reads all exact Raycast contracts from dependencies and optional peers", () => {
  assert.deepEqual(getRaycastDependencyContracts(raycastApiPackage), {
    "@types/node": { section: "devDependencies", version: "26.6.5" },
    "@types/react": { section: "devDependencies", version: "19.3.0" },
    react: { section: "dependencies", version: "19.3.1" },
  });
});

test("rejects missing, non-exact, or conflicting API contracts for every managed dependency", () => {
  for (const name of Object.keys(contractSections)) {
    for (const value of [undefined, "^19.3.0", null, ["19.3.0"], "20.0.0"]) {
      const metadata = structuredClone(raycastApiPackage);
      if (value === "20.0.0") {
        metadata.peerDependencies[name] = value;
      } else {
        metadata.dependencies[name] = value;
        metadata.peerDependencies[name] = value;
      }
      assert.throws(() => getRaycastDependencyContracts(metadata), {
        message: new RegExp(`must declare one exact ${name.replaceAll("/", "\\/")} contract`),
      });
    }
  }
});

test("detects a resolved direct dependency downgrade", () => {
  const packageJson = { dependencies: { react: "^19.2.8" } };
  const initialPackageLock = { packages: { "node_modules/react": { version: "19.2.8" } } };
  const finalPackageLock = { packages: { "node_modules/react": { version: "19.2.7" } } };

  assert.deepEqual(getDirectDependencyDowngrades(packageJson, initialPackageLock, packageJson, finalPackageLock), [
    { name: "react", initialVersion: "19.2.8", finalVersion: "19.2.7" },
  ]);
});

test("allows only the TypeScript 6 compatibility package identity transition", () => {
  const initialPackageJson = { devDependencies: { typescript: "^6.0.3" } };
  const finalPackageJson = {
    devDependencies: { typescript: "npm:@typescript/typescript6@^6.0.2" },
  };
  const initialPackageLock = { packages: { "node_modules/typescript": { version: "6.0.3" } } };
  const finalPackageLock = { packages: { "node_modules/typescript": { version: "6.0.2" } } };

  assert.deepEqual(
    getDirectDependencyDowngrades(initialPackageJson, initialPackageLock, finalPackageJson, finalPackageLock),
    [],
  );
});

test("rejects an unrelated direct npm alias package identity change", () => {
  const initialPackageJson = { devDependencies: { tool: "^1.0.0" } };
  const finalPackageJson = { devDependencies: { tool: "npm:other-tool@^2.0.0" } };
  const initialPackageLock = { packages: { "node_modules/tool": { version: "1.0.0" } } };
  const finalPackageLock = { packages: { "node_modules/tool": { version: "2.0.0" } } };

  assert.throws(
    () => getDirectDependencyDowngrades(initialPackageJson, initialPackageLock, finalPackageJson, finalPackageLock),
    /changed tool package identity from tool to other-tool/,
  );
});

test("rejects caret declarations, mismatched pins, and resolved drift for every Raycast contract", async (t) => {
  for (const [name, section] of Object.entries(contractSections)) {
    for (const failure of ["caret", "wrong pin", "resolved drift"]) {
      await t.test(`${name}: ${failure}`, async (t) => {
        const root = await createDependencyFixture(t);
        const manifest = await readJson(root, "package.json");
        const lock = await readJson(root, "package-lock.json");
        const version = raycastApiPackage.dependencies[name];

        if (failure === "resolved drift") {
          lock.packages[`node_modules/${name}`].version = "99.0.0";
        } else {
          const declaration = failure === "caret" ? `^${version}` : "99.0.0";
          manifest[section][name] = declaration;
          lock.packages[""][section][name] = declaration;
          if (failure === "wrong pin") lock.packages[`node_modules/${name}`].version = declaration;
        }
        await writeJson(root, "package.json", manifest);
        await writeJson(root, "package-lock.json", lock);

        await assert.rejects(
          () => runDependencyPolicy(root, ["--allow-direct-range-drift"]),
          (error) => {
            assert.match(error.stderr, new RegExp(`${name} contract`));
            return true;
          },
        );
      });
    }
  }
});

test("synchronizes all three pins from installed API metadata without hardcoded versions", async (t) => {
  const root = await createDependencyFixture(t);
  const metadata = {
    version: "3.0.0",
    dependencies: { "@types/node": "28.0.1", "@types/react": "20.0.2", react: "20.0.3" },
    peerDependencies: { "@types/node": "28.0.1", "@types/react": "20.0.2" },
  };
  await writeJson(root, "node_modules/@raycast/api/package.json", metadata);
  const rootUrl = pathToFileURL(`${root}/`);

  assert.equal(await alignDependenciesWithRaycastContracts(rootUrl), true);
  const manifest = await readJson(root, "package.json");
  for (const [name, section] of Object.entries(contractSections)) {
    assert.equal(manifest[section][name], metadata.dependencies[name]);
  }
  assert.equal(await alignDependenciesWithRaycastContracts(rootUrl), false);
});

test("rejects contract downgrades without partially writing the manifest", async (t) => {
  for (const name of Object.keys(contractSections)) {
    await t.test(name, async (t) => {
      const root = await createDependencyFixture(t);
      const before = await readFile(path.join(root, "package.json"), "utf8");
      const metadata = structuredClone(raycastApiPackage);
      metadata.dependencies[name] = "0.0.1";
      if (Object.hasOwn(metadata.peerDependencies, name)) metadata.peerDependencies[name] = "0.0.1";
      await writeJson(root, "node_modules/@raycast/api/package.json", metadata);

      await assert.rejects(
        () => alignDependenciesWithRaycastContracts(pathToFileURL(`${root}/`)),
        /would downgrade the root contract/,
      );
      assert.equal(await readFile(path.join(root, "package.json"), "utf8"), before);
    });
  }
});

test("preserves official migration pins through the updater and the real policy checker", async (t) => {
  for (const allowMajor of [false, true]) {
    await t.test(allowMajor ? "explicit major updates" : "declared-range updates", async (t) => {
      const fixture = await createUpdateFixture(t, { allowMajor });
      await fixture.update();

      assert.deepEqual(fixture.calls, [
        "npm --version",
        "npm run check:dependencies -- --allow-direct-range-drift",
        "npm ci",
        "npm run migrate",
        "npm outdated --json --long",
        "npm update --save --ignore-scripts",
        "npm outdated --json --long",
        "npm run check:dependencies",
        "npm ci",
        "npm run lint",
        "npm run build",
        "npm run lint:raycast",
      ]);
      const manifest = await readJson(fixture.root, "package.json");
      for (const [name, section] of Object.entries(contractSections)) {
        const version = raycastApiPackage.dependencies[name];
        assert.equal(manifest[section][name], version);
        assert.ok(fixture.messages.includes(`${name}: using ${version} as required by @raycast/api 2.10.1.`));
      }
      assert.ok(fixture.messages.some((line) => line.endsWith("updated and verified.")));
      assert.equal(
        fixture.messages.some((line) => line.includes("Maintainer decision required")),
        false,
      );
    });
  }
});

test("stops on a failing final policy check and preserves the failed update for review", async (t) => {
  const fixture = await createUpdateFixture(t, { corruptLock: true });
  await assert.rejects(fixture.update, (error) => {
    assert.match(error.stderr, /root devDependencies must match package.json/);
    return true;
  });

  assert.equal(fixture.calls.at(-1), "npm run check:dependencies");
  assert.equal(fixture.calls.filter((line) => line === "npm ci").length, 1);
  assert.equal(fixture.calls.includes("npm run build"), false);
  assert.equal(
    fixture.messages.some((line) => line.endsWith("updated and verified.")),
    false,
  );
  const manifest = await readJson(fixture.root, "package.json");
  const lock = await readJson(fixture.root, "package-lock.json");
  assert.equal(manifest.devDependencies["@types/react"], "19.3.0");
  assert.equal(lock.packages[""].devDependencies["@types/react"], "^19.3.0");
});

test("aligns target API contracts before npm resolves compatible and major API updates", async (t) => {
  for (const [allowMajor, version, nodeTypes, reactTypes, react] of [
    [false, "2.11.0", "26.7.0", "19.4.0", "19.4.1"],
    [true, "3.0.0", "28.0.0", "20.0.0", "20.0.1"],
  ]) {
    await t.test(version, async (t) => {
      const apiUpdate = {
        version,
        dependencies: { "@types/node": nodeTypes, "@types/react": reactTypes, react },
        peerDependencies: { "@types/node": nodeTypes, "@types/react": reactTypes },
      };
      const fixture = await createUpdateFixture(t, { allowMajor, apiUpdate });
      await fixture.update();

      const metadataIndex = fixture.calls.findIndex((line) => line.startsWith(`npm view @raycast/api@${version} `));
      assert.ok(metadataIndex >= 0 && metadataIndex < fixture.calls.indexOf("npm update --save --ignore-scripts"));
      const manifest = await readJson(fixture.root, "package.json");
      assert.equal(manifest.dependencies["@raycast/api"], `^${version}`);
      for (const [name, section] of Object.entries(contractSections)) {
        assert.equal(manifest[section][name], apiUpdate.dependencies[name]);
      }
    });
  }
});

async function createDependencyFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mdclip-dependency-maintenance-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const relativePath of [".npmrc", ".node-version", "package.json", "package-lock.json", ".github", "scripts"]) {
    await cp(path.join(projectRoot, relativePath), path.join(root, relativePath), { recursive: true });
  }
  await mkdir(path.join(root, "node_modules/@raycast/api"), { recursive: true });
  await installFixtureApi(root, raycastApiPackage);
  return root;
}

async function installFixtureApi(root, metadata) {
  const manifest = await readJson(root, "package.json");
  const lock = await readJson(root, "package-lock.json");
  manifest.dependencies["@raycast/api"] = `^${metadata.version}`;
  lock.packages["node_modules/@raycast/api"] = { ...lock.packages["node_modules/@raycast/api"], ...metadata };
  for (const [name, section] of Object.entries(contractSections)) {
    manifest[section][name] = metadata.dependencies[name];
    lock.packages[`node_modules/${name}`].version = metadata.dependencies[name];
  }
  lock.packages[""].dependencies = { ...manifest.dependencies };
  lock.packages[""].devDependencies = { ...manifest.devDependencies };
  await writeJson(root, "package.json", manifest);
  await writeJson(root, "package-lock.json", lock);
  await writeJson(root, "node_modules/@raycast/api/package.json", metadata);
}

async function createUpdateFixture(t, { allowMajor = false, corruptLock = false, apiUpdate = null } = {}) {
  const root = await createDependencyFixture(t);
  await installFixtureApi(root, {
    version: "2.7.3",
    dependencies: { "@types/node": "22.19.17", "@types/react": "19.0.10", react: "19.0.0" },
    peerDependencies: { "@types/node": "22.19.17", "@types/react": "19.0.10" },
  });
  const calls = [];
  const messages = [];
  let updated = false;
  t.mock.method(console, "log", (...args) => messages.push(args.join(" ")));

  const runCommand = async (command, args) => {
    const invocation = [command, ...args].join(" ");
    calls.push(invocation);
    if (invocation === "npm --version") return { stdout: "11.17.0" };
    if (command === "npm" && args[0] === "run" && args[1] === "check:dependencies") {
      // Execute the real policy script, without recursively starting this test suite.
      return runDependencyPolicy(root, args.slice(3));
    }
    if (invocation === "npm run migrate") {
      await installFixtureApi(root, raycastApiPackage);
      return {};
    }
    if (invocation === "npm outdated --json --long") {
      const metadata = updated && apiUpdate ? apiUpdate : raycastApiPackage;
      const outdated = Object.fromEntries(
        Object.entries(metadata.dependencies).map(([name, version]) => [
          name,
          { current: version, wanted: version, latest: `${Number(version.split(".")[0]) + 1}.0.0` },
        ]),
      );
      if (apiUpdate && !updated) {
        outdated["@raycast/api"] = {
          current: raycastApiPackage.version,
          wanted: allowMajor ? raycastApiPackage.version : apiUpdate.version,
          latest: apiUpdate.version,
        };
      }
      return { stdout: JSON.stringify(outdated) };
    }
    if (
      apiUpdate &&
      invocation === `npm view @raycast/api@${apiUpdate.version} version dependencies peerDependencies bin --json`
    ) {
      return { stdout: JSON.stringify(apiUpdate) };
    }
    if (invocation === "npm update --save --ignore-scripts") {
      if (apiUpdate) {
        const manifest = await readJson(root, "package.json");
        for (const [name, section] of Object.entries(contractSections)) {
          assert.equal(manifest[section][name], apiUpdate.dependencies[name], `${name} must align before resolution`);
        }
        await installFixtureApi(root, apiUpdate);
      }
      updated = true;
      if (corruptLock) {
        const lock = await readJson(root, "package-lock.json");
        lock.packages[""].devDependencies["@types/react"] = "^19.3.0";
        await writeJson(root, "package-lock.json", lock);
      }
      return {};
    }
    if (["npm ci", "npm run lint", "npm run build", "npm run lint:raycast"].includes(invocation)) return {};
    throw new Error(`Unexpected fixture command: ${invocation}`);
  };
  return { root, calls, messages, update: () => updateDependencies({ repoRoot: root, runCommand, allowMajor }) };
}

function runDependencyPolicy(root, args = []) {
  return execFileAsync(process.execPath, ["scripts/check-dependency-sources.mjs", ...args], { cwd: root });
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function writeJson(root, relativePath, value) {
  await writeFile(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}
