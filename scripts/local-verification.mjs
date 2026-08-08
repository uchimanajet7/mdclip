import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
await verifyListFilteringContract();
await verifyUserFacingFailureContract();
await verifyMarkdownFileListing();
await verifyPreview();
await verifyPreviewVisibility();
await verifyFeedback();
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

async function verifyListFilteringContract() {
  const listSource = await readText("src/components/MarkdownFileList.tsx");
  const individualSourceCommand = await readText("src/components/MarkdownSourceCommand.tsx");
  const allSourcesCommand = await readText("src/components/AllMarkdownSourcesCommand.tsx");

  assert(
    listSource.includes("filtering={{ keepSectionOrder: false }}"),
    "MarkdownFileList must explicitly allow Raycast filtering to rank source sections.",
  );
  assert(
    listSource.includes("searchText={searchText}") &&
      listSource.includes("setSearchText(normalizeMarkdownSearchText(value))"),
    "MarkdownFileList must normalize controlled search input before Raycast filtering.",
  );
  assert(
    listSource.includes("title={normalizeMarkdownSearchText(failure.markdownSource.displayName)}"),
    "Markdown source failure item titles must use the same normalized search boundary.",
  );
  assert(
    individualSourceCommand.includes("includeMarkdownSourceNameInSearch={false}"),
    "Individual Markdown Source commands must exclude the Markdown Source name from search.",
  );
  assert(
    allSourcesCommand.includes("includeMarkdownSourceNameInSearch={true}"),
    "All Markdown Sources must include the Markdown Source name in search.",
  );
  assert(
    listSource.includes("id={getMarkdownFileListItemId(file)}") &&
      listSource.includes("key={getMarkdownFileListItemId(file)}"),
    "Markdown file list items must retain source identity in their Raycast and React identifiers.",
  );
  assert(!listSource.includes("id={file.path}"), "A file path alone cannot identify a source-specific occurrence.");
}

