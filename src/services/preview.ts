import fs from "fs/promises";

const READ_CHUNK_SIZE = 4096;
const DEFAULT_PREVIEW_LINE_COUNT = 10;
const DEFAULT_PREVIEW_MAX_CHARACTERS = 4000;
const MAX_PREVIEW_LINE_COUNT = 100;
const MAX_PREVIEW_CHARACTERS = 20000;
const ASCII_DIGITS_PATTERN = /^[0-9]+$/;

export type PreviewOptions = {
  isEnabled: boolean;
  lineCount: number;
  maxCharacters: number;
};

type PreviewLimits = Pick<PreviewOptions, "lineCount" | "maxCharacters">;

type PreviewPreferenceValues = {
  previewLineCount?: string;
  previewMaxCharacters?: string;
};

export type MarkdownPreview = {
  content: string;
  isTruncated: boolean;
};

export function getPreviewOptions(preferences: PreviewPreferenceValues, isEnabled: boolean): PreviewOptions {
  return {
    isEnabled,
    lineCount: parsePreviewLimit(preferences.previewLineCount, DEFAULT_PREVIEW_LINE_COUNT, MAX_PREVIEW_LINE_COUNT),
    maxCharacters: parsePreviewLimit(
      preferences.previewMaxCharacters,
      DEFAULT_PREVIEW_MAX_CHARACTERS,
      MAX_PREVIEW_CHARACTERS,
    ),
  };
}

export async function readMarkdownPreview(filePath: string, options: PreviewLimits): Promise<MarkdownPreview> {
  const safeLineCount = Math.max(1, options.lineCount);
  const safeMaxCharacters = Math.max(1, options.maxCharacters);
  const file = await fs.open(filePath, "r");
  const decoder = new TextDecoder("utf-8");
  const buffer = Buffer.alloc(READ_CHUNK_SIZE);
  let content = "";

  try {
    while (!hasPreviewOverflow(content, safeLineCount, safeMaxCharacters) || content.endsWith("\r")) {
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);

      if (bytesRead === 0) {
        content += decoder.decode();
        break;
      }

      content += decoder.decode(buffer.subarray(0, bytesRead), { stream: true });
    }
  } finally {
    await file.close();
  }

  const normalizedContent = normalizeLineEndings(content);
  const previewContent = trimPreview(normalizedContent, safeLineCount, safeMaxCharacters);

  return {
    content: previewContent,
    isTruncated: previewContent.length < normalizedContent.length,
  };
}

function parsePreviewLimit(value: string | undefined, defaultValue: number, maxValue: number): number {
  const normalizedValue = value?.trim() ?? "";

  if (!ASCII_DIGITS_PATTERN.test(normalizedValue)) {
    return defaultValue;
  }

  const parsedValue = Number(normalizedValue);
  if (parsedValue === 0) {
    return defaultValue;
  }

  return Math.min(parsedValue, maxValue);
}

function hasPreviewOverflow(content: string, lineCount: number, maxCharacters: number): boolean {
  const normalizedContent = normalizeLineEndings(content);
  const lineTrimmedContent = trimPreviewLines(normalizedContent, lineCount);

  return lineTrimmedContent.length > maxCharacters || lineTrimmedContent.length < normalizedContent.length;
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimPreview(content: string, lineCount: number, maxCharacters: number): string {
  return trimPreviewLines(content, lineCount).slice(0, maxCharacters);
}

function trimPreviewLines(content: string, lineCount: number): string {
  const lines = content.split("\n");
  return lines.slice(0, lineCount).join("\n");
}
