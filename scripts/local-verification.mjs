import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = process.cwd();
const workRoot = path.join(repoRoot, "local-verification");
const fixtureRoot = path.join(workRoot, "local-verification-fixtures");
const distRoot = path.join(workRoot, "local-verification-dist");

await rm(fixtureRoot, { recursive: true, force: true });
await rm(distRoot, { recursive: true, force: true });
await mkdir(fixtureRoot, { recursive: true });
await mkdir(distRoot, { recursive: true });

await verifyCommandEntryPoints();
await verifyMarkdownSourcePreferences();
await verifyMarkdownFileListing();
await verifyPreview();
await verifyDynamicPlaceholdersExpansion();

console.log("local verification passed");

async function verifyCommandEntryPoints() {
  const packageJson = JSON.parse(await readText("package.json"));

  for (const command of packageJson.commands ?? []) {
    const entryPoint = path.join(repoRoot, "src", `${command.name}.tsx`);
    await assertFileExists(entryPoint);
  }
}

async function verifyMarkdownSourcePreferences() {
  const packageJson = JSON.parse(await readText("package.json"));
  const preferences = Object.fromEntries(
    (packageJson.preferences ?? []).map((preference) => [preference.name, preference]),
  );

  for (const index of [1, 2, 3]) {
    assert.equal(preferences[`folder${index}Enabled`].type, "checkbox");
    assert.equal(preferences[`folder${index}Enabled`].title, `Markdown Source ${index}`);
    assert.equal(preferences[`folder${index}Enabled`].label, `Enable Markdown Source ${index}`);
    assert.equal(preferences[`folder${index}Enabled`].default, true);
    assert.equal(preferences[`folder${index}Enabled`].required, false);
    assert.equal(preferences[`folder${index}Directory`].type, "directory");
    assert.equal(preferences[`folder${index}Directory`].title, `Markdown Source ${index} Folder`);
    assert.equal(preferences[`folder${index}Directory`].required, false);
    assert.equal(preferences[`folder${index}DisplayName`].type, "textfield");
    assert.equal(preferences[`folder${index}DisplayName`].title, `Markdown Source ${index} Name`);
    assert.equal(preferences[`folder${index}DisplayName`].required, false);
  }
}

async function verifyPreviewPreferences() {
  const packageJson = JSON.parse(await readText("package.json"));
  const preferences = Object.fromEntries(
    (packageJson.preferences ?? []).map((preference) => [preference.name, preference]),
  );

  assert.equal(preferences.showPreview, undefined);
  assert.equal(preferences.previewLineCount.type, "textfield");
  assert.equal(preferences.previewLineCount.required, false);
  assert.equal(preferences.previewLineCount.default, "10");
  assert.equal(
    preferences.previewLineCount.description,
    "Number of leading preview lines. Enter a whole number from 1 to 100. Invalid values use 10; higher values use 100.",
  );
  assert.equal(preferences.previewMaxCharacters.type, "textfield");
  assert.equal(preferences.previewMaxCharacters.required, false);
  assert.equal(preferences.previewMaxCharacters.default, "4000");
  assert.equal(
    preferences.previewMaxCharacters.description,
    "Maximum preview characters. A displayed character that crosses the limit is omitted instead of split. Enter a whole number from 1 to 20000. Invalid values use 4000; higher values use 20000.",
  );
}

