import { ConfigurationRequired } from "./ConfigurationRequired";
import { MarkdownFileList } from "./MarkdownFileList";
import { getConfiguredMarkdownSourceConfigs } from "../services/preferences";

export function AllMarkdownSourcesCommand() {
  const markdownSources = getConfiguredMarkdownSourceConfigs();

  if (markdownSources.length === 0) {
    return (
      <ConfigurationRequired
        title="All Markdown Sources"
        message="Enable at least one Markdown Source and set its folder in Raycast Extension Preferences."
      />
    );
  }

  return (
    <MarkdownFileList
      markdownSources={markdownSources}
      searchBarPlaceholder="Search all Markdown files"
      emptyTitle="No Markdown files found in enabled Markdown Sources"
    />
  );
}
