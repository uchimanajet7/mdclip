import { Clipboard } from "@raycast/api";
import fs from "fs/promises";
import type { MarkdownFile } from "../types";
import { ClipboardReadError, expandDynamicPlaceholders } from "./dynamicPlaceholders";
import { showCopySuccessHUD } from "./feedback";
import { decodeUtf8, InvalidUtf8Error } from "./utf8";

export type CopyMarkdownFileFailureReason =
  "file-read" | "invalid-utf8" | "clipboard-read" | "clipboard-write" | "copy-failed";

export class CopyMarkdownFileError extends Error {
  constructor(readonly reason: CopyMarkdownFileFailureReason) {
    super("MdClip could not copy content.");
    this.name = "CopyMarkdownFileError";
  }
}

export async function copyMarkdownFile(file: MarkdownFile, options: { expand: boolean }): Promise<void> {
  let fileBytes: Buffer;

  try {
    fileBytes = await fs.readFile(file.path);
  } catch (error) {
    console.error("[MdClip] Could not read a Markdown file for copy.", error);
    throw new CopyMarkdownFileError("file-read");
  }

  let rawContent: string;

  try {
    rawContent = decodeUtf8(fileBytes);
  } catch (error) {
    if (error instanceof InvalidUtf8Error) {
      console.error("[MdClip] Markdown file content is not valid UTF-8.", error);
      throw new CopyMarkdownFileError("invalid-utf8");
    }

    console.error("[MdClip] Could not decode Markdown content for copy.", error);
    throw new CopyMarkdownFileError("copy-failed");
  }

  let content: string;

  try {
    content = options.expand ? await expandDynamicPlaceholders(rawContent) : rawContent;
  } catch (error) {
    if (error instanceof ClipboardReadError) {
      throw new CopyMarkdownFileError("clipboard-read");
    }

    console.error("[MdClip] Could not prepare Markdown content for copy.", error);
    throw new CopyMarkdownFileError("copy-failed");
  }

  const copyMode = options.expand ? "Expanded" : "Raw";

  try {
    await Clipboard.copy(content);
  } catch (error) {
    console.error("[MdClip] Could not write Markdown content to the Clipboard.", error);
    throw new CopyMarkdownFileError("clipboard-write");
  }

  await showCopySuccessHUD(`Copied ${copyMode} Content: ${file.name}`);
}