async function verifyMarkdownFileListing() {
  const outputFile = path.join(distRoot, "markdownFiles.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "markdownFiles.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
  });

  const {
    classifyMarkdownSourceLoadFailure,
    getMarkdownFileSearchFields,
    listMarkdownFiles,
    listMarkdownFilesFromMarkdownSources,
  } = await import(pathToFileURL(outputFile));
  const markdownSourceRoot = path.join(fixtureRoot, "markdown-source");
  const secondMarkdownSourceRoot = path.join(fixtureRoot, "second-markdown-source");
  const missingMarkdownSourceRoot = path.join(fixtureRoot, "missing-markdown-source");
  await mkdir(path.join(markdownSourceRoot, "nested"), { recursive: true });
  await mkdir(path.join(markdownSourceRoot, ".hidden"), { recursive: true });
  await mkdir(path.join(markdownSourceRoot, ".git"), { recursive: true });
  await mkdir(path.join(markdownSourceRoot, "node_modules"), { recursive: true });
  await mkdir(secondMarkdownSourceRoot, { recursive: true });
  await writeFile(path.join(markdownSourceRoot, "a.md"), "# A\n");
  await writeFile(path.join(markdownSourceRoot, "nested", "b.MD"), "# B\n");
  await writeFile(path.join(markdownSourceRoot, "c.txt"), "C\n");
  await writeFile(path.join(markdownSourceRoot, ".hidden", "hidden.md"), "hidden\n");
  await writeFile(path.join(markdownSourceRoot, ".git", "ignored.md"), "git\n");
  await writeFile(path.join(markdownSourceRoot, "node_modules", "ignored.md"), "node_modules\n");
  await writeFile(path.join(secondMarkdownSourceRoot, "second.md"), "# Second\n");

  const files = await listMarkdownFiles({
    id: 1,
    commandTitle: "Markdown Source 1",
    displayName: "Fixture",
    directory: markdownSourceRoot,
  });

  assert.deepEqual(
    files.map((file) => file.relativePath),
    ["a.md", path.join("nested", "b.MD")],
  );
  assert(files.every((file) => file.markdownSource.displayName === "Fixture"));
  assert(files.every((file) => file.size > 0));
  assert(files.every((file) => file.updatedAt instanceof Date));

  const nestedFile = files.find((file) => file.relativePath === path.join("nested", "b.MD"));
  assert(nestedFile);

  const searchFields = getMarkdownFileSearchFields(nestedFile);
  assert.equal(searchFields.title, "b.MD");
  assert.deepEqual(searchFields.keywords, [path.join("nested", "b.MD"), "nested", "Fixture"]);
  assert(!searchFields.keywords.includes(nestedFile.path));
  assert(!searchFields.keywords.some((keyword) => keyword.includes("# B")));

  const combinedResult = await listMarkdownFilesFromMarkdownSources([
    {
      id: 1,
      commandTitle: "Markdown Source 1",
      displayName: "Fixture",
      directory: markdownSourceRoot,
    },
    {
      id: 2,
      commandTitle: "Markdown Source 2",
      displayName: "Missing Fixture",
      directory: missingMarkdownSourceRoot,
    },
    {
      id: 3,
      commandTitle: "Markdown Source 3",
      displayName: "Second Fixture",
      directory: secondMarkdownSourceRoot,
    },
  ]);

  assert.deepEqual(
    combinedResult.files.map((file) => file.relativePath),
    ["a.md", path.join("nested", "b.MD"), "second.md"],
  );
  assert.equal(combinedResult.failures.length, 1);
  assert.equal(combinedResult.failures[0].markdownSource.displayName, "Missing Fixture");
  assert.equal(combinedResult.failures[0].reason, "source-unavailable");
  assert.equal(combinedResult.failures[0].message, undefined);

  const notDirectoryPath = path.join(fixtureRoot, "not-directory.md");
  await writeFile(notDirectoryPath, "# Not Directory\n");

  const notDirectoryResult = await listMarkdownFilesFromMarkdownSources([
    {
      id: 1,
      commandTitle: "Markdown Source 1",
      displayName: "Not Directory",
      directory: notDirectoryPath,
    },
  ]);

  assert.deepEqual(notDirectoryResult.files, []);
  assert.equal(notDirectoryResult.failures.length, 1);
  assert.equal(notDirectoryResult.failures[0].reason, "source-unavailable");

  for (const code of ["EACCES", "EPERM"]) {
    assert.equal(
      classifyMarkdownSourceLoadFailure(Object.assign(new Error("internal detail"), { code }), "source-root"),
      "source-unreadable",
    );
    assert.equal(
      classifyMarkdownSourceLoadFailure(Object.assign(new Error("internal detail"), { code }), "source-contents"),
      "source-unreadable",
    );
  }

  for (const code of ["ENOENT", "ENOTDIR"]) {
    assert.equal(
      classifyMarkdownSourceLoadFailure(Object.assign(new Error("internal detail"), { code }), "source-root"),
      "source-unavailable",
    );
    assert.equal(
      classifyMarkdownSourceLoadFailure(Object.assign(new Error("internal detail"), { code }), "source-contents"),
      "source-read-failed",
    );
  }

  assert.equal(
    classifyMarkdownSourceLoadFailure(Object.assign(new Error("internal detail"), { code: "EMFILE" }), "source-root"),
    "source-read-failed",
  );
  assert.equal(
    classifyMarkdownSourceLoadFailure(new Error("internal detail"), "source-contents"),
    "source-read-failed",
  );

  await assert.rejects(
    () =>
      listMarkdownFiles({
        id: 1,
        commandTitle: "Markdown Source 1",
        displayName: "Not Directory",
        directory: notDirectoryPath,
      }),
    (error) => {
      assert.equal(error.reason, "source-unavailable");
      assert(!String(error.message).includes(notDirectoryPath));
      return true;
    },
  );
}

