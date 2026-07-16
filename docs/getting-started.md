# Getting Started with MdClip

English | [日本語](getting-started.ja.md)

## 1. Purpose

This guide explains how to download `Source code (zip)` from the latest GitHub Release, install the dependencies on a Mac, and start using MdClip through Raycast development mode.

The downloaded source archive contains the source fixed to its release tag. To use a newer version, download `Source code (zip)` again from the latest GitHub Release, set up the project's npm version, and rerun `npm ci` and `npm run dev` as needed.

## 2. Requirements

| Requirement                                           | Purpose                                         |
| ----------------------------------------------------- | ----------------------------------------------- |
| macOS                                                 | Run Raycast and MdClip                          |
| Raycast                                               | Open MdClip                                     |
| Node.js and npm                                       | Install dependencies and start development mode |
| Source code downloaded from the latest GitHub Release | Provide the MdClip extension source             |

Confirm that Node.js and npm are available.

```bash
node -v
npm -v
```

The current MdClip dependencies require Node.js `22.22.2` or later. The repository's `.node-version` records the latest verified Node.js LTS version. If Node.js is not installed or the version is too old, install an LTS version from the [official Node.js download page](https://nodejs.org/en/download).

MdClip's setup command selects the npm version tested with this release. If your current npm version is different, the command changes the global npm version used by your currently selected Node.js installation.

Git is not required. For normal use, you can use `Source code (zip)` from the latest GitHub Release.

## 3. Download the Source Code

You can complete the download with the GitHub Web UI and Finder.

1. Open `https://github.com/uchimanajet7/mdclip/releases/latest` in a web browser.
2. Download `Source code (zip)` from the displayed latest release.
3. Open the downloaded ZIP file in Finder to extract it.
4. Move the extracted `mdclip` folder to a location you can manage easily.

Completion checks:

- The downloaded ZIP file is `Source code (zip)` from the latest release page.
- You can open the `mdclip` folder in Finder.
- The folder contains `package.json`.

## 4. Install the Dependencies

Open the `mdclip` folder in Finder, right-click the folder, and select `New Terminal at Folder`.

Run the following commands in the terminal.

```bash
node scripts/setup-npm.mjs
npm ci
```

`node scripts/setup-npm.mjs` selects the npm version tested with this MdClip release. If your current npm version is different, the command changes the global npm version used by your currently selected Node.js installation. `npm ci` installs MdClip's dependencies in the extracted source folder.

Completion checks:

- Both commands finish without errors.
- The `mdclip/node_modules` folder is created.

## 5. Start in Raycast Development Mode

Run the following command in the same `mdclip` folder.

```bash
npm run dev
```

When `ready - built extension successfully` appears, you can open the MdClip commands from Raycast.

`npm run dev` imports MdClip into Raycast and starts it in development mode. After the first import, MdClip remains available in Raycast even if you press `Control + C` in the terminal to stop `npm run dev`. Run `npm run dev` again from the same folder when you want to apply changes or use development-mode logs and hot reload.

## 6. Configure a Markdown Source

Open `Extensions` in Raycast Settings or Preferences, then select MdClip.

You can start with Markdown Source 1. MdClip needs at least one configured source. Set a folder for each additional source you use; unused sources do not need a folder.

```text
Enable Markdown Source 1:
on

Markdown Source 1 Folder:
folder containing the Markdown files you want to reuse
```

For `Markdown Source 1 Folder`, select the folder that actually contains your `.md` files.

After configuring it, open the `Markdown Source 1` command in Raycast and confirm that your Markdown files appear.

## 7. Verify the Behavior

Select a Markdown file and confirm the following behavior.

- `Copy Raw Content` copies the Markdown file contents without changes.
- `Copy Expanded Content` expands the supported Dynamic Placeholders and copies the result.
- The preview pane shows the beginning of the Markdown file.
- `All Markdown Sources` searches across all enabled sources.

For details about Dynamic Placeholders, see [README](../README.md#dynamic-placeholders).

## 8. Update MdClip

1. Open `https://github.com/uchimanajet7/mdclip/releases/latest` in the GitHub Web UI.
2. Download `Source code (zip)` from the displayed latest release.
3. Extract the ZIP file in Finder.
4. Replace the old `mdclip` folder if needed.
5. Run `node scripts/setup-npm.mjs` in the new `mdclip` folder.
6. Run `npm ci`.
7. Run `npm run dev`.

Completion checks:

- The downloaded ZIP file is `Source code (zip)` from the latest release page.
- The selected npm version is active in the new `mdclip` folder.
- `npm ci` finishes without errors in the new `mdclip` folder.
- After running `npm run dev` in the new `mdclip` folder, you can open the MdClip commands from Raycast.

## 9. Stop Using MdClip

Remove the MdClip extension imported into Raycast, the downloaded source code, and any additional tools you installed only if you no longer need them.

### 9.1 Remove MdClip from Raycast

1. Open `Manage Extensions` in Raycast.
2. Select MdClip.
3. Run the uninstall or remove action.

If you cannot remove MdClip from Raycast, quit Raycast and check the following folder in Finder.

```text
~/.config/raycast/extensions/mdclip
```

If it exists, delete only this `mdclip` folder. The `~/.config/raycast/extensions` folder may contain other local extensions.

### 9.2 Delete the Source Code

Delete the extracted `mdclip` folder in Finder.

Deleting the source-code folder also removes the `node_modules` folder created by `npm ci`.

## 10. Confirm Removal

To confirm that your Mac has returned to its state before MdClip was installed, check the following.

- The MdClip commands no longer appear in Raycast.
- `~/.config/raycast/extensions/mdclip` does not exist.
- The downloaded and extracted `mdclip` folder no longer exists.

If you use Node.js, npm, or Raycast for other purposes, keep those tools installed and remove only the MdClip extension and source code.
