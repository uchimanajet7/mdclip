import fs from "fs/promises";
import path from "path";
import type {
  ConfiguredMarkdownSource,
  MarkdownFile,
  MarkdownFileLoadResult,
  MarkdownSourceLoadFailure,
  MarkdownSourceLoadFailureReason,
} from "../types";

const EXCLUDED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);
type MarkdownSourceLoadTarget = "source-root" | "source-contents";
type MarkdownFileSearchOptions = {
  includeMarkdownSourceName: boolean;
};

class MarkdownSourceLoadError extends Error {
  constructor(readonly reason: MarkdownSourceLoadFailureReason) {
    super(reason);
    this.name = "MarkdownSourceLoadError";
  }
}

export function normalizeMarkdownSearchText(value: string): string {
  return value.normalize("NFC");
}

export function getMarkdownFileSearchFields(
  file: MarkdownFile,
  { includeMarkdownSourceName }: MarkdownFileSearchOptions,
): { title: string; keywords: string[] } {
  const parentDirectory = path.dirname(file.relativePath);
  const parentDirectorySegments =
    parentDirectory === "." ? [] : parentDirectory.split(path.sep).filter((segment) => segment.length > 0);
  const keywordCandidates = [
    file.relativePath,
    ...parentDirectorySegments,
    ...(includeMarkdownSourceName ? [file.markdownSource.displayName] : []),
  ];

  return {
    title: normalizeMarkdownSearchText(file.name),
    keywords: Array.from(new Set(keywordCandidates.map(normalizeMarkdownSearchText))),
  };
}

export async function listMarkdownFiles(markdownSource: ConfiguredMarkdownSource): Promise<MarkdownFile[]> {
  const rootPath = path.resolve(markdownSource.directory);
  let rootStat;

  try {
    rootStat = await fs.lstat(rootPath);
  } catch (error) {
    throw toMarkdownSourceLoadError(error, "source-root");
  }

  if (rootStat.isSymbolicLink()) {
    throw new MarkdownSourceLoadError("source-symbolic-link");
  }

  if (!rootStat.isDirectory()) {
    throw new MarkdownSourceLoadError("source-unavailable");
  }

  const files = await walkDirectory(rootPath, rootPath, markdownSource);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export async function listMarkdownFilesFromMarkdownSources(
  markdownSources: ConfiguredMarkdownSource[],
): Promise<MarkdownFileLoadResult> {
  const results = await Promise.allSettled(markdownSources.map((markdownSource) => listMarkdownFiles(markdownSource)));
  const files: MarkdownFile[] = [];
  const failures: MarkdownSourceLoadFailure[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      files.push(...result.value);
      return;
    }

    failures.push({
      markdownSource: markdownSources[index],
      reason: getMarkdownSourceLoadFailureReason(result.reason),
    });
  });

  return { files, failures };
}

async function walkDirectory(
  rootPath: string,
  currentPath: string,
  markdownSource: ConfiguredMarkdownSource,
): Promise<MarkdownFile[]> {
  let entries;

  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch (error) {
    throw toMarkdownSourceLoadError(error, currentPath === rootPath ? "source-root" : "source-contents");
  }

  const files: MarkdownFile[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      files.push(...(await walkDirectory(rootPath, entryPath, markdownSource)));
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    let stat;

    try {
      stat = await fs.stat(entryPath);
    } catch (error) {
      throw toMarkdownSourceLoadError(error, "source-contents");
    }

    files.push({
      path: entryPath,
      name: entry.name,
      relativePath: path.relative(rootPath, entryPath),
      markdownSource,
      updatedAt: stat.mtime,
      size: stat.size,
    });
  }

  return files;
}

function shouldSkipDirectory(directoryName: string): boolean {
  return directoryName.startsWith(".") || EXCLUDED_DIRECTORY_NAMES.has(directoryName);
}

export function classifyMarkdownSourceLoadFailure(
  error: unknown,
  target: MarkdownSourceLoadTarget,
): MarkdownSourceLoadFailureReason {
  const code = getFileSystemErrorCode(error);

  if (code === "EACCES" || code === "EPERM") {
    return "source-unreadable";
  }

  if (target === "source-root" && (code === "ENOENT" || code === "ENOTDIR")) {
    return "source-unavailable";
  }

  return "source-read-failed";
}

function toMarkdownSourceLoadError(error: unknown, target: MarkdownSourceLoadTarget): MarkdownSourceLoadError {
  if (error instanceof MarkdownSourceLoadError) {
    return error;
  }

  return new MarkdownSourceLoadError(classifyMarkdownSourceLoadFailure(error, target));
}

function getMarkdownSourceLoadFailureReason(error: unknown): MarkdownSourceLoadFailureReason {
  if (error instanceof MarkdownSourceLoadError) {
    return error.reason;
  }

  return "source-read-failed";
}

function getFileSystemErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}
