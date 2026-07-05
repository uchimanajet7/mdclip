import fs from "fs/promises";
import path from "path";
import type {
  ConfiguredMarkdownSource,
  MarkdownFile,
  MarkdownFileLoadResult,
  MarkdownSourceLoadFailure,
} from "../types";

const EXCLUDED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);

export async function listMarkdownFiles(markdownSource: ConfiguredMarkdownSource): Promise<MarkdownFile[]> {
  const rootPath = path.resolve(markdownSource.directory);
  const rootStat = await fs.stat(rootPath);

  if (!rootStat.isDirectory()) {
    throw new Error(`${markdownSource.displayName} is not a directory: ${rootPath}`);
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
      message: getErrorMessage(result.reason),
    });
  });

  return { files, failures };
}

async function walkDirectory(
  rootPath: string,
  currentPath: string,
  markdownSource: ConfiguredMarkdownSource,
): Promise<MarkdownFile[]> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
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

    const stat = await fs.stat(entryPath);

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
