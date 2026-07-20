import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateDocumentationLanguageContract } from "./check-documentation-language-contract.mjs";

test("accepts the complete English-primary bilingual document contract", async (t) => {
  const root = await createFixture(t);
  await assert.doesNotReject(() => validateDocumentationLanguageContract({ repoRoot: root }));
});

test("rejects a missing language-family member", async (t) => {
  const root = await createFixture(t);
  await unlink(path.join(root, "docs", "getting-started.ja.md"));

  await assert.rejects(
    () => validateDocumentationLanguageContract({ repoRoot: root }),
    /missing required document docs\/getting-started\.ja\.md/,
  );
});

test("rejects a noncanonical English-suffixed guide path anywhere in Markdown", async (t) => {
  const root = await createFixture(t);
  const forbiddenPath = ["getting-started", "en", "md"].join(".");
  await writeFile(path.join(root, "docs", "extra.md"), `Use [the old guide](${forbiddenPath}).\n`);

  await assert.rejects(
    () => validateDocumentationLanguageContract({ repoRoot: root }),
    /contains forbidden noncanonical path/,
  );
});

test("rejects a noncanonical guide path in every product documentation directory", async (t) => {
  const forbiddenPath = ["getting-started", "en", "md"].join(".");

  for (const relativeDirectory of ["docs", "raycast-publish", ".github/release-changelog"]) {
    const root = await createFixture(t);
    await writeFile(path.join(root, relativeDirectory, "extra.md"), `Use [the old guide](${forbiddenPath}).\n`);

    await assert.rejects(
      () => validateDocumentationLanguageContract({ repoRoot: root }),
      /contains forbidden noncanonical path/,
    );
  }
});

test("does not inspect Markdown outside the product documentation surface", async (t) => {
  const root = await createFixture(t);
  const privateDirectory = path.join(root, "private-work");
  const forbiddenPath = ["getting-started", "en", "md"].join(".");
  await mkdir(privateDirectory, { recursive: true });
  await writeFile(path.join(privateDirectory, "notes.md"), `Use [the old guide](${forbiddenPath}).\n`);

  await assert.doesNotReject(() => validateDocumentationLanguageContract({ repoRoot: root }));
});

test("rejects a missing or changed reciprocal language selector", async (t) => {
  const root = await createFixture(t);
  await writeFile(path.join(root, "README.ja.md"), "# MdClip\n\n日本語\n");

  await assert.rejects(
    () => validateDocumentationLanguageContract({ repoRoot: root }),
    /must place the exact reciprocal language selector/,
  );
});

test("rejects an unregistered paired-document reference outside the original surfaces", async (t) => {
  const root = await createFixture(t);
  await writeFile(path.join(root, "docs", "extra.md"), "See [Getting Started](getting-started.md).\n");

  await assert.rejects(
    () => validateDocumentationLanguageContract({ repoRoot: root }),
    /paired-document references must exactly match/,
  );
});

test("fails a partial route migration and passes after complete recovery", async (t) => {
  const root = await createFixture(t);
  await writeFile(path.join(root, "docs", "local-verification.md"), "See [使い始める手順](getting-started.md).\n");

  await assert.rejects(
    () => validateDocumentationLanguageContract({ repoRoot: root }),
    /paired-document references must exactly match/,
  );

  await writeFile(path.join(root, "docs", "local-verification.md"), "See [使い始める手順](getting-started.ja.md).\n");
  await assert.doesNotReject(() => validateDocumentationLanguageContract({ repoRoot: root }));
});

async function createFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mdclip-document-contract-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "docs"), { recursive: true });
  await mkdir(path.join(root, "raycast-publish"), { recursive: true });
  await mkdir(path.join(root, ".github", "release-changelog"), { recursive: true });

  const files = new Map([
    [
      "README.md",
      `# MdClip

English | [日本語](README.ja.md)

See [Getting Started](docs/getting-started.md).
`,
    ],
    [
      "README.ja.md",
      `# MdClip

[English](README.md) | 日本語

[使い始める手順](docs/getting-started.ja.md)を参照してください。
`,
    ],
    [
      "docs/getting-started.md",
      `# Getting Started with MdClip

English | [日本語](getting-started.ja.md)

See [README](../README.md).
`,
    ],
    [
      "docs/getting-started.ja.md",
      `# MdClip を使い始める

[English](getting-started.md) | 日本語

[README.ja](../README.ja.md)を参照してください。
`,
    ],
    ["docs/local-verification.md", "See [使い始める手順](getting-started.ja.md).\n"],
    ["docs/release-management.md", "See [MdClip を使い始める](getting-started.ja.md).\n"],
    ["docs/screenshot-media.md", "See [Getting Started](getting-started.md).\n"],
    ["raycast-publish/README.md", "# Store README\n"],
    ["raycast-publish/CHANGELOG.md", "# Store Changelog\n"],
    [".github/release-changelog/v0.1.0.md", "# Release changelog\n"],
  ]);

  for (const [relativePath, content] of files) {
    await writeFile(path.join(root, relativePath), content);
  }

  return root;
}
