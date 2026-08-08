import { Action, ActionPanel, Icon, Keyboard, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type {
  ConfiguredMarkdownSource,
  MarkdownFile,
  MarkdownFileLoadResult,
  MarkdownSourceLoadFailure,
} from "../types";
import { CopyMarkdownFileError, copyMarkdownFile } from "../services/clipboard";
import { showFailureToast } from "../services/feedback";
import {
  getMarkdownFileListItemId,
  getMarkdownFileSearchFields,
  listMarkdownFilesFromMarkdownSources,
  normalizeMarkdownSearchText,
} from "../services/markdownFiles";
import { getPreviewOptions, readMarkdownPreview, type MarkdownPreview, type PreviewOptions } from "../services/preview";
import { readPreviewVisibility, savePreviewVisibility } from "../services/previewVisibility";
import { InvalidUtf8Error } from "../services/utf8";

type Props = {
  markdownSources: ConfiguredMarkdownSource[];
  includeMarkdownSourceNameInSearch: boolean;
  searchBarPlaceholder: string;
  emptyTitle: string;
  loadErrorTitle: string;
};

type LoadState = {
  files: MarkdownFile[];
  failures: MarkdownSourceLoadFailure[];
  error?: string;
  isLoading: boolean;
};

type SortMode = "updated-desc" | "updated-asc" | "name-asc" | "path-asc";

const DEFAULT_SORT_MODE: SortMode = "updated-desc";
const PREVIEW_TRUNCATION_NOTICE =
  "Preview truncated at the configured line or character limit. Open the file to view the full content.";
const INVALID_UTF8_MESSAGE = "Open the file in a text editor, save it as UTF-8, and try again.";

export function MarkdownFileList({
  markdownSources,
  includeMarkdownSourceNameInSearch,
  searchBarPlaceholder,
  emptyTitle,
  loadErrorTitle,
}: Props) {
  const [state, setState] = useState<LoadState>({ files: [], failures: [], isLoading: true });
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(readPreviewVisibility);
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const previewOptions = getPreviewOptions(preferences, isPreviewEnabled);

  async function togglePreviewVisibility() {
    const previousIsEnabled = isPreviewEnabled;
    const nextIsEnabled = !isPreviewEnabled;
    setIsPreviewEnabled(nextIsEnabled);

    if (!savePreviewVisibility(nextIsEnabled)) {
      setIsPreviewEnabled(previousIsEnabled);
      await showFailureToast({
        title: "Could not save preview setting",
        message: "The previous setting is still in use. Try again.",
      });
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadFiles() {
      let result: MarkdownFileLoadResult;

      try {
        result = await listMarkdownFilesFromMarkdownSources(markdownSources);
      } catch (error) {
        console.error("[MdClip] Could not load Markdown files.", error);

        if (isMounted) {
          setState({
            files: [],
            failures: [],
            error: "MdClip could not load Markdown files. Open the command again.",
            isLoading: false,
          });
        }

        return;
      }

      if (!isMounted) {
        return;
      }

      const successfulMarkdownSourceCount = markdownSources.length - result.failures.length;
      if (result.failures.length > 0 && successfulMarkdownSourceCount === 0) {
        setState({
          files: [],
          failures: result.failures,
          error: formatMarkdownSourceFailureMessages(result.failures),
          isLoading: false,
        });
        return;
      }

      setState({ files: result.files, failures: result.failures, isLoading: false });

      if (result.failures.length > 0) {
        await showFailureToast({
          title: "Some Markdown Sources could not be loaded",
          message: formatMarkdownSourceFailureNames(result.failures),
        });
      }
    }

    loadFiles();

    return () => {
      isMounted = false;
    };
  }, [markdownSources]);

  const filesByMarkdownSource = useMemo(() => {
    return markdownSources.map((markdownSource) => ({
      markdownSource,
      files: state.files
        .filter((file) => file.markdownSource.id === markdownSource.id)
        .sort((left, right) => compareMarkdownFiles(left, right, sortMode)),
    }));
  }, [markdownSources, sortMode, state.files]);

  const fileCount = filesByMarkdownSource.reduce((count, group) => count + group.files.length, 0);
  const failures = state.failures;

  return (
    <List
      filtering={{ keepSectionOrder: false }}
      isLoading={state.isLoading}
      isShowingDetail={previewOptions.isEnabled}
      onSearchTextChange={(value) => setSearchText(normalizeMarkdownSearchText(value))}
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort"
          defaultValue={DEFAULT_SORT_MODE}
          storeValue
          onChange={(value) => setSortMode(parseSortMode(value))}
        >
          <List.Dropdown.Item title="Updated (Newest First)" value="updated-desc" />
          <List.Dropdown.Item title="Updated (Oldest First)" value="updated-asc" />
          <List.Dropdown.Item title="Name (A-Z)" value="name-asc" />
          <List.Dropdown.Item title="Path (A-Z)" value="path-asc" />
        </List.Dropdown>
      }
    >
      {state.error ? (
        <List.EmptyView
          title={loadErrorTitle}
          description={state.error}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : fileCount === 0 && failures.length === 0 && !state.isLoading ? (
        <List.EmptyView
          title={emptyTitle}
          description={
            markdownSources.length === 1
              ? "Add a .md file to this Markdown Source folder."
              : "Add a .md file to an enabled Markdown Source folder."
          }
          actions={<MarkdownSourceEmptyActions markdownSources={markdownSources} />}
        />
      ) : markdownSources.length > 1 ? (
        <>
          {filesByMarkdownSource
            .filter((group) => group.files.length > 0)
            .map((group) => (
              <List.Section key={group.markdownSource.id} title={group.markdownSource.displayName}>
                {group.files.map((file) => (
                  <MarkdownFileListItem
                    key={getMarkdownFileListItemId(file)}
                    file={file}
                    editor={preferences.editor}
                    includeMarkdownSourceNameInSearch={includeMarkdownSourceNameInSearch}
                    onTogglePreview={togglePreviewVisibility}
                    previewOptions={previewOptions}
                  />
                ))}
              </List.Section>
            ))}
          {failures.length > 0 ? (
            <List.Section title="Could Not Load">
              {failures.map((failure) => (
                <MarkdownSourceFailureListItem key={failure.markdownSource.id} failure={failure} />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : (
        filesByMarkdownSource.flatMap((group) =>
          group.files.map((file) => (
            <MarkdownFileListItem
              key={getMarkdownFileListItemId(file)}
              file={file}
              editor={preferences.editor}
              includeMarkdownSourceNameInSearch={includeMarkdownSourceNameInSearch}
              onTogglePreview={togglePreviewVisibility}
              previewOptions={previewOptions}
            />
          )),
        )
      )}
    </List>
  );
}

function MarkdownSourceEmptyActions({ markdownSources }: { markdownSources: ConfiguredMarkdownSource[] }) {
  const isSingleMarkdownSource = markdownSources.length === 1;

  return (
    <ActionPanel>
      {markdownSources.map((markdownSource) => (
        <Action.Open
          key={markdownSource.id}
          icon={Icon.Folder}
          title={isSingleMarkdownSource ? "Open Markdown Source Folder" : `Open ${markdownSource.displayName} Folder`}
          target={markdownSource.directory}
        />
      ))}
      <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

function MarkdownSourceFailureListItem({ failure }: { failure: MarkdownSourceLoadFailure }) {
  return (
    <List.Item
      id={`markdown-source-load-failure-${failure.markdownSource.id}`}
      icon={Icon.Warning}
      title={normalizeMarkdownSearchText(failure.markdownSource.displayName)}
      subtitle={formatMarkdownSourceFailureSubtitle(failure)}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function MarkdownFileListItem({
  file,
  editor,
  includeMarkdownSourceNameInSearch,
  onTogglePreview,
  previewOptions,
}: {
  file: MarkdownFile;
  editor: ExtensionPreferences["editor"];
  includeMarkdownSourceNameInSearch: boolean;
  onTogglePreview: () => void | Promise<void>;
  previewOptions: PreviewOptions;
}) {
  const isPreviewEnabled = previewOptions.isEnabled;
  const searchFields = getMarkdownFileSearchFields(file, {
    includeMarkdownSourceName: includeMarkdownSourceNameInSearch,
  });

  return (
    <List.Item
      id={getMarkdownFileListItemId(file)}
      title={searchFields.title}
      keywords={searchFields.keywords}
      subtitle={getListItemSubtitle(file)}
      accessories={isPreviewEnabled ? undefined : getListItemAccessories(file)}
      detail={isPreviewEnabled ? <MarkdownFilePreviewDetail file={file} previewOptions={previewOptions} /> : undefined}
      actions={
        <ActionPanel>
          <Action icon={Icon.Clipboard} title="Copy Raw Content" onAction={() => handleCopy(file, false)} />
          <Action icon={Icon.Replace} title="Copy Expanded Content" onAction={() => handleCopy(file, true)} />
          <Action
            icon={isPreviewEnabled ? Icon.EyeDisabled : Icon.Eye}
            title={isPreviewEnabled ? "Hide Preview" : "Show Preview"}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={onTogglePreview}
          />
          {editor ? (
            <Action.Open icon={Icon.Pencil} title="Open in Editor" target={file.path} application={editor} />
          ) : (
            <Action.Open icon={Icon.Document} title="Open" target={file.path} />
          )}
          <Action.OpenWith title="Open with…" path={file.path} />
          <Action.ShowInFinder path={file.path} />
        </ActionPanel>
      }
    />
  );
}

function MarkdownFilePreviewDetail({ file, previewOptions }: { file: MarkdownFile; previewOptions: PreviewOptions }) {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      setMarkdown("");

      try {
        const preview = await readMarkdownPreview(file.path, {
          lineCount: previewOptions.lineCount,
          maxCharacters: previewOptions.maxCharacters,
        });

        if (isMounted) {
          setMarkdown(formatPreviewMarkdown(file, preview));
        }
      } catch (error) {
        const isInvalidUtf8 = error instanceof InvalidUtf8Error;
        console.error(
          isInvalidUtf8
            ? "[MdClip] Markdown file preview content is not valid UTF-8."
            : "[MdClip] Could not load a Markdown file preview.",
          error,
        );

        if (isMounted) {
          const message = isInvalidUtf8
            ? INVALID_UTF8_MESSAGE
            : "MdClip could not read the file for preview. Check the file and its Markdown Source folder, then open the command again.";
          setMarkdown(`# ${file.name}\n\nCould not load preview.\n\n${message}`);
        }
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [file, previewOptions.lineCount, previewOptions.maxCharacters]);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Markdown Source" text={file.markdownSource.displayName} />
          <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(file.size)} />
          <List.Item.Detail.Metadata.Label title="Updated" text={formatDateTime(file.updatedAt)} />
          <List.Item.Detail.Metadata.Label title="Full Path" text={file.path} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

async function handleCopy(file: MarkdownFile, expand: boolean): Promise<void> {
  try {
    await copyMarkdownFile(file, { expand });
  } catch (error) {
    await showFailureToast(getCopyFailureToast(error));
  }
}

function getCopyFailureToast(error: unknown): { title: string; message: string } {
  if (error instanceof CopyMarkdownFileError) {
    switch (error.reason) {
      case "file-read":
        return {
          title: "Could not copy content",
          message:
            "MdClip could not read the file. Check the file and its Markdown Source folder, then open the command again.",
        };
      case "invalid-utf8":
        return {
          title: "Could not copy content",
          message: INVALID_UTF8_MESSAGE,
        };
      case "clipboard-read":
        return {
          title: "Could not copy expanded content",
          message: "MdClip could not read the Clipboard. Try again.",
        };
      case "clipboard-write":
        return {
          title: "Could not copy content",
          message: "MdClip could not write to the Clipboard. Try again.",
        };
      case "copy-failed":
        return {
          title: "Could not copy content",
          message: "MdClip could not complete the copy. Try again.",
        };
    }
  }

  console.error("[MdClip] Could not copy Markdown content.", error);
  return {
    title: "Could not copy content",
    message: "MdClip could not complete the copy. Try again.",
  };
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatListDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function compareMarkdownFiles(left: MarkdownFile, right: MarkdownFile, sortMode: SortMode): number {
  switch (sortMode) {
    case "updated-desc":
      return right.updatedAt.getTime() - left.updatedAt.getTime() || compareByRelativePath(left, right);
    case "updated-asc":
      return left.updatedAt.getTime() - right.updatedAt.getTime() || compareByRelativePath(left, right);
    case "name-asc":
      return left.name.localeCompare(right.name) || compareByRelativePath(left, right);
    case "path-asc":
      return compareByRelativePath(left, right);
  }
}

function compareByRelativePath(left: MarkdownFile, right: MarkdownFile): number {
  return left.relativePath.localeCompare(right.relativePath);
}

function parseSortMode(value: string): SortMode {
  if (value === "name-asc" || value === "path-asc" || value === "updated-desc" || value === "updated-asc") {
    return value;
  }

  return DEFAULT_SORT_MODE;
}

function getListItemAccessories(file: MarkdownFile): List.Item.Accessory[] {
  return [{ text: formatListDateTime(file.updatedAt) }, { text: formatFileSize(file.size) }];
}

function getListItemSubtitle(file: MarkdownFile): string | undefined {
  return getParentDirectory(file.relativePath);
}

function getParentDirectory(relativePath: string): string | undefined {
  const pathParts = relativePath.split("/");
  pathParts.pop();
  const parentDirectory = pathParts.join("/");

  return parentDirectory || undefined;
}

function formatMarkdownSourceFailureNames(failures: MarkdownSourceLoadFailure[]): string {
  return failures.map((failure) => failure.markdownSource.displayName).join(", ");
}

function formatMarkdownSourceFailureMessages(failures: MarkdownSourceLoadFailure[]): string {
  return failures.map(formatMarkdownSourceFailureMessage).join("\n");
}

function formatMarkdownSourceFailureMessage(failure: MarkdownSourceLoadFailure): string {
  const sourceName = failure.markdownSource.displayName;

  switch (failure.reason) {
    case "source-symbolic-link":
      return `${sourceName}: Symbolic links are not supported. Select the original folder.`;
    case "source-unavailable":
      return `${sourceName} folder is no longer available. Restore it or choose another folder in Extension Preferences.`;
    case "source-unreadable":
      return `MdClip cannot read all files in the ${sourceName} folder. Check the folder's permissions or choose another folder in Extension Preferences.`;
    case "source-read-failed":
      return `MdClip could not read all files in the ${sourceName} folder. Check the folder and open the command again.`;
  }
}

function formatMarkdownSourceFailureSubtitle(failure: MarkdownSourceLoadFailure): string {
  switch (failure.reason) {
    case "source-symbolic-link":
      return "Symbolic links are not supported.";
    case "source-unavailable":
      return "Folder is no longer available.";
    case "source-unreadable":
    case "source-read-failed":
      return "Some files could not be read.";
  }
}

function formatPreviewMarkdown(file: MarkdownFile, preview: MarkdownPreview): string {
  const previewContent = preview.content.trimEnd() || "(Empty file)";
  const indentedPreview = previewContent
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  const sections = [`# ${file.name}`, "", indentedPreview];

  if (preview.isTruncated) {
    sections.push("", `> ${PREVIEW_TRUNCATION_NOTICE}`);
  }

  return sections.join("\n");
}
