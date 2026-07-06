# MdClip UI Evidence and README Media Procedure

## 1. Purpose

This document defines how to create and verify current MdClip UI evidence for README media, the public GitHub repository, GitHub Release review, and manual release-preparation checks.

Use this procedure when refreshing `metadata/mdclip-*.png`, syncing `media/mdclip-1.png`, or confirming that current screenshots represent the active MdClip UI.

Store publication uses the separate re-approval path described in [Store publish re-approval path](#11-store-publish-re-approval-path).

## 2. Source Of Truth

Use these sources in this order:

1. Current MdClip product direction and implementation.
2. This document.
3. [Local Verification](local-verification.md).
4. [Getting Started](getting-started.md).
5. [Release Management](release-management.md).
6. Current Raycast and GitHub documentation.

Relevant official references:

- Raycast Window Capture reference:
  https://developers.raycast.com/basics/prepare-an-extension-for-store
- Raycast local extension development path:
  https://manual.raycast.com/extensions
- GitHub README relative image paths:
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes

## 3. Execution Ownership

| Work area                                             | Owner                                               | Notes                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Update this procedure                                 | Agent-executable after exact-path approval          | This B5-B1 batch covers the procedure and sync path only                                |
| Update `scripts/sync-readme-media.mjs`                | Agent-executable after exact-path approval          | The script must use current `mdclip` image names                                        |
| Run `npm run demo:setup`                              | Agent-executable or human-executable after approval | It writes local demo output under `demo/markdown-sources/`                              |
| Run `npm run dev`                                     | Human/Raycast GUI/manual                            | It opens MdClip through Raycast development mode                                        |
| Configure Raycast Extension Preferences               | Human/Raycast GUI/manual                            | Requires the Raycast app UI                                                             |
| Configure Raycast Window Capture                      | Human/Raycast GUI/manual                            | Requires Raycast Settings                                                               |
| Capture screenshots                                   | Human/Raycast GUI/manual                            | Use Raycast Window Capture, not generated mockups                                       |
| Review image quality and sensitive data               | User review                                         | The user must approve current visual evidence before old images are archived or deleted |
| Verify file names, dimensions, hashes, and Git status | Agent-executable after screenshots exist            | This does not replace human visual review                                               |
| GitHub About/topics update                            | GitHub Web UI or approved external action           | Not part of screenshot capture                                                          |

Do not replace Raycast GUI/manual work with generated images, ad hoc conversion, or inferred automation unless that exact substitution is separately approved.

## 4. Reused And Changed Pieces

Reusable from the old Store-oriented procedure:

- Raycast `Window Capture`
- Running the extension in development mode
- Using controlled demo Markdown files
- Using one consistent background
- Saving PNG screenshots under `metadata/`
- Checking `2000 x 1250` pixel output when Raycast creates metadata screenshots
- Checking that screenshots contain no sensitive information
- Syncing the first screenshot into `media/` for README/GitHub use

Changed for MdClip:

- Product name is `MdClip`.
- UI concepts are `Markdown Source`, `Markdown files`, and `Markdown file contents`.
- Current screenshot file names use `mdclip`.
- `metadata/local-copy-blocks-*.png` and `media/local-copy-blocks-1.png` are historical old UI evidence file names only.
- README/GitHub media is source-use evidence, not Store submission material.

## 5. Managed Files And Roles

| Path                               | Role                                                    | Current status                        |
| ---------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| `docs/screenshot-media.md`         | Current screenshot and media procedure                  | Active                                |
| `docs/assets/autumnal-peach.png`   | Reusable Window Capture background                      | Active helper asset                   |
| `metadata/mdclip-1.png`            | Current MdClip screenshot 1                             | Exists as a current `2000 x 1250` PNG |
| `metadata/mdclip-2.png`            | Current MdClip screenshot 2                             | Exists as a current `2000 x 1250` PNG |
| `metadata/mdclip-3.png`            | Current MdClip screenshot 3                             | Exists as a current `2000 x 1250` PNG |
| `media/mdclip-1.png`               | README/GitHub media copied from `metadata/mdclip-1.png` | Exists as current README/GitHub media |
| `metadata/local-copy-blocks-*.png` | Old Store-oriented screenshots                          | Not present in the current media set  |
| `media/local-copy-blocks-1.png`    | Old README media                                        | Not present in the current media set  |

`assets/` is for runtime extension assets such as icons. It is not the screenshot evidence folder.

## 6. Capture Preparation

### 6.1 Demo Data

Use current MdClip demo data.

```sh
npm run demo:setup
```

The expected generated folders are:

```text
demo/markdown-sources/markdown-source-1
demo/markdown-sources/markdown-source-2
demo/markdown-sources/markdown-source-3
```

Before capture, confirm that demo files contain only public-safe content.

Do not include:

- personal information
- credentials
- API keys
- internal or customer data
- unpublished project names
- real work documents

### 6.2 Raycast Preferences

Open MdClip extension preferences in Raycast and configure:

| Preference               | Value                                     |
| ------------------------ | ----------------------------------------- |
| Enable Markdown Source 1 | On                                        |
| Markdown Source 1 Folder | `demo/markdown-sources/markdown-source-1` |
| Markdown Source 1 Name   | `Markdown Source 1`                       |
| Enable Markdown Source 2 | On                                        |
| Markdown Source 2 Folder | `demo/markdown-sources/markdown-source-2` |
| Markdown Source 2 Name   | `Markdown Source 2`                       |
| Enable Markdown Source 3 | On                                        |
| Markdown Source 3 Folder | `demo/markdown-sources/markdown-source-3` |
| Markdown Source 3 Name   | `Markdown Source 3`                       |
| Preview Line Count       | `10`                                      |
| Preview Max Characters   | `4000`                                    |

Leave `Editor` unset unless the capture specifically needs `Open in Editor`.

### 6.3 Raycast Development Mode

Start the extension from the repository root:

```sh
npm run dev
```

Wait until the extension is built and Raycast can open the MdClip commands.

### 6.4 Window Capture Settings

In Raycast Settings:

1. Open `Advanced`.
2. Configure `Window Capture` `Record Hotkey`.
3. Confirm the configured hotkey before capture.
   - Raycast's official example is `Command + Shift + Option + M`.
   - The hotkey is user-configurable; do not assume it is already set.
   - If the field is empty, set `Command + Shift + Option + M` unless it conflicts with another local shortcut.
   - With an MdClip command open in development mode, press the hotkey once and confirm the Raycast Window Capture UI opens.
   - If this is only a test, cancel the capture instead of saving a file.
4. Set `Custom Wallpaper` to `docs/assets/autumnal-peach.png`.
5. Use the same background for every screenshot.
6. Use one theme unless a later approved capture plan explicitly requires showing a theme difference.

Reference:

- Raycast documents Window Capture under `Prepare an Extension for Store` and shows the same example hotkey: https://developers.raycast.com/basics/prepare-an-extension-for-store

## 7. Capture Targets

Use or refresh these three current MdClip screenshots when screenshot evidence is regenerated.

| File                    | Command                | Required state                                                                                              | Purpose                                                      |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `metadata/mdclip-1.png` | `Markdown Source 1`    | `blog-outline.md` selected, preview pane visible, metadata table visible, primary action `Copy Raw Content` | Show browsing and previewing a Markdown file from one source |
| `metadata/mdclip-2.png` | `Markdown Source 2`    | `all-placeholders.md` selected, Action Panel open, `Copy Expanded Content` selected                         | Show placeholder expansion as an explicit action             |
| `metadata/mdclip-3.png` | `All Markdown Sources` | Multiple Markdown Source sections visible, a Markdown file selected, preview pane visible                   | Show cross-source search                                     |

Expected current UI wording includes:

- `Markdown Source 1`
- `Markdown Source 2`
- `All Markdown Sources`
- `Markdown Source`
- `Relative Path`
- `Copy Raw Content`
- `Copy Expanded Content`

The screenshots must not show old active wording such as `Block Set`, `All Block Sets`, `local-copy-blocks`, or `Local Copy Blocks`.

## 8. Capture Steps

For each target:

1. Open the target MdClip command in Raycast.
2. Select the target Markdown file or action state.
3. Press the configured Window Capture hotkey.
4. Save the capture into `metadata/`.
5. Name the output according to the target table.
6. Confirm the screenshot shows only Raycast and the MdClip UI.
7. Confirm there is no sensitive information.

Do not manually crop, resize, composite, or retouch the screenshot unless a later approved procedure explicitly changes this rule.

## 9. README Media Sync

After `metadata/mdclip-1.png` exists and has passed review, sync the README/GitHub media image:

```sh
npm run sync:readme-media
```

The sync script copies:

```text
metadata/mdclip-1.png -> media/mdclip-1.png
```

Do not sync old `local-copy-blocks` images into `media/`.

README insertion is a separate repository documentation change and requires exact-path approval for README files.

## 10. Verification

After capture and sync, verify file dimensions:

```sh
sips -g pixelWidth -g pixelHeight metadata/mdclip-*.png media/mdclip-1.png
```

Expected Raycast metadata screenshot dimensions:

```text
2000 x 1250
```

Also verify:

- PNG format
- readable text
- no sensitive information
- no old product identity
- consistent background
- consistent theme
- list and preview panes are visible where required
- Action Panel screenshot shows action icons consistently
- `git status --short` shows only approved media changes

Human visual review is required before current screenshot or README media files are replaced, archived, or deleted.

## 11. Store publish re-approval path

Raycast Store publication has its own screenshot and metadata requirements. When Store publication is re-approved, use `raycast-publish/screenshots.md` together with current Raycast Store documentation.

Start from current MdClip UI evidence, then complete Store-specific screenshot review as part of the coordinated publish resource set.
