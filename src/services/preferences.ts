import { getPreferenceValues } from "@raycast/api";
import path from "path";
import type { ConfiguredMarkdownSource, MarkdownSourceConfig, MarkdownSourceId } from "../types";

const MARKDOWN_SOURCE_COMMAND_TITLES: Record<MarkdownSourceId, string> = {
  1: "Markdown Source 1",
  2: "Markdown Source 2",
  3: "Markdown Source 3",
};

export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getMarkdownSourceConfig(markdownSourceId: MarkdownSourceId): MarkdownSourceConfig {
  const preferences = getPreferences();
  const directory = getDirectoryPreference(preferences, markdownSourceId);
  const isEnabled = getEnabledPreference(preferences, markdownSourceId);
  const displayName =
    getDisplayNamePreference(preferences, markdownSourceId) ||
    getDirectoryName(directory) ||
    MARKDOWN_SOURCE_COMMAND_TITLES[markdownSourceId];

  return {
    id: markdownSourceId,
    commandTitle: MARKDOWN_SOURCE_COMMAND_TITLES[markdownSourceId],
    displayName,
    isEnabled,
    directory,
  };
}

export function getConfiguredMarkdownSourceConfig(
  markdownSourceId: MarkdownSourceId,
): ConfiguredMarkdownSource | undefined {
  const config = getMarkdownSourceConfig(markdownSourceId);
  if (!config.isEnabled || !config.directory) {
    return undefined;
  }

  return {
    ...config,
    directory: config.directory,
  };
}

export function getConfiguredMarkdownSourceConfigs(): ConfiguredMarkdownSource[] {
  return ([1, 2, 3] as const)
    .map((markdownSourceId) => getConfiguredMarkdownSourceConfig(markdownSourceId))
    .filter((config): config is ConfiguredMarkdownSource => Boolean(config));
}

function getEnabledPreference(preferences: ExtensionPreferences, markdownSourceId: MarkdownSourceId): boolean {
  switch (markdownSourceId) {
    case 1:
      return preferences.folder1Enabled !== false;
    case 2:
      return preferences.folder2Enabled !== false;
    case 3:
      return preferences.folder3Enabled !== false;
  }
}

function getDirectoryPreference(
  preferences: ExtensionPreferences,
  markdownSourceId: MarkdownSourceId,
): string | undefined {
  switch (markdownSourceId) {
    case 1:
      return preferences.folder1Directory;
    case 2:
      return preferences.folder2Directory;
    case 3:
      return preferences.folder3Directory;
  }
}

function getDisplayNamePreference(
  preferences: ExtensionPreferences,
  markdownSourceId: MarkdownSourceId,
): string | undefined {
  switch (markdownSourceId) {
    case 1:
      return preferences.folder1DisplayName?.trim();
    case 2:
      return preferences.folder2DisplayName?.trim();
    case 3:
      return preferences.folder3DisplayName?.trim();
  }
}

function getDirectoryName(directory: string | undefined): string | undefined {
  if (!directory) {
    return undefined;
  }

  return path.basename(directory);
}