async function verifyUserFacingFailureContract() {
  const listSource = await readText("src/components/MarkdownFileList.tsx");
  const clipboardSource = await readText("src/services/clipboard.ts");
  const dynamicPlaceholdersSource = await readText("src/services/dynamicPlaceholders.ts");
  const feedbackSource = await readText("src/services/feedback.ts");
  const previewVisibilitySource = await readText("src/services/previewVisibility.ts");
  const utf8Source = await readText("src/services/utf8.ts");

  assert(!listSource.includes("getErrorMessage"));
  assert(!listSource.includes("String(error)"));
  assert(!listSource.includes("error.message"));
  assert(!listSource.includes("Failed to copy content"));
  assert(!listSource.includes("Failed to save preview setting"));
  assert(
    listSource.includes(
      "MdClip could not read the file for preview. Check the file and its Markdown Source folder, then open the command again.",
    ),
  );
  assert(
    listSource.includes(
      "MdClip could not read the file. Check the file and its Markdown Source folder, then open the command again.",
    ),
  );
  assert(listSource.includes("MdClip could not read the Clipboard. Try again."));
  assert(listSource.includes("MdClip could not write to the Clipboard. Try again."));
  assert(listSource.includes("MdClip could not complete the copy. Try again."));
  assert(listSource.includes("Open the file in a text editor, save it as UTF-8, and try again."));
  assert(listSource.includes("The previous setting is still in use. Try again."));
  assert(listSource.includes("MdClip could not load Markdown files. Open the command again."));
  assert(!listSource.includes("Check the configured folders and open the command again."));
  assert(!listSource.includes("showToast("));
  assert(!clipboardSource.includes("showHUD("));
  assert(clipboardSource.includes("CopyMarkdownFileError"));
  assert(clipboardSource.includes('"invalid-utf8"'));
  assert(dynamicPlaceholdersSource.includes("ClipboardReadError"));
  assert(feedbackSource.includes("showToast({ style: Toast.Style.Failure, title, message })"));
  assert(feedbackSource.includes("await showHUD(title)"));
  assert(previewVisibilitySource.includes("return DEFAULT_PREVIEW_ENABLED"));
  assert(utf8Source.includes('new TextDecoder("utf-8", { fatal: true, ignoreBOM: false })'));
  assert(!utf8Source.includes('includes("�")'));

  const successfulFileStateIndex = listSource.indexOf(
    "setState({ files: result.files, failures: result.failures, isLoading: false })",
  );
  const partialFailureToastIndex = listSource.indexOf('title: "Some Markdown Sources could not be loaded"');
  assert(successfulFileStateIndex >= 0 && successfulFileStateIndex < partialFailureToastIndex);
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
    "Maximum preview length. Enter a whole number from 1 to 20000. Invalid values use 4000; higher values use 20000.",
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
    getMarkdownFileListItemId,
    getMarkdownFileSearchFields,
    listMarkdownFiles,
    listMarkdownFilesFromMarkdownSources,
    normalizeMarkdownSearchText,
  } = await import(pathToFileURL(outputFile));
  const markdownSourceRoot = path.join(fixtureRoot, "markdown-source");
  const secondMarkdownSourceRoot = path.join(fixtureRoot, "second-markdown-source");
  const unicodeMarkdownSourceRoot = path.join(fixtureRoot, "unicode-markdown-source");
  const missingMarkdownSourceRoot = path.join(fixtureRoot, "missing-markdown-source");
  const symbolicLinkRoot = path.join(fixtureRoot, "symbolic-link-root");
  const brokenSymbolicLinkRoot = path.join(fixtureRoot, "broken-symbolic-link-root");
  const ancestorTargetRoot = path.join(fixtureRoot, "ancestor-target");
  const ancestorSymbolicLink = path.join(fixtureRoot, "ancestor-symbolic-link");
  const sourceBelowSymbolicLinkAncestor = path.join(ancestorSymbolicLink, "source");
  const decomposedReview = "レヒ\u3099ュー";
  const composedReview = "レビュー";
  const decomposedDirectoryName = `依頼-${decomposedReview}`;
  const decomposedFileName = `${decomposedReview}依頼.md`;
  const decomposedSourceName = `Markdown ${decomposedReview}`;
  await mkdir(path.join(markdownSourceRoot, "nested"), { recursive: true });
  await mkdir(path.join(markdownSourceRoot, ".hidden"), { recursive: true });
  await mkdir(path.join(markdownSourceRoot, ".git"), { recursive: true });
  await mkdir(path.join(markdownSourceRoot, "node_modules"), { recursive: true });
  await mkdir(secondMarkdownSourceRoot, { recursive: true });
  await mkdir(path.join(unicodeMarkdownSourceRoot, decomposedDirectoryName), { recursive: true });
  await mkdir(path.join(ancestorTargetRoot, "source"), { recursive: true });
  await writeFile(path.join(markdownSourceRoot, "a.md"), "# A\n");
  await writeFile(path.join(markdownSourceRoot, "nested", "b.MD"), "# B\n");
  await writeFile(path.join(markdownSourceRoot, "c.txt"), "C\n");
  await writeFile(path.join(markdownSourceRoot, ".hidden", "hidden.md"), "hidden\n");
  await writeFile(path.join(markdownSourceRoot, ".git", "ignored.md"), "git\n");
  await writeFile(path.join(markdownSourceRoot, "node_modules", "ignored.md"), "node_modules\n");
  await writeFile(path.join(secondMarkdownSourceRoot, "second.md"), "# Second\n");
  await writeFile(path.join(unicodeMarkdownSourceRoot, decomposedDirectoryName, decomposedFileName), "# Unicode\n");
  await writeFile(path.join(ancestorTargetRoot, "source", "ancestor.md"), "# Ancestor\n");
  await symlink("a.md", path.join(markdownSourceRoot, "linked-file.md"));
  await symlink("nested", path.join(markdownSourceRoot, "linked-directory"));
  await symlink(markdownSourceRoot, symbolicLinkRoot);
  await symlink(path.join(fixtureRoot, "missing-symbolic-link-target"), brokenSymbolicLinkRoot);
  await symlink(ancestorTargetRoot, ancestorSymbolicLink);

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

  const duplicateSourceResult = await listMarkdownFilesFromMarkdownSources([
    {
      id: 1,
      commandTitle: "Markdown Source 1",
      displayName: "First Logical Source",
      directory: markdownSourceRoot,
    },
    {
      id: 2,
      commandTitle: "Markdown Source 2",
      displayName: "Second Logical Source",
      directory: markdownSourceRoot,
    },
  ]);
  assert.equal(duplicateSourceResult.failures.length, 0);
  assert.deepEqual(
    duplicateSourceResult.files.map((file) => [file.markdownSource.id, file.relativePath]),
    [
      [1, "a.md"],
      [1, path.join("nested", "b.MD")],
      [2, "a.md"],
      [2, path.join("nested", "b.MD")],
    ],
  );
  const duplicateFileOccurrences = duplicateSourceResult.files.filter((file) => file.relativePath === "a.md");
  assert.equal(duplicateFileOccurrences.length, 2);
  assert.equal(duplicateFileOccurrences[0].path, duplicateFileOccurrences[1].path);
  assert.notEqual(
    getMarkdownFileListItemId(duplicateFileOccurrences[0]),
    getMarkdownFileListItemId(duplicateFileOccurrences[1]),
  );
  assert.equal(
    getMarkdownFileListItemId(duplicateFileOccurrences[0]),
    JSON.stringify([duplicateFileOccurrences[0].markdownSource.id, duplicateFileOccurrences[0].path]),
  );

  const overlappingSourceResult = await listMarkdownFilesFromMarkdownSources([
    {
      id: 1,
      commandTitle: "Markdown Source 1",
      displayName: "Parent Source",
      directory: markdownSourceRoot,
    },
    {
      id: 2,
      commandTitle: "Markdown Source 2",
      displayName: "Nested Source",
      directory: path.join(markdownSourceRoot, "nested"),
    },
  ]);
  assert.equal(overlappingSourceResult.failures.length, 0);
  const overlappingFileOccurrences = overlappingSourceResult.files.filter((file) => file.name === "b.MD");
  assert.deepEqual(
    overlappingFileOccurrences.map((file) => [file.markdownSource.id, file.relativePath]),
    [
      [1, path.join("nested", "b.MD")],
      [2, "b.MD"],
    ],
  );
  assert.equal(overlappingFileOccurrences[0].path, overlappingFileOccurrences[1].path);
  assert.notEqual(
    getMarkdownFileListItemId(overlappingFileOccurrences[0]),
    getMarkdownFileListItemId(overlappingFileOccurrences[1]),
  );

  const filesBelowSymbolicLinkAncestor = await listMarkdownFiles({
    id: 1,
    commandTitle: "Markdown Source 1",
    displayName: "Ancestor Fixture",
    directory: sourceBelowSymbolicLinkAncestor,
  });

  assert.deepEqual(
    filesBelowSymbolicLinkAncestor.map((file) => file.relativePath),
    ["ancestor.md"],
  );

  const nestedFile = files.find((file) => file.relativePath === path.join("nested", "b.MD"));
  assert(nestedFile);

  const individualSourceSearchFields = getMarkdownFileSearchFields(nestedFile, {
    includeMarkdownSourceName: false,
  });
  assert.equal(individualSourceSearchFields.title, "b.MD");
  assert.deepEqual(individualSourceSearchFields.keywords, [path.join("nested", "b.MD"), "nested"]);
  assert(!individualSourceSearchFields.keywords.includes("Fixture"));
  assert(!individualSourceSearchFields.keywords.includes(nestedFile.path));
  assert(!individualSourceSearchFields.keywords.some((keyword) => keyword.includes("# B")));

  const allSourcesSearchFields = getMarkdownFileSearchFields(nestedFile, {
    includeMarkdownSourceName: true,
  });
  assert.equal(allSourcesSearchFields.title, "b.MD");
  assert.deepEqual(allSourcesSearchFields.keywords, [path.join("nested", "b.MD"), "nested", "Fixture"]);
  assert(!allSourcesSearchFields.keywords.includes(nestedFile.path));
  assert(!allSourcesSearchFields.keywords.some((keyword) => keyword.includes("# B")));

  const unicodeFiles = await listMarkdownFiles({
    id: 1,
    commandTitle: "Markdown Source 1",
    displayName: decomposedSourceName,
    directory: unicodeMarkdownSourceRoot,
  });
  assert.equal(unicodeFiles.length, 1);

  const unicodeFile = unicodeFiles[0];
  const rawUnicodeRelativePath = path.join(decomposedDirectoryName, decomposedFileName);
  assert.equal(unicodeFile.name, decomposedFileName);
  assert.equal(unicodeFile.relativePath, rawUnicodeRelativePath);
  assert.equal(unicodeFile.path, path.join(unicodeMarkdownSourceRoot, rawUnicodeRelativePath));
  assert.notEqual(unicodeFile.path, unicodeFile.path.normalize("NFC"));
  assert.notEqual(getMarkdownFileListItemId(unicodeFile), getMarkdownFileListItemId(unicodeFile).normalize("NFC"));
  assert.equal(normalizeMarkdownSearchText(decomposedReview), composedReview);
  assert.equal(normalizeMarkdownSearchText(decomposedReview), normalizeMarkdownSearchText(composedReview));
  assert.equal(normalizeMarkdownSearchText("Ａ"), "Ａ");

  const unicodeIndividualSearchFields = getMarkdownFileSearchFields(unicodeFile, {
    includeMarkdownSourceName: false,
  });
  assert.equal(unicodeIndividualSearchFields.title, `${composedReview}依頼.md`);
  assert.deepEqual(unicodeIndividualSearchFields.keywords, [
    path.join(`依頼-${composedReview}`, `${composedReview}依頼.md`),
    `依頼-${composedReview}`,
  ]);
  assert(!unicodeIndividualSearchFields.keywords.includes(`Markdown ${composedReview}`));

  const unicodeAllSourcesSearchFields = getMarkdownFileSearchFields(unicodeFile, {
    includeMarkdownSourceName: true,
  });
  assert.deepEqual(unicodeAllSourcesSearchFields.keywords, [
    path.join(`依頼-${composedReview}`, `${composedReview}依頼.md`),
    `依頼-${composedReview}`,
    `Markdown ${composedReview}`,
  ]);
  assert(
    [unicodeAllSourcesSearchFields.title, ...unicodeAllSourcesSearchFields.keywords].every(
      (value) => value === value.normalize("NFC"),
    ),
  );

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

  const symbolicLinkCombinedResult = await listMarkdownFilesFromMarkdownSources([
    {
      id: 1,
      commandTitle: "Markdown Source 1",
      displayName: "Symbolic Link Fixture",
      directory: symbolicLinkRoot,
    },
    {
      id: 2,
      commandTitle: "Markdown Source 2",
      displayName: "Second Fixture",
      directory: secondMarkdownSourceRoot,
    },
  ]);

  assert.deepEqual(
    symbolicLinkCombinedResult.files.map((file) => file.relativePath),
    ["second.md"],
  );
  assert.equal(symbolicLinkCombinedResult.failures.length, 1);
  assert.equal(symbolicLinkCombinedResult.failures[0].markdownSource.displayName, "Symbolic Link Fixture");
  assert.equal(symbolicLinkCombinedResult.failures[0].reason, "source-symbolic-link");
  assert.equal(symbolicLinkCombinedResult.failures[0].message, undefined);

  const brokenSymbolicLinkResult = await listMarkdownFilesFromMarkdownSources([
    {
      id: 1,
      commandTitle: "Markdown Source 1",
      displayName: "Broken Symbolic Link Fixture",
      directory: brokenSymbolicLinkRoot,
    },
  ]);

  assert.deepEqual(brokenSymbolicLinkResult.files, []);
  assert.equal(brokenSymbolicLinkResult.failures.length, 1);
  assert.equal(brokenSymbolicLinkResult.failures[0].reason, "source-symbolic-link");

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

  await writeFile(
    previewFilePath,
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("heading\nbody", "utf8")]),
  );
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1000 }), {
    content: "heading\nbody",
    isTruncated: false,
  });

  const validReplacementCharacterContent = "replacement=�\ninterior-bom=\uFEFF";
  await writeFile(previewFilePath, validReplacementCharacterContent);
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1000 }), {
    content: validReplacementCharacterContent,
    isTruncated: false,
  });

  await writeFile(previewFilePath, Buffer.from([0x93, 0xfa, 0x96, 0x7b]));
  await assert.rejects(readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1000 }), (error) => {
    assert.equal(error.name, "InvalidUtf8Error");
    assert.equal(error.message, "MdClip could not decode Markdown content as UTF-8.");
    assert(!error.message.includes(previewFilePath));
    return true;
  });

  await writeFile(previewFilePath, Buffer.from([0xe2, 0x82]));
  await assert.rejects(readMarkdownPreview(previewFilePath, { lineCount: 10, maxCharacters: 1000 }), (error) => {
    assert.equal(error.name, "InvalidUtf8Error");
    return true;
  });

  const boundedPreviewPrefix = Buffer.from(`line1\n${"a".repeat(4090)}`, "utf8");
  assert.equal(boundedPreviewPrefix.length, 4096);
  await writeFile(previewFilePath, Buffer.concat([boundedPreviewPrefix, Buffer.from([0x80])]));
  assert.deepEqual(await readMarkdownPreview(previewFilePath, { lineCount: 1, maxCharacters: 20000 }), {
    content: "line1",
    isTruncated: true,
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

async function verifyPreviewVisibility() {
  const outputFile = path.join(distRoot, "previewVisibility.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "previewVisibility.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
    plugins: [createRaycastApiStubPlugin()],
  });

  const { readPreviewVisibility, savePreviewVisibility } = await import(pathToFileURL(outputFile));

  resetRaycastApiStub("text", { cacheConstructorMode: "error" });
  const constructorDiagnostics = await captureConsoleErrors(async () => {
    assert.equal(readPreviewVisibility(), true);
  });
  assert.equal(constructorDiagnostics.length, 1);
  assert.equal(constructorDiagnostics[0][0], "[MdClip] Could not read the preview setting.");

  resetRaycastApiStub("text");
  assert.equal(readPreviewVisibility(), true);
  assert.equal(savePreviewVisibility(false), true);
  assert.equal(readPreviewVisibility(), false);
  assert.equal(globalThis.__mdclipCacheValues["mdclip.preview.enabled"], "false");

  globalThis.__mdclipCacheValues["mdclip.preview.enabled"] = "invalid";
  assert.equal(readPreviewVisibility(), true);

  globalThis.__mdclipCacheGetMode = "error";
  const readDiagnostics = await captureConsoleErrors(async () => {
    assert.equal(readPreviewVisibility(), true);
  });
  assert.equal(readDiagnostics.length, 1);
  assert.equal(readDiagnostics[0][0], "[MdClip] Could not read the preview setting.");

  globalThis.__mdclipCacheGetMode = "success";
  globalThis.__mdclipCacheSetMode = "error";
  const writeDiagnostics = await captureConsoleErrors(async () => {
    assert.equal(savePreviewVisibility(true), false);
  });
  assert.equal(writeDiagnostics.length, 1);
  assert.equal(writeDiagnostics[0][0], "[MdClip] Could not save the preview setting.");
  assert.equal(globalThis.__mdclipCacheValues["mdclip.preview.enabled"], "invalid");
}

async function verifyFeedback() {
  const outputFile = path.join(distRoot, "feedback.mjs");

  await build({
    entryPoints: [path.join(repoRoot, "src", "services", "feedback.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: outputFile,
    plugins: [createRaycastApiStubPlugin()],
  });

  const { showCopySuccessHUD, showFailureToast } = await import(pathToFileURL(outputFile));

  resetRaycastApiStub("text");
  await showFailureToast({ title: "Could not complete operation", message: "Try again." });
  assert.deepEqual(globalThis.__mdclipToasts, [
    { style: "failure", title: "Could not complete operation", message: "Try again." },
  ]);

  globalThis.__mdclipToastMode = "error";
  const toastDiagnostics = await captureConsoleErrors(async () => {
    await showFailureToast({ title: "Could not complete operation", message: "Try again." });
  });
  assert.equal(toastDiagnostics.length, 1);
  assert.equal(toastDiagnostics[0][0], "[MdClip] Could not show a failure notification.");

  resetRaycastApiStub("text");
  await showCopySuccessHUD("Copied Raw Content: copy.md");
  assert.deepEqual(globalThis.__mdclipHudMessages, ["Copied Raw Content: copy.md"]);

  globalThis.__mdclipHudMode = "error";
  const hudDiagnostics = await captureConsoleErrors(async () => {
    await showCopySuccessHUD("Copied Raw Content: copy.md");
  });
  assert.equal(hudDiagnostics.length, 1);
  assert.equal(hudDiagnostics[0][0], "[MdClip] Could not show the copy confirmation.");
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

  const { ClipboardReadError, expandDynamicPlaceholders } = await import(pathToFileURL(dynamicPlaceholdersOutputFile));
  const { CopyMarkdownFileError, copyMarkdownFile } = await import(pathToFileURL(clipboardOutputFile));

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
  const placeholderReadDiagnostics = await captureConsoleErrors(async () => {
    await assert.rejects(expandDynamicPlaceholders("clipboard={clipboard}"), (error) => {
      assert(error instanceof ClipboardReadError);
      assert.equal(error.message, "MdClip could not read the Clipboard.");
      assert(!error.message.includes("CLIPBOARD_READ_FAILED"));
      return true;
    });
  });
  assert.equal(placeholderReadDiagnostics.length, 1);
  assert.equal(placeholderReadDiagnostics[0][0], "[MdClip] Could not read the Clipboard.");
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

  const validRawUnicodeContent = "replacement=�\ninterior-bom=\uFEFF";
  await writeFile(
    copyFilePath,
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(validRawUnicodeContent, "utf8")]),
  );
  resetRaycastApiStub("error");
  await copyMarkdownFile(markdownFile, { expand: false });
  assert.equal(globalThis.__mdclipClipboardReadCount, 0);
  assert.deepEqual(globalThis.__mdclipClipboardCopies, [validRawUnicodeContent]);
  assert.deepEqual(globalThis.__mdclipHudMessages, ["Copied Raw Content: copy.md"]);

  await writeFile(
    copyFilePath,
    Buffer.concat([Buffer.from("clipboard={clipboard}\n", "utf8"), Buffer.from([0x93, 0xfa, 0x96, 0x7b])]),
  );
  resetRaycastApiStub("text");
  const invalidUtf8Diagnostics = await captureConsoleErrors(async () => {
    await assert.rejects(copyMarkdownFile(markdownFile, { expand: true }), (error) => {
      assert(error instanceof CopyMarkdownFileError);
      assert.equal(error.reason, "invalid-utf8");
      assert.equal(error.message, "MdClip could not copy content.");
      assert(!error.message.includes(copyFilePath));
      return true;
    });
  });
  assert.equal(invalidUtf8Diagnostics.length, 1);
  assert.equal(invalidUtf8Diagnostics[0][0], "[MdClip] Markdown file content is not valid UTF-8.");
  assert.equal(globalThis.__mdclipClipboardReadCount, 0);
  assert.deepEqual(globalThis.__mdclipClipboardCopies, []);
  assert.deepEqual(globalThis.__mdclipHudMessages, []);

  await writeFile(copyFilePath, "clipboard={clipboard}");

  resetRaycastApiStub("error");
  const copyClipboardReadDiagnostics = await captureConsoleErrors(async () => {
    await assert.rejects(copyMarkdownFile(markdownFile, { expand: true }), (error) => {
      assert(error instanceof CopyMarkdownFileError);
      assert.equal(error.reason, "clipboard-read");
      assert.equal(error.message, "MdClip could not copy content.");
      assert(!error.message.includes("CLIPBOARD_READ_FAILED"));
      return true;
    });
  });
  assert.equal(copyClipboardReadDiagnostics.length, 1);
  assert.equal(copyClipboardReadDiagnostics[0][0], "[MdClip] Could not read the Clipboard.");
  assert.deepEqual(globalThis.__mdclipClipboardCopies, []);
  assert.deepEqual(globalThis.__mdclipHudMessages, []);

  resetRaycastApiStub("text");
  const missingMarkdownFile = { name: "missing.md", path: path.join(fixtureRoot, "missing-copy.md") };
  const copyFileReadDiagnostics = await captureConsoleErrors(async () => {
    await assert.rejects(copyMarkdownFile(missingMarkdownFile, { expand: false }), (error) => {
      assert(error instanceof CopyMarkdownFileError);
      assert.equal(error.reason, "file-read");
      assert.equal(error.message, "MdClip could not copy content.");
      assert(!error.message.includes(missingMarkdownFile.path));
      return true;
    });
  });
  assert.equal(copyFileReadDiagnostics.length, 1);
  assert.equal(copyFileReadDiagnostics[0][0], "[MdClip] Could not read a Markdown file for copy.");
  assert.deepEqual(globalThis.__mdclipClipboardCopies, []);
  assert.deepEqual(globalThis.__mdclipHudMessages, []);

  resetRaycastApiStub("text", { clipboardCopyMode: "error" });
  const copyWriteDiagnostics = await captureConsoleErrors(async () => {
    await assert.rejects(copyMarkdownFile(markdownFile, { expand: false }), (error) => {
      assert(error instanceof CopyMarkdownFileError);
      assert.equal(error.reason, "clipboard-write");
      assert.equal(error.message, "MdClip could not copy content.");
      assert(!error.message.includes("CLIPBOARD_COPY_FAILED"));
      return true;
    });
  });
  assert.equal(copyWriteDiagnostics.length, 1);
  assert.equal(copyWriteDiagnostics[0][0], "[MdClip] Could not write Markdown content to the Clipboard.");
  assert.deepEqual(globalThis.__mdclipClipboardCopies, []);
  assert.deepEqual(globalThis.__mdclipHudMessages, []);

  resetRaycastApiStub("text", { hudMode: "error" });
  const copyHudDiagnostics = await captureConsoleErrors(async () => {
    await copyMarkdownFile(markdownFile, { expand: false });
  });
  assert.equal(copyHudDiagnostics.length, 1);
  assert.equal(copyHudDiagnostics[0][0], "[MdClip] Could not show the copy confirmation.");
  assert.deepEqual(globalThis.__mdclipClipboardCopies, ["clipboard={clipboard}"]);
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
globalThis.__mdclipClipboardCopyMode ??= "success";
globalThis.__mdclipClipboardCopies ??= [];
globalThis.__mdclipHudMode ??= "success";
globalThis.__mdclipHudMessages ??= [];
globalThis.__mdclipToastMode ??= "success";
globalThis.__mdclipToasts ??= [];
globalThis.__mdclipCacheConstructorMode ??= "success";
globalThis.__mdclipCacheGetMode ??= "success";
globalThis.__mdclipCacheSetMode ??= "success";
globalThis.__mdclipCacheValues ??= {};

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
    if (globalThis.__mdclipClipboardCopyMode === "error") {
      throw new Error("CLIPBOARD_COPY_FAILED");
    }
    globalThis.__mdclipClipboardCopies.push(content);
  },
};