async function verifyPreview() {
  await verifyPreviewPreferences();

  const outputFile = path.join(distRoot, "preview.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "preview.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
  });

  const { getPreviewOptions, readMarkdownPreview } = await import(pathToFileURL(outputFile));
  const preferenceCases = [
    {
      name: "uses defaults for missing and empty values",
      preferences: { previewLineCount: undefined, previewMaxCharacters: "" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "accepts minimum values",
      preferences: { previewLineCount: "1", previewMaxCharacters: "1" },
      expected: { lineCount: 1, maxCharacters: 1 },
    },
    {
      name: "accepts maximum values",
      preferences: { previewLineCount: "100", previewMaxCharacters: "20000" },
      expected: { lineCount: 100, maxCharacters: 20000 },
    },
    {
      name: "trims surrounding whitespace and accepts leading zeros",
      preferences: { previewLineCount: " 0042 ", previewMaxCharacters: "\t012000\n" },
      expected: { lineCount: 42, maxCharacters: 12000 },
    },
    {
      name: "uses defaults for zero",
      preferences: { previewLineCount: "0", previewMaxCharacters: "000" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "uses defaults for signs",
      preferences: { previewLineCount: "-1", previewMaxCharacters: "+4000" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "uses defaults for decimals",
      preferences: { previewLineCount: "10.5", previewMaxCharacters: "4000.0" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "uses defaults for exponent notation",
      preferences: { previewLineCount: "1e2", previewMaxCharacters: "4e3" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "uses defaults for mixed characters",
      preferences: { previewLineCount: "20lines", previewMaxCharacters: "4000chars" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "uses defaults for non-ASCII digits",
      preferences: { previewLineCount: "１２", previewMaxCharacters: "٤٠٠٠" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "uses defaults for internal whitespace",
      preferences: { previewLineCount: "1 0", previewMaxCharacters: "4 000" },
      expected: { lineCount: 10, maxCharacters: 4000 },
    },
    {
      name: "caps values above the maximum",
      preferences: { previewLineCount: "101", previewMaxCharacters: "20001" },
      expected: { lineCount: 100, maxCharacters: 20000 },
    },
    {
      name: "caps digit strings larger than the JavaScript number range",
      preferences: { previewLineCount: "9".repeat(400), previewMaxCharacters: "9".repeat(400) },
      expected: { lineCount: 100, maxCharacters: 20000 },
    },
  ];

  for (const preferenceCase of preferenceCases) {
    assert.deepEqual(
      getPreviewOptions(preferenceCase.preferences, false),
      { isEnabled: false, ...preferenceCase.expected },
      preferenceCase.name,
    );
  }

  assert.equal(getPreviewOptions({}, true).isEnabled, true);

  const previewFilePath = path.join(fixtureRoot, "preview.md");
  await writeFile(previewFilePath, ["line1", "line2", "line3", "line4"].join("\n"));

  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 2, maxCharacters: 1000 }), {
    content: "line1\nline2",
    isTruncated: true,
  });
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 8 }), {
    content: "line1\nli",
    isTruncated: true,
  });

  await writeFile(previewFilePath, "line1\nline2");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 2, maxCharacters: 1000 }), {
    content: "line1\nline2",
    isTruncated: false,
  });

  await writeFile(previewFilePath, "12345678");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 8 }), {
    content: "12345678",
    isTruncated: false,
  });

  await writeFile(previewFilePath, "");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1000 }), {
    content: "",
    isTruncated: false,
  });

  await writeFile(previewFilePath, "line1\r\nline2\r\nline3");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 2, maxCharacters: 1000 }), {
    content: "line1\nline2",
    isTruncated: true,
  });

  await writeFile(previewFilePath, "line1\r\nline2");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 2, maxCharacters: 1000 }), {
    content: "line1\nline2",
    isTruncated: false,
  });

  await writeFile(previewFilePath, "😀");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1 }), {
    content: "😀",
    isTruncated: false,
  });

  await writeFile(previewFilePath, "😀X");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1 }), {
    content: "😀",
    isTruncated: true,
  });

  await writeFile(previewFilePath, "e\u0301X");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1 }), {
    content: "",
    isTruncated: true,
  });
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 2 }), {
    content: "e\u0301",
    isTruncated: true,
  });

  const familyEmoji = "👨‍👩‍👧‍👦";
  await writeFile(previewFilePath, `${familyEmoji}X`);
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 6 }), {
    content: "",
    isTruncated: true,
  });
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 7 }), {
    content: familyEmoji,
    isTruncated: true,
  });

  await writeFile(previewFilePath, "🇯🇵X");
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 2 }), {
    content: "🇯🇵",
    isTruncated: true,
  });

  const devanagariConjunct = "क्षि";
  await writeFile(previewFilePath, `${devanagariConjunct}X`);
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 3 }), {
    content: "",
    isTruncated: true,
  });
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 4 }), {
    content: devanagariConjunct,
    isTruncated: true,
  });

  const chunkBoundaryPrefix = "a".repeat(4095);
  await writeFile(previewFilePath, `${chunkBoundaryPrefix}😀X`);
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 4096 }), {
    content: `${chunkBoundaryPrefix}😀`,
    isTruncated: true,
  });

  await writeFile(previewFilePath, `a${"\u0301".repeat(20000)}X`);
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 20000 }), {
    content: "",
    isTruncated: true,
  });
}

