# MdClip Screenshot and UI Evidence Procedure

## 1. Purpose

This document is the canonical procedure for creating and verifying current MdClip screenshots and UI evidence.

Use it when:

- refreshing `metadata/mdclip-*.png`
- syncing `media/mdclip-1.png`
- confirming that screenshots represent the current MdClip UI
- preparing the shared screenshot files for README, GitHub, GitHub Release, or Raycast Store review

For product setup outside screenshot work, see [Getting Started](getting-started.md).

Before using accepted screenshots for Raycast Store publication, also complete the [Store-specific screenshot checklist](../raycast-publish/screenshots.md).

## 2. Source of truth and responsibility

Use these sources in this order:

1. Current user-decided MdClip product direction and [Specification](specification.md).
2. This common screenshot and UI evidence procedure.
3. Current MdClip implementation as evidence of the actual UI state to capture.
4. [Local Verification](local-verification.md).
5. [Getting Started](getting-started.md).
6. [Release Management](release-management.md).
7. Current Raycast and GitHub documentation.

This document owns the common preparation, capture, file, synchronization, and verification steps. `raycast-publish/screenshots.md` contains only the additional Store-publication checks and must not duplicate this procedure.

Current implementation cannot override a decided product requirement or create a new acceptance criterion. If implementation, specification, and the approved direction disagree, stop screenshot work and resolve that inconsistency before capture.

Official references:

- Raycast Window Capture and Store screenshot guidance:
  https://developers.raycast.com/basics/prepare-an-extension-for-store
- Raycast local extension development:
  https://manual.raycast.com/extensions
- GitHub relative links and image paths:
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes

## 3. Managed files and roles

| Path                             | Role                                                    |
| -------------------------------- | ------------------------------------------------------- |
| `docs/screenshot-media.md`       | Canonical common screenshot and UI evidence procedure   |
| `raycast-publish/screenshots.md` | Store-specific checks applied after this procedure      |
| `docs/assets/autumnal-peach.png` | Reusable Raycast Window Capture background              |
| `metadata/mdclip-1.png`          | Current MdClip screenshot 1                             |
| `metadata/mdclip-2.png`          | Current MdClip screenshot 2                             |
| `metadata/mdclip-3.png`          | Current MdClip screenshot 3                             |
| `media/mdclip-1.png`             | README/GitHub media copied from `metadata/mdclip-1.png` |

`assets/` is for runtime extension assets such as icons. It is not the screenshot evidence folder.

Historical `local-copy-blocks` screenshot and media paths are not part of the current MdClip media set.

## 4. Capture preparation

### 4.1 Demo data

Create the current public-safe MdClip demo data:

```sh
npm run demo:setup
```

Expected generated folders:

```text
demo/markdown-sources/markdown-source-1
demo/markdown-sources/markdown-source-2
demo/markdown-sources/markdown-source-3
```

Before capture, confirm that the demo files contain no:

- personal information
- credentials
- API keys
- internal or customer data
- unpublished project names
- real work documents

### 4.2 Raycast preferences

Open MdClip extension preferences in Raycast and configure:

| Preference               | Value or rule                                                      |
| ------------------------ | ------------------------------------------------------------------ |
| Enable Markdown Source 1 | On                                                                 |
| Markdown Source 1 Folder | `demo/markdown-sources/markdown-source-1`                          |
| Markdown Source 1 Name   | Optional non-sensitive name, or leave empty to use the folder name |
| Enable Markdown Source 2 | On                                                                 |
| Markdown Source 2 Folder | `demo/markdown-sources/markdown-source-2`                          |
| Markdown Source 2 Name   | Optional non-sensitive name, or leave empty to use the folder name |
| Enable Markdown Source 3 | On                                                                 |
| Markdown Source 3 Folder | `demo/markdown-sources/markdown-source-3`                          |
| Markdown Source 3 Name   | Optional non-sensitive name, or leave empty to use the folder name |
| Preview Line Count       | `10`                                                               |
| Preview Max Characters   | `4000`                                                             |

Source display names are capture data, not fixed screenshot acceptance values. A configured name and the folder-derived fallback are both valid when the UI consistently presents the effective source name and exposes no sensitive information.

Leave `Editor` unset unless a capture specifically needs `Open in Editor`.

### 4.3 Raycast development mode

Start the extension from the repository root:

```sh
npm run dev
```

Wait until the extension is built and Raycast can open the MdClip commands.

