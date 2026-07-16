import fs from "fs/promises";

const READ_CHUNK_SIZE = 4096;

export type PreviewOptions = {
  lineCount: number;
  maxCharacters: number;
};

export type MarkdownPreview = {
  content: string;
  isTruncated: boolean;
};

export async function readMarkdownPreview(filePath: string, options: PreviewOptions): Promise<MarkdownPreview> {
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