export const Toast = {
  Style: {
    Failure: "failure",
  },
};

export class Cache {
  constructor() {
    if (globalThis.__mdclipCacheConstructorMode === "error") {
      throw new Error("CACHE_CONSTRUCTOR_FAILED");
    }
  }

  get(key) {
    if (globalThis.__mdclipCacheGetMode === "error") {
      throw new Error("CACHE_GET_FAILED");
    }
    return globalThis.__mdclipCacheValues[key];
  }

  set(key, value) {
    if (globalThis.__mdclipCacheSetMode === "error") {
      throw new Error("CACHE_SET_FAILED");
    }
    globalThis.__mdclipCacheValues[key] = value;
  }
}

export async function showToast(options) {
  if (globalThis.__mdclipToastMode === "error") {
    throw new Error("TOAST_FAILED");
  }
  globalThis.__mdclipToasts.push(options);
  return options;
}

export async function showHUD(message) {
  if (globalThis.__mdclipHudMode === "error") {
    throw new Error("HUD_FAILED");
  }
  globalThis.__mdclipHudMessages.push(message);
}
`,
        loader: "js",
      }));
    },
  };
}

function resetRaycastApiStub(
  readMode,
  {
    clipboardCopyMode = "success",
    hudMode = "success",
    toastMode = "success",
    cacheConstructorMode = "success",
    cacheGetMode = "success",
    cacheSetMode = "success",
  } = {},
) {
  globalThis.__mdclipClipboardReadCount = 0;
  globalThis.__mdclipClipboardReadMode = readMode;
  globalThis.__mdclipClipboardCopyMode = clipboardCopyMode;
  globalThis.__mdclipClipboardCopies = [];
  globalThis.__mdclipHudMode = hudMode;
  globalThis.__mdclipHudMessages = [];
  globalThis.__mdclipToastMode = toastMode;
  globalThis.__mdclipToasts = [];
  globalThis.__mdclipCacheConstructorMode = cacheConstructorMode;
  globalThis.__mdclipCacheGetMode = cacheGetMode;
  globalThis.__mdclipCacheSetMode = cacheSetMode;
  globalThis.__mdclipCacheValues = {};
}

async function captureConsoleErrors(callback) {
  const originalConsoleError = console.error;
  const entries = [];
  console.error = (...args) => entries.push(args);

  try {
    await callback();
  } finally {
    console.error = originalConsoleError;
  }

  return entries;
}

async function readText(relativePath) {
  return await readFile(path.join(repoRoot, relativePath), "utf8");
}

async function assertFileExists(filePath) {
  await access(filePath);
}
