import { Clipboard, showHUD } from "@raycast/api";
import fs from "fs/promises";
import type { MarkdownFile } from "../types";
import { expandDynamicPlaceholders } from "./dynamicPlaceholders";

export async function copyMarkdownFile(file: MarkdownFile, options: { expand: boolean }): Promise<void> {
  const rawContent = await fs.readFile(file.path, "utf8");
  const content = options.expand ? await expandDynamicPlaceholders(rawContent) : rawContent;
  const copyMode = options.expand ? "Expanded" : "Raw";

  await Clipboard.copy(content);
  await showHUD(`Copied ${copyMode} Content: ${file.name}`);
}
