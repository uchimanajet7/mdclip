import assert from "node:assert/strict";
import test from "node:test";

import { legacyReleaseChangelogFileList, validateReleaseChangelog } from "./release-manifest.mjs";

const futureReleasePath = ".github/release-changelog/v0.2.1.md";
const validBody = `## What changes for you

- Add a user-visible Markdown Source action.

## Install or update

- Download the latest Source code (zip), run npm ci, and run npm run dev.
`;

test("accepts the exact two-section future Release contract", () => {
  assert.doesNotThrow(() => validateReleaseChangelog(futureReleasePath, validBody));
});

test("accepts valid Correction items before ordinary items in either future section", () => {
  const body = `## What changes for you

- **Correction (2026-07-15):** Clarify the supported Markdown file behavior.
- Add a user-visible Markdown Source action.

## Install or update

- **Correction (2026-07-16):** Run npm ci before npm run dev.
- Download the latest Source code (zip).
`;

  assert.doesNotThrow(() => validateReleaseChangelog(futureReleasePath, body));
});

test("accepts exactly the six closed legacy paths without applying the future structure", () => {
  const expectedLegacyPaths = [
    ".github/release-changelog/v0.1.0.md",
    ".github/release-changelog/v0.1.1.md",
    ".github/release-changelog/v0.1.2.md",
    ".github/release-changelog/v0.1.3.md",
    ".github/release-changelog/v0.1.4.md",
    ".github/release-changelog/v0.2.0.md",
  ];

  assert.deepEqual(legacyReleaseChangelogFileList, expectedLegacyPaths);

  for (const path of expectedLegacyPaths) {
    assert.doesNotThrow(() => validateReleaseChangelog(path, "## Legacy body\n\n- Historical item.\n"));
  }
});

test("rejects a legacy-shaped body at every path outside the closed legacy set", () => {
  assert.throws(
    () => validateReleaseChangelog(".github/release-changelog/v0.0.9.md", "## Legacy body\n\n- Historical item.\n"),
    /must start with exactly/,
  );
});

test("rejects a missing What changes for you section", () => {
  const body = `## Install or update

- Download the latest Source code (zip).
`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /must start with exactly/);
});

test("rejects a missing Install or update section", () => {
  const body = `## What changes for you

- Add a user-visible Markdown Source action.
`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /exactly the two approved headings/);
});

test("rejects an extra heading", () => {
  const body = `${validBody.trimEnd()}

### Maintainer notes

- Run npm run lint.
`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /exactly the two approved headings/);
});

test("rejects the two approved headings in the wrong order", () => {
  const body = `## Install or update

- Download the latest Source code (zip).

## What changes for you

- Add a user-visible Markdown Source action.
`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /must start with exactly/);
});

test("rejects a preamble", () => {
  const body = `MdClip has a new release.

${validBody}`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /must start with exactly/);
});

test("rejects a duplicate version heading", () => {
  const body = `## v0.2.1

${validBody}`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /must start with exactly/);
});

test("rejects an empty section", () => {
  const body = `## What changes for you

## Install or update

- Download the latest Source code (zip).
`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /must contain at least one list item/);
});

test("rejects paragraphs and empty list items inside an approved section", () => {
  const paragraphBody = validBody.replace(
    "- Add a user-visible Markdown Source action.",
    "Add a user-visible Markdown Source action.",
  );
  const emptyItemBody = validBody.replace("- Add a user-visible Markdown Source action.", "- ");

  assert.throws(() => validateReleaseChangelog(futureReleasePath, paragraphBody), /may contain only/);
  assert.throws(() => validateReleaseChangelog(futureReleasePath, emptyItemBody), /may contain only/);
});

test("rejects malformed and impossible Correction dates", () => {
  const malformedBody = validBody.replace(
    "- Add a user-visible Markdown Source action.",
    "- **Correction (2026/07/15):** Clarify the behavior.",
  );
  const impossibleBody = validBody.replace(
    "- Add a user-visible Markdown Source action.",
    "- **Correction (2026-02-30):** Clarify the behavior.",
  );

  assert.throws(() => validateReleaseChangelog(futureReleasePath, malformedBody), /YYYY-MM-DD/);
  assert.throws(() => validateReleaseChangelog(futureReleasePath, impossibleBody), /valid calendar date/);
});

test("rejects a Correction item placed after an ordinary item", () => {
  const body = validBody.replace(
    "- Add a user-visible Markdown Source action.",
    "- Add a user-visible Markdown Source action.\n- **Correction (2026-07-15):** Clarify the behavior.",
  );

  assert.throws(() => validateReleaseChangelog(futureReleasePath, body), /must precede ordinary items/);
});

test("rejects a legacy Correction item outside the first body-list position", () => {
  const body = `## v0.2.0

- Historical item.
- **Correction (2026-07-15):** Clarify the behavior.
`;

  assert.throws(() => validateReleaseChangelog(".github/release-changelog/v0.2.0.md", body), /first body list items/);
});

test("accepts the corrected body after an invalid extra section is removed", () => {
  const invalidBody = `${validBody.trimEnd()}

### Maintainer notes

- Run npm run lint.
`;

  assert.throws(() => validateReleaseChangelog(futureReleasePath, invalidBody));
  assert.doesNotThrow(() => validateReleaseChangelog(futureReleasePath, validBody));
});
