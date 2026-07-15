# MdClip Store Screenshot Procedure

## 1. Purpose

This procedure defines the Store screenshot and metadata workflow to complete before publishing MdClip to the Raycast Store.

For current README/GitHub media outside Store publication, use `docs/screenshot-media.md` first. For Store publication, start from current MdClip UI evidence and complete the Store-specific checks in this file.

## 2. Official References

Check current official documentation before capture:

- Raycast Prepare an Extension for Store: https://developers.raycast.com/basics/prepare-an-extension-for-store
- Raycast Window Capture requirements are described in the Store preparation documentation above.

The repository procedure must not replace the current Raycast requirements. If the official requirements change, update this file before capture.

## 3. Managed Files

| Path                             | Role                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `metadata/mdclip-1.png`          | Current MdClip UI evidence and Store screenshot 1 after Store-specific review           |
| `metadata/mdclip-2.png`          | Current MdClip UI evidence and Store screenshot 2 after Store-specific review           |
| `metadata/mdclip-3.png`          | Current MdClip UI evidence and Store screenshot 3 after Store-specific review           |
| `media/mdclip-1.png`             | README/GitHub media copied from `metadata/mdclip-1.png`                                 |
| `docs/assets/autumnal-peach.png` | Reusable Window Capture background                                                      |
| `raycast-publish/README.md`      | Store-facing README source to use as root `README.md` in a prepared publish source      |
| `raycast-publish/CHANGELOG.md`   | Store Version History source to use as root `CHANGELOG.md` in a prepared publish source |

The old `metadata/local-copy-blocks-*.png` and `media/local-copy-blocks-1.png` files are not current MdClip evidence.

## 4. Capture Preparation

### 4.1 Demo Data

Use current MdClip demo data:

```sh
npm run demo:setup
```

Expected generated folders:

```text
demo/markdown-sources/markdown-source-1
demo/markdown-sources/markdown-source-2
demo/markdown-sources/markdown-source-3
```

Before capture, confirm that generated Markdown files contain only public-safe content.

Do not include:

- personal information
- credentials
- API keys
- internal or customer data
- unpublished project names
- real work documents

### 4.2 Raycast Preferences

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

Leave `Editor` unset unless the screenshot specifically needs `Open in Editor`.

### 4.3 Raycast Development Mode

Start MdClip from the repository root:

```sh
npm run dev
```

Wait until Raycast can open the MdClip commands.

### 4.4 Window Capture Settings

In Raycast Settings:

1. Open `Advanced`.
2. Configure `Window Capture` `Record Hotkey`.
3. Confirm the configured hotkey before capture.
   - Raycast's official example is `Command + Shift + Option + M`.
   - The hotkey is user-configurable; do not assume it is already set.
   - If the field is empty, set `Command + Shift + Option + M` unless it conflicts with another local shortcut.
   - With an MdClip command open in development mode, press the hotkey once and confirm the Window Capture UI opens.
   - If this is only a test, cancel the capture instead of saving a file.
4. Set `Custom Wallpaper` to `docs/assets/autumnal-peach.png`.
5. Use the same background for every screenshot.
6. Use one theme for the screenshot set. If a capture target requires a theme difference, document that requirement in the target table.

## 5. Capture Targets

Create at least these three current MdClip screenshots:

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

Screenshots must not show old active wording such as `Block Set`, `All Block Sets`, `local-copy-blocks`, or `Local Copy Blocks`.

## 6. Capture Steps

Perform capture in the Raycast app with Raycast Window Capture. Do not substitute generated images, ad hoc conversion, or inferred automation for the Raycast GUI capture.

For each target:

1. Open the target MdClip command in Raycast.
2. Select the target Markdown file or action state.
3. Press the configured Window Capture hotkey.
4. Save the capture into `metadata/`.
5. Name the output according to the target table.
6. Confirm the screenshot shows only Raycast and the MdClip UI.
7. Confirm there is no sensitive information.

Do not manually crop, resize, composite, or retouch the screenshot.

## 7. README/GitHub Media Sync

For current README/GitHub media, follow `docs/screenshot-media.md`. After `metadata/mdclip-1.png` exists and has passed the verification in this file, sync the README/GitHub media image:

```sh
npm run sync:readme-media
```

The sync script copies:

```text
metadata/mdclip-1.png -> media/mdclip-1.png
```

For Store publication, complete the Store-specific checks in this file before using the same media in a prepared publish source.

## 8. Verification

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
- `git status --short` shows only the intended media changes

Complete the manual visual checks before using screenshots for Store publication.

## 9. Raycast Pull Request Review Evidence

Raycast publish creates or updates a pull request in `raycast/extensions`.

The Pull Request `Screencast` field is reviewer-facing evidence in the PR. Store screenshots are the `metadata/mdclip-*.png` files.

For Store publication, attach or reference the current `metadata/mdclip-*.png` screenshots in the PR review context as needed.
