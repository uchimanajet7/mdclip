import type { MarkdownSourceId } from "../types";
import { ConfigurationRequired } from "./ConfigurationRequired";
import { MarkdownFileList } from "./MarkdownFileList";
import { getConfiguredMarkdownSourceConfig, getMarkdownSourceConfig } from "../services/preferences";

type Props = {
  markdownSourceId: MarkdownSourceId;
};

export function MarkdownSourceCommand({ markdownSourceId }: Props) {
  const configuredMarkdownSource = getConfiguredMarkdownSourceConfig(markdownSourceId);
  const markdownSource = configuredMarkdownSource ?? getMarkdownSourceConfig(markdownSourceId);

  if (!markdownSource.isEnabled) {
    return (
      <ConfigurationRequired
        title={markdownSource.commandTitle}
        message={`Enable Markdown Source ${markdownSourceId} in Raycast Extension Preferences.`}
      />
    );
  }

  if (!configuredMarkdownSource) {
    return (
      <ConfigurationRequired
        title={markdownSource.commandTitle}
        message={`Set Markdown Source ${markdownSourceId} Folder in Raycast Extension Preferences.`}
      />
    );
  }

  return (
    <MarkdownFileList
      markdownSources={[configuredMarkdownSource]}
      searchBarPlaceholder={`Search ${configuredMarkdownSource.displayName}`}
      emptyTitle={`No Markdown files found in ${configuredMarkdownSource.displayName}`}
    />
  );
}
