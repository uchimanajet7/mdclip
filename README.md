# MdClip

English | [日本語](README.ja.md)

MdClip is a personal/local Raycast extension for finding local Markdown files and copying their contents from Raycast.

Use MdClip when you keep reusable text in Markdown files and want to search, preview, and copy those files from Raycast without changing the originals. Start with the Get Started section below to run the extension locally.

![MdClip showing a Markdown Source preview in Raycast](media/mdclip-1.png)

## What It Does

MdClip treats your Markdown files as the source of truth.

- You keep reusable text in normal `.md` files.
- You group those files into up to three Markdown Sources.
- You open a Markdown Source command in Raycast, find a file by its name or relative path, preview it, and copy its contents.
- You can copy the raw file contents or copy an expanded version where supported placeholders are replaced at copy time.

MdClip does not create, edit, move, rename, or delete your Markdown files.

## Get Started

For normal use, download `Source code (zip)` from the [latest GitHub Release](https://github.com/uchimanajet7/mdclip/releases/latest). The downloaded source archive is tied to the latest release tag.

```bash
npm ci
npm run dev
```

Use the Node.js version shown in `.node-version`; it includes a compatible npm version. MdClip does not install or replace npm globally. See [Getting Started](docs/getting-started.md) for the complete setup, update, and removal steps.

After `npm run dev` starts, open Raycast and configure at least one Markdown Source folder in the extension preferences.

## Commands

| Command              | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| Markdown Source 1    | Find Markdown files by file name or relative path in Markdown Source 1             |
| Markdown Source 2    | Find Markdown files by file name or relative path in Markdown Source 2             |
| Markdown Source 3    | Find Markdown files by file name or relative path in Markdown Source 3             |
| All Markdown Sources | Find files by file name, relative path, or Markdown Source name across all sources |

Use individual Markdown Source commands when you know which folder contains the file. Use All Markdown Sources when you want to search every enabled source at once.

Search matches file names and paths relative to their Markdown Source folders. `All Markdown Sources` also matches Markdown Source names. MdClip does not search inside Markdown file contents.

Raycast Root Search learns from your usage, so command order can change. If the order feels wrong, select the command, open the Action Panel with `⌘ K`, and run `Reset Ranking`. See the [Raycast Search Bar manual](https://manual.raycast.com/search-bar).

## Preferences

Configure a folder for every Markdown Source you use. MdClip needs at least one configured Markdown Source; unused sources do not need a folder.

```text
MdClip Preferences
├── Markdown Source 1
│   ├── Enable Markdown Source 1
│   ├── Markdown Source 1 Folder
│   └── Markdown Source 1 Name
├── Markdown Source 2
│   ├── Enable Markdown Source 2
│   ├── Markdown Source 2 Folder
│   └── Markdown Source 2 Name
├── Markdown Source 3
│   ├── Enable Markdown Source 3
│   ├── Markdown Source 3 Folder
│   └── Markdown Source 3 Name
└── Shared Preferences
    ├── Editor
    ├── Preview Line Count
    └── Preview Max Characters
```

| Preference             | When needed                      | Description                                                                                                                                                  |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Enable Markdown Source | Optional control                 | Allows a configured source to load files in its command and All Markdown Sources. Turn it off when you do not want to use that source                        |
| Markdown Source Folder | Required for each source you use | Folder containing Markdown files for that source                                                                                                             |
| Markdown Source Name   | Optional                         | Source display name used inside MdClip lists, sections, and metadata. It does not rename the Raycast Root Search command. The folder name is used when empty |
| Editor                 | Optional                         | App used by Open in Editor                                                                                                                                   |
| Preview Line Count     | Optional                         | Number of leading lines shown in the preview. Default is `10`, maximum is `100`. Values that cannot be read as a positive integer use the default            |
| Preview Max Characters | Optional                         | Maximum number of characters shown in the preview. Default is `4000`, maximum is `20000`. Values that cannot be read as a positive integer use the default   |

## Actions

| Action                | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| Copy Raw Content      | Copies the full Markdown file content without changes                             |
| Copy Expanded Content | Replaces supported placeholders in the full Markdown file content, then copies it |
| Show/Hide Preview     | Toggles the preview pane                                                          |
| Open in Editor        | Opens the selected file in the configured editor                                  |
| Open                  | Opens the selected file in the default app when no editor is configured           |
| Open with...          | Opens the selected file with another compatible app                               |
| Show in Finder        | Shows the selected file in Finder                                                 |

`Copy Raw Content` is the default action.

## Dynamic Placeholders

MdClip uses the same `{placeholder}` syntax style as Raycast Dynamic Placeholders. `Copy Expanded Content` expands only the MdClip-supported placeholders listed below. The original Markdown file is not modified.

| Placeholder   | Replacement                                                |
| ------------- | ---------------------------------------------------------- |
| `{date}`      | Current date based on your environment locale              |
| `{time}`      | Current time based on your environment locale              |
| `{datetime}`  | Current date and time based on your environment locale     |
| `{day}`       | Day of the week based on your environment locale           |
| `{timezone}`  | Current time zone in a form such as `Asia/Tokyo UTC+09:00` |
| `{now}`       | Current date and time plus time zone                       |
| `{uuid}`      | Random UUID generated separately for each occurrence       |
| `{clipboard}` | Current clipboard text                                     |

Related replacement model: [Raycast Dynamic Placeholders](https://manual.raycast.com/dynamic-placeholders)

MdClip's placeholder expansion is designed to match the Raycast Dynamic Placeholders replacement model for the supported placeholders listed above.

## Markdown File Handling

MdClip recursively reads files with a `.md` extension, matched case-insensitively.

The following paths are excluded:

- `.git`
- `node_modules`
- hidden directories
- files whose extension is not `.md`

Symbolic links are not followed.

## Data Handling

MdClip reads Markdown files only from folders you configure as enabled Markdown Sources.

Markdown contents are sent to the clipboard only when you run a copy action. The current clipboard text is read only when `Copy Expanded Content` processes a Markdown file containing `{clipboard}`.

MdClip does not make network requests during normal extension use.

## Help

For setup, update, and removal instructions, see [Getting Started](docs/getting-started.md). Report unresolved MdClip problems through [GitHub Issues](https://github.com/uchimanajet7/mdclip/issues).

Include the reproduction steps, the actual and expected results, and the MdClip, Raycast, and macOS versions. Do not include private Markdown content, clipboard content, or other sensitive data.

## Development And Maintenance

- [Development and maintenance verification](docs/local-verification.md)
- [Maintainer release management](docs/release-management.md)
