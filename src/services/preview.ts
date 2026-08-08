import fs from "fs/promises";
import { createStrictUtf8Decoder, decodeUtf8Chunk } from "./utf8";

const READ_CHUNK_SIZE = 4096;
const DEFAULT_PREVIEW_LINE_COUNT = 10;
const DEFAULT_PREVIEW_MAX_CHARACTERS = 4000;
const MAX_PREVIEW_LINE_COUNT = 100;
const MAX_PREVIEW_CHARACTERS = 20000;
const ASCII_DIGITS_PATTERN = /^[0-9]+$/;
const GRAPHEME_SEGMENTER = new Intl.Segmenter("und", { granularity: "grapheme" });

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
  const decoder = createStrictUtf8Decoder();
  const buffer = Buffer.alloc(READ_CHUNK_SIZE);
  let content = "";

  try {
    while (true) {
      const overflow = getPreviewOverflow(content, safeLineCount, safeMaxCharacters);
      if (overflow.characterLimit || (overflow.lineLimit && !content.endsWith("\r"))) {
        break;
      }

      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);

      if (bytesRead === 0) {
        content += decodeUtf8Chunk(decoder);
        break;
      }

      content += decodeUtf8Chunk(decoder, buffer.subarray(0, bytesRead), { stream: true });
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

function getPreviewOverflow(
  content: string,
  lineCount: number,
  maxCharacters: number,
): { characterLimit: boolean; lineLimit: boolean } {
  const normalizedContent = normalizeLineEndings(content);
  const lineTrimmedContent = trimPreviewLines(normalizedContent, lineCount);

  return {
    characterLimit: countUnicodeCodePoints(lineTrimmedContent) > maxCharacters,
    lineLimit: lineTrimmedContent.length < normalizedContent.length,
  };
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimPreview(content: string, lineCount: number, maxCharacters: number): string {
  const lineTrimmedContent = trimPreviewLines(content, lineCount);

  if (countUnicodeCodePoints(lineTrimmedContent) <= maxCharacters) {
    return lineTrimmedContent;
  }

  let codePointCount = 0;
  let endIndex = 0;

  for (const { index, segment } of GRAPHEME_SEGMENTER.segment(lineTrimmedContent)) {
    const nextCodePointCount = codePointCount + countUnicodeCodePoints(segment);
    if (nextCodePointCount > maxCharacters) {
      break;
    }

    codePointCount = nextCodePointCount;
    endIndex = index + segment.length;
  }

  return lineTrimmedContent.slice(0, endIndex);
}

function trimPreviewLines(content: string, lineCount: number): string {
  const lines = content.split("\n");
  return lines.slice(0, lineCount).join("\n");
}

function countUnicodeCodePoints(content: string): number {
  let count = 0;
  const codePoints = content[Symbol.iterator]();

  while (!codePoints.next().done) {
    count += 1;
  }

  return count;
}