async function verifyDynamicPlaceholdersExpansion() {
  const dynamicPlaceholdersOutputFile = path.join(distRoot, "dynamicPlaceholders.mjs");
  const clipboardOutputFile = path.join(distRoot, "clipboard.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "dynamicPlaceholders.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: dynamicPlaceholdersOutputFile,
    plugins: [createRaycastApiStubPlugin()],
  });

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "clipboard.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: clipboardOutputFile,
    plugins: [createRaycastApiStubPlugin()],
  });

  const { expandDynamicPlaceholders } = await import(pathToFileURL(dynamicPlaceholdersOutputFile));
  const { copyMarkdownFile } = await import(pathToFileURL(clipboardOutputFile));

  resetRaycastApiStub("text");
  const expanded = await expandDynamicPlaceholders(
    "date={date}\ntime={time}\ndatetime={datetime}\nday={day}\ntimezone={timezone}\nnow={now}\nuuid_one={uuid}\nuuid_two={uuid}\nclipboard={clipboard}",
  );

  assert.match(expanded, /date=.+/);
  assert.match(expanded, /time=.+/);
  assert.match(expanded, /datetime=.+/);
  assert(!expanded.includes("datetime={datetime}"));
  assert(!expanded.includes("day={day}"));
  assert.match(expanded, /timezone=(.+ )?UTC[+-]\d{2}:\d{2}/);
  assert(!expanded.includes("timezone={timezone}"));
  assert.match(expanded, /now=.+ (.+ )?UTC[+-]\d{2}:\d{2}/);
  assert(!expanded.includes("now={now}"));
  const uuidMatches = expanded.match(/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/g);
  assert.equal(uuidMatches?.length, 2);
  assert.notEqual(uuidMatches[0], uuidMatches[1]);
  assert.match(expanded, /clipboard=CLIPBOARD_TEXT/);
  assert(!expanded.includes("{date}"));
  assert(!expanded.includes("{clipboard}"));
  assert.equal(globalThis.__mdclipClipboardReadCount, 1);

  resetRaycastApiStub("empty");
  assert.equal(await expandDynamicPlaceholders("before{clipboard}after"), "beforeafter");
  assert.equal(globalThis.__mdclipClipboardReadCount, 1);

  resetRaycastApiStub("error");
  await assert.rejects(expandDynamicPlaceholders("clipboard={clipboard}"), /CLIPBOARD_READ_FAILED/);
  assert.equal(globalThis.__mdclipClipboardReadCount, 1);

  resetRaycastApiStub("error");
  await expandDynamicPlaceholders("date={date}\ntimezone={timezone}");
  assert.equal(globalThis.__mdclipClipboardReadCount, 0);

  const copyFilePath = path.join(fixtureRoot, "copy.md");
  const markdownFile = { name: "copy.md", path: copyFilePath };
  await writeFile(copyFilePath, "clipboard={clipboard}");

  resetRaycastApiStub("text");
  await copyMarkdownFile(markdownFile, { expand: true });
  assert.deepEqual(globalThis.__mdclipClipboardCopies, ["clipboard=CLIPBOARD_TEXT"]);
  assert.deepEqual(globalThis.__mdclipHudMessages, ["Copied Expanded Content: copy.md"]);

  resetRaycastApiStub("empty");
  await copyMarkdownFile(markdownFile, { expand: true });
  assert.deepEqual(globalThis.__mdclipClipboardCopies, ["clipboard="]);
  assert.deepEqual(globalThis.__mdclipHudMessages, ["Copied Expanded Content: copy.md"]);

  resetRaycastApiStub("error");
  await assert.rejects(copyMarkdownFile(markdownFile, { expand: true }), /CLIPBOARD_READ_FAILED/);
  assert.deepEqual(globalThis.__mdclipClipboardCopies, []);
  assert.deepEqual(globalThis.__mdclipHudMessages, []);

  resetRaycastApiStub("error");
  await copyMarkdownFile(markdownFile, { expand: false });
  assert.equal(globalThis.__mdclipClipboardReadCount, 0);
  assert.deepEqual(globalThis.__mdclipClipboardCopies, ["clipboard={clipboard}"]);
  assert.deepEqual(globalThis.__mdclipHudMessages, ["Copied Raw Content: copy.md"]);
}