### 4.4 Window Capture settings

In Raycast Settings:

1. Open `Advanced`.
2. Configure the `Window Capture` `Record Hotkey`.
3. Confirm the configured hotkey before capture.
   - Raycast's documented example is `Command + Shift + Option + M`.
   - The hotkey is user-configurable; do not assume that the example is already configured.
   - If the field is empty, use a non-conflicting hotkey.
   - With an MdClip command open in development mode, press the hotkey once and confirm that Window Capture opens.
   - Cancel this test capture instead of saving it.
4. Set `Custom Wallpaper` to `docs/assets/autumnal-peach.png`.
5. Use the same background and theme for all three screenshots.

## 5. Capture targets

Create or refresh exactly these three current MdClip screenshots:

| File                    | Command or source role                 | Required state                                                                                              | Purpose                                                      |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `metadata/mdclip-1.png` | First enabled Markdown Source command  | `blog-outline.md` selected, preview pane visible, metadata table visible, primary action `Copy Raw Content` | Show browsing and previewing a Markdown file from one source |
| `metadata/mdclip-2.png` | Second enabled Markdown Source command | `all-placeholders.md` selected, Action Panel open, `Copy Expanded Content` selected                         | Show placeholder expansion as an explicit action             |
| `metadata/mdclip-3.png` | `All Markdown Sources`                 | Multiple source sections visible, a Markdown file selected, preview pane visible                            | Show cross-source search                                     |

Required stable MdClip wording includes:

- `All Markdown Sources`
- `Markdown Source`
- `Size`
- `Updated`
- `Full Path`
- `Copy Raw Content`
- `Copy Expanded Content`

Configured or folder-derived source display names may vary. They must identify the effective source consistently; they are not required to equal `Markdown Source 1`, `Markdown Source 2`, or `Markdown Source 3`.

When preview metadata is visible, it must show `Markdown Source`, `Size`, `Updated`, and `Full Path` in that order without a separator. `Relative Path` must not appear in the metadata; the list continues to show the file name and relative parent path.

The screenshots must not show old active wording such as `Block Set`, `All Block Sets`, `local-copy-blocks`, or `Local Copy Blocks`.

## 6. Capture steps

The human capture owner performs these steps in the Raycast app. Do not substitute generated images, conversion, inferred automation, manual cropping, resizing, compositing, or retouching for Raycast Window Capture.

For each target:

1. Open the target MdClip command or source role in Raycast.
2. Select the target Markdown file or action state.
3. Press the configured Window Capture hotkey.
4. Select `Save to Metadata`.
5. Save the capture under `metadata/` using the target filename.
6. Confirm that the screenshot shows only Raycast and the MdClip UI.
7. Confirm that no sensitive information is visible.

## 7. README media synchronization

After `metadata/mdclip-1.png` passes the verification in this document, synchronize the README/GitHub media image:

```sh
npm run sync:readme-media
```

The script copies:

```text
metadata/mdclip-1.png -> media/mdclip-1.png
```

README insertion is outside this synchronization procedure.

## 8. Verification

Verify file dimensions:

```sh
sips -g pixelWidth -g pixelHeight metadata/mdclip-*.png media/mdclip-1.png
```

Expected current Raycast Window Capture dimensions:

```text
2000 x 1250
```

Confirm all of the following:

- exactly the three intended metadata screenshots exist
- every file is PNG
- `metadata/mdclip-1.png` and `media/mdclip-1.png` are identical after synchronization
- the three required use cases are represented
- text is readable
- no sensitive information is visible
- no old product identity is presented as current
- background and theme are consistent
- list and preview panes are visible where required
- preview metadata uses the current four-row separator-free layout
- the Action Panel screenshot shows the intended action and consistent icons
- the effective source display names are presented consistently, without requiring fixed example names
- `git status --short` shows only the intended changes

Complete the manual visual checks before replacing, archiving, publishing, or deleting any current screenshot or README media file.

## 9. Store-publication boundary

Current screenshot creation and verification end with this procedure.

Raycast Store publication is a separate, guarded maintainer path. Before using the accepted files for Store publication:

1. Complete the [Store-specific screenshot checklist](../raycast-publish/screenshots.md).
2. Re-check the current Raycast Store requirements.
3. Complete the coordinated Store publication prerequisites in `raycast-publish/publish.md`.

Do not repeat or independently redefine the common capture targets, preparation steps, synchronization, or visual checks in the Store-specific document.
