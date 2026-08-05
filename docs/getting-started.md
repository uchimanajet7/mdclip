# Getting Started with MdClip

English | [日本語](getting-started.ja.md)

## 1. Purpose

MdClip is currently installed from GitHub Release source code as a local Raycast extension, not from the Raycast Store. Initial setup uses Node.js and Terminal, and updates are applied manually from a newer release.

This guide provides the corresponding download, dependency installation, Raycast development-mode startup, Markdown Source configuration, verification, update, clean reinstallation, and removal steps. Each downloaded source archive is fixed to its release tag.

## 2. Requirements

| Requirement                                           | Purpose                                         |
| ----------------------------------------------------- | ----------------------------------------------- |
| macOS                                                 | Run Raycast and MdClip                          |
| Raycast                                               | Open MdClip                                     |
| Node.js and npm                                       | Install dependencies and start development mode |
| Source code downloaded from the latest GitHub Release | Provide the MdClip extension source             |

Git is not required. For normal use, you can use `Source code (zip)` from the latest GitHub Release.

## 3. Download the Source Code

You can complete the download with the GitHub Web UI and Finder.

1. Open `https://github.com/uchimanajet7/mdclip/releases/latest` in a web browser.
2. Download `Source code (zip)` from the displayed latest release.
3. Open the downloaded ZIP file in Finder to extract it.
4. Rename the extracted folder to `mdclip`, then move it to a location you can manage easily.

Completion checks:

- The downloaded ZIP file is `Source code (zip)` from the latest release page.
- You can open the renamed `mdclip` folder in Finder.
- The folder contains `package.json`.

## 4. Install the Dependencies

Open the `mdclip` folder in Finder, right-click the folder, and select `New Terminal at Folder`.

Before installing the dependencies, check the Node.js and npm requirements for this MdClip release and the versions currently active on your Mac.

```bash
node -p "require('./package.json').engines"
node -v
npm -v
```

If the active Node.js and npm versions both satisfy the displayed `engines` ranges, continue with them. You do not need to switch Node.js or npm to match `.node-version`.

If Node.js is not installed or either active version does not satisfy the displayed ranges, install [Node.js 24.19.0](https://nodejs.org/en/download/archive/v24.19.0), the Active LTS release used by CI and release validation for this MdClip release. Its official distribution bundles npm 11.17.0, so both requirements are satisfied without changing npm separately. Official Node.js 22 distributions bundle npm 10 and therefore do not satisfy this release's npm requirement as installed. Do not update a shared global npm installation only for MdClip. Node.js recommends Active LTS or Maintenance LTS releases for production use in its [release policy](https://nodejs.org/en/about/previous-releases).

Run the following commands in the terminal.

```bash
npm ci
```

`.node-version` records the Node.js version used by CI, release validation, and the Raycast publication helper. It does not select, install, or replace the active local Node.js or npm. `npm ci` uses `package-lock.json` to install MdClip's dependencies in the extracted source folder.

Completion checks:

- `npm ci` finishes without errors.
- The `mdclip/node_modules` folder is created.
- The active Node.js and npm versions satisfy the displayed `engines` ranges.

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
- An individual Markdown Source command finds files by file name or relative path.
- `All Markdown Sources` also finds files by Markdown Source name across all enabled sources.
- A term that appears only inside a Markdown file does not match the file.

For details about Dynamic Placeholders, see [README](../README.md#dynamic-placeholders).

## 8. Update MdClip

For a normal update, keep MdClip in Raycast and replace its source folder with the source from the latest release.

1. Open `https://github.com/uchimanajet7/mdclip/releases/latest` in the GitHub Web UI.
2. Download `Source code (zip)` from the displayed latest release.
3. Extract the ZIP file in Finder.
4. If `npm run dev` is running in the old `mdclip` folder, press `Control + C` to stop it.
5. Delete the old `mdclip` folder.
6. Rename the extracted folder to `mdclip`, then move it to the same location where the old folder was stored.
7. In the new `mdclip` folder, repeat [4. Install the Dependencies](#4-install-the-dependencies).
8. In the new `mdclip` folder, repeat [5. Start in Raycast Development Mode](#5-start-in-raycast-development-mode).
9. Repeat [7. Verify the Behavior](#7-verify-the-behavior).

Completion checks:

- The downloaded ZIP file is `Source code (zip)` from the latest release page.
- The active Node.js and npm versions satisfy the `engines` ranges in the new `mdclip/package.json`.
- The old source folder is gone, and the new `mdclip` folder is in its previous location.
- `npm ci` finishes without errors in the new `mdclip` folder.
- After running `npm run dev` in the new `mdclip` folder, the checks in Section 7 pass.

## 9. Clean Reinstall MdClip

Use a clean reinstall when you want to remove the existing MdClip extension and its source code before installing the latest release.

1. Open `Manage Extensions` in Raycast, select MdClip, and run the uninstall or remove action.
2. Delete the old `mdclip` source folder in Finder.
3. Repeat Sections [3. Download the Source Code](#3-download-the-source-code) through [7. Verify the Behavior](#7-verify-the-behavior).

If removing MdClip clears its Raycast preferences or hotkeys, configure them again. Deleting the MdClip source folder does not delete Markdown files in the folders configured as Markdown Sources.

## 10. Stop Using MdClip

Remove the MdClip extension imported into Raycast, the downloaded source code, and any additional tools you installed only if you no longer need them.

### 10.1 Remove MdClip from Raycast

1. Open `Manage Extensions` in Raycast.
2. Select MdClip.
3. Run the uninstall or remove action.

If Raycast cannot remove MdClip, report the problem through [GitHub Issues](https://github.com/uchimanajet7/mdclip/issues).

### 10.2 Delete the Source Code

Delete the extracted `mdclip` folder in Finder.

Deleting the source-code folder also removes the `node_modules` folder created by `npm ci`.

## 11. Confirm Removal

To confirm that your Mac has returned to its state before MdClip was installed, check the following.

- The MdClip commands no longer appear in Raycast.
- The downloaded and extracted `mdclip` folder no longer exists.

If you use Node.js, npm, or Raycast for other purposes, keep those tools installed and remove only the MdClip extension and source code.