function createRaycastApiStubPlugin() {
  return {
    name: "raycast-api-stub",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^@raycast\/api$/ }, () => ({
        path: "raycast-api-stub",
        namespace: "raycast-api-stub",
      }));
      pluginBuild.onLoad({ filter: /.*/, namespace: "raycast-api-stub" }, () => ({
        contents: `
globalThis.__mdclipClipboardReadCount ??= 0;
globalThis.__mdclipClipboardReadMode ??= "text";
globalThis.__mdclipClipboardCopies ??= [];
globalThis.__mdclipHudMessages ??= [];

export const Clipboard = {
  readText: async () => {
    globalThis.__mdclipClipboardReadCount += 1;
    if (globalThis.__mdclipClipboardReadMode === "error") {
      throw new Error("CLIPBOARD_READ_FAILED");
    }
    if (globalThis.__mdclipClipboardReadMode === "empty") {
      return undefined;
    }
    return "CLIPBOARD_TEXT";
  },
  copy: async (content) => {
    globalThis.__mdclipClipboardCopies.push(content);
  },
};

export async function showHUD(message) {
  globalThis.__mdclipHudMessages.push(message);
}
`,
        loader: "js",
      }));
    },
  };
}

function resetRaycastApiStub(readMode) {
  globalThis.__mdclipClipboardReadCount = 0;
  globalThis.__mdclipClipboardReadMode = readMode;
  globalThis.__mdclipClipboardCopies = [];
  globalThis.__mdclipHudMessages = [];
}

async function readText(relativePath) {
  return await readFile(path.join(repoRoot, relativePath), "utf8");
}

async function assertFileExists(filePath) {
  await access(filePath);
}
