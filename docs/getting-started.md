# Getting Started with MdClip

English | [日本語](getting-started.ja.md)

## 1. Purpose

MdClip is currently installed from GitHub Release source code as a local Raycast extension, not from the Raycast Store. Initial setup uses Node.js and Terminal, and updates are applied manually from a newer release.

This guide provides the corresponding download, dependency installation, Raycast development-mode startup, Markdown Source configuration, verification, update, and removal steps. Each downloaded source archive is fixed to its release tag.

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
4. Move the extracted `mdclip` folder to a location you can manage easily.

Completion checks:

- The downloaded ZIP file is `Source code (zip)` from the latest release page.
- You can open the `mdclip` folder in Finder.
- The folder contains `package.json`.

## 4. Install the Dependencies

Open the `mdclip` folder in Finder, right-click the folder, and select `New Terminal at Folder`.

Before installing the dependencies, check the Node.js version selected for this MdClip release and the Node.js and npm versions currently active on your Mac.

```bash
cat .node-version
node -v
npm -v
```

Use the Node.js version shown by `cat .node-version`. If Node.js is not installed or `node -v` shows a different version, install or switch to the displayed version using the [Node.js installation page](https://nodejs.org/en/download).

Run the following commands in the terminal.

```bash
npm ci
```

The Node.js release shown in `.node-version` includes an npm version that meets MdClip's minimum requirement. MdClip does not install or replace npm globally. `npm ci` uses `package-lock.json` to install MdClip's dependencies in the extracted source folder.

Completion checks:

- `npm ci` finishes without errors.
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
- An individual Markdown Source command finds files by file name or relative path.
- `All Markdown Sources` also finds files by Markdown Source name across all enabled sources.
- A term that appears only inside a Markdown file does not match the file.

For details about Dynamic Placeholders, see [README](../README.md#dynamic-placeholders).

## 8. Update MdClip

1. Open `https://github.com/uchimanajet7/mdclip/releases/latest` in the GitHub Web UI.
2. Download `Source code (zip)` from the displayed latest release.
3. Extract the ZIP file in Finder.
4. Replace the old `mdclip` folder if needed.
5. In the new `mdclip` folder, repeat [4. Install the Dependencies](#4-install-the-dependencies).
6. Run `npm run dev` in the new `mdclip` folder.

Completion checks:

- The downloaded ZIP file is `Source code (zip)` from the latest release page.
- The Node.js version shown by `cat .node-version` is active in the new `mdclip` folder.
- `npm ci` finishes without errors in the new `mdclip` folder.
- After running `npm run dev` in the new `mdclip` folder, you can open the MdClip commands from Raycast.

## 9. Stop Using MdClip

Remove the MdClip extension imported into Raycast, the downloaded source code, and any additional tools you installed only if you no longer need them.

### 9.1 Remove MdClip from Raycast

1. Open `Manage Extensions` in Raycast.
2. Select MdClip.
3. Run the uninstall or remove action.

If Raycast cannot remove MdClip, report the problem through [GitHub Issues](https://github.com/uchimanajet7/mdclip/issues).

### 9.2 Delete the Source Code

Delete the extracted `mdclip` folder in Finder.

Deleting the source-code folder also removes the `node_modules` folder created by `npm ci`.

## 10. Confirm Removal

To confirm that your Mac has returned to its state before MdClip was installed, check the following.

- The MdClip commands no longer appear in Raycast.
- The downloaded and extracted `mdclip` folder no longer exists.

If you use Node.js, npm, or Raycast for other purposes, keep those tools installed and remove only the MdClip extension and source code.
