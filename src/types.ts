export type MarkdownSourceId = 1 | 2 | 3;

export type MarkdownSourceConfig = {
  id: MarkdownSourceId;
  commandTitle: string;
  displayName: string;
  isEnabled: boolean;
  directory?: string;
};

export type ConfiguredMarkdownSource = MarkdownSourceConfig & {
  directory: string;
};

export type MarkdownFile = {
  path: string;
  name: string;
  relativePath: string;
  markdownSource: ConfiguredMarkdownSource;
  updatedAt: Date;
  size: number;
};

export type MarkdownSourceLoadFailureReason = "source-unavailable" | "source-unreadable" | "source-read-failed";

export type MarkdownSourceLoadFailure = {
  markdownSource: ConfiguredMarkdownSource;
  reason: MarkdownSourceLoadFailureReason;
};

export type MarkdownFileLoadResult = {
  files: MarkdownFile[];
  failures: MarkdownSourceLoadFailure[];
};
