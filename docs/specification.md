# MdClip 仕様書

## 1. 目的

MdClip は、利用者がローカルで管理している Markdown files を Raycast から素早く探し、本文をそのまま、または対応する Dynamic Placeholders を展開してコピーするための personal/local Raycast extension です。

MdClip は Markdown file の編集、note 管理、Markdown rendering を主目的にしません。中心価値は、既存の Markdown files を source of truth としたまま、Raycast から検索、preview、copy できることです。

## 2. Product direction

| 項目                       | 仕様                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Product title              | `MdClip`                                                                                                                                |
| Package name               | `mdclip`                                                                                                                                |
| Repository                 | `https://github.com/uchimanajet7/mdclip`                                                                                                |
| Distribution model         | Normal use: latest GitHub Release `Source code (zip)` plus local Raycast development mode. Development/verification: source checkout    |
| Active release unit        | GitHub Releases                                                                                                                         |
| Raycast Store publish      | Managed through the Store publish re-approval path before any Store-facing workflow, script, media, or external state is treated active |
| Old identity compatibility | Not supported                                                                                                                           |

旧 `raycast-local-copy-blocks` / `local-copy-blocks` は compatibility target ではありません。active product、docs、workflow、media、local path、remote reference は `mdclip` を正とします。旧名称は historical reference として明示された場合だけ許容します。

## 3. User model

想定する利用者は、再利用したい文章を既に Markdown files として管理している人です。

- Markdown files は普段の editor で編集する。
- file history は Git など既存の file-based workflow で管理する。
- Raycast では作成や編集ではなく、検索、preview、copy を素早く行う。
- copy 時に必要な現在日時、time zone、UUID、clipboard text だけを展開したい。

## 4. Core principles

| 原則                     | 内容                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Local-first              | 専用 database や cloud sync を要求せず、利用者の local Markdown files を読む               |
| Copy-first               | 編集や note 管理ではなく、選択した Markdown file content を clipboard へ送ることに集中する |
| Source-based             | 最大 3 つの Markdown Source folder を設定し、個別または横断検索する                        |
| Copy-time expansion      | 対応 placeholder を copy の瞬間に置換する                                                  |
| Read-only file operation | Markdown files を作成、編集、rename、移動、削除しない                                      |

## 5. Commands

MdClip は次の 4 commands を提供します。

| Command              | Entry point                    | 用途                                                   |
| -------------------- | ------------------------------ | ------------------------------------------------------ |
| Markdown Source 1    | `src/markdown-source-1.tsx`    | Markdown Source 1 の Markdown files を表示             |
| Markdown Source 2    | `src/markdown-source-2.tsx`    | Markdown Source 2 の Markdown files を表示             |
| Markdown Source 3    | `src/markdown-source-3.tsx`    | Markdown Source 3 の Markdown files を表示             |
| All Markdown Sources | `src/all-markdown-sources.tsx` | 有効かつ設定済みのすべての Markdown Sources を横断検索 |

個別 source command は、よく使う folder に hotkey を割り当てやすくするために残します。All Markdown Sources は、場所が曖昧な Markdown file を探す入口です。

`package.json` の command 配列は Markdown Source 1、2、3、All Markdown Sources の順です。ただし、これは Raycast Root Search の固定表示順を保証する仕様ではありません。Raycast の Root Search は command title を表示対象にしつつ、Raycast 側の ranking data によって結果順を変えることがあります。表示順の調整は Raycast の Reset Ranking action や user-side settings の領域です。MdClip 側で固定的な `1, 2, 3` 表示順を product requirement にする場合は、command title など user-visible naming を変える別判断として扱います。

## 6. Preferences

Markdown Source settings は extension preferences として管理します。

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

| Preference               | Type      | Required | Default | 説明                                                                                                                                      |
| ------------------------ | --------- | -------: | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Enable Markdown Source N | checkbox  |       no | `true`  | 対象 source を個別 command と All Markdown Sources に含める                                                                               |
| Markdown Source N Folder | directory |       no | none    | 対象 source が読む Markdown folder                                                                                                        |
| Markdown Source N Name   | textfield |       no | none    | MdClip 内の一覧、section、metadata で使う source 表示名。Raycast Root Search の command title は変更しない。空の場合は folder name を使う |
| Editor                   | appPicker |       no | none    | Open in Editor で使う editor                                                                                                              |
| Preview Line Count       | textfield |       no | `10`    | preview に表示する冒頭行数。上限は `100`                                                                                                  |
| Preview Max Characters   | textfield |       no | `4000`  | preview の最大文字数。上限は `20000`                                                                                                      |

Markdown Source Folder は optional です。source を使うには、その source が enabled で folder が設定されている必要があります。

## 7. Markdown file listing

有効かつ設定済みの Markdown Source Folder 配下で、拡張子 `.md` の files を大文字小文字を区別せずに再帰的に検出します。

対象例:

- `.md`
- `.MD`
- `.Md`
- `.mD`

除外対象:

- `.git` 配下
- `node_modules` 配下
- hidden directory 配下
- extension が `.md` ではない file

symbolic link は辿りません。

## 8. List UI

一覧 item は、検索と選択に必要な情報を優先します。

- title: file name
- subtitle: Markdown Source Folder からの relative parent path がある場合だけ表示
- accessories: preview 非表示時に updated time と file size を表示

preview 表示中は detail pane に情報を集約し、一覧側の過密表示を避けます。

All Markdown Sources では、Markdown Source ごとの section を維持します。読み込めない source がある場合は、読み込める source の files を表示し、失敗 source を `Could Not Load` section と Toast で通知します。

## 9. Sort

検索バー右側の `Sort` dropdown で表示順を切り替えます。

| Sort                   | 説明                                                  |
| ---------------------- | ----------------------------------------------------- |
| Updated (Newest First) | 更新日時が新しい順。初期値                            |
| Updated (Oldest First) | 更新日時が古い順                                      |
| Name (A-Z)             | file name ascending                                   |
| Path (A-Z)             | Markdown Source Folder からの relative path ascending |

All Markdown Sources では source section を維持し、section 内の files だけを sort します。

## 10. Preview

preview は初回起動時に enabled とします。

preview 表示中は、選択中 file の冒頭を Raycast detail pane に表示します。preview content は一覧作成時には読み込まず、選択中 file で必要になった時点で読み込みます。

preview は `Preview Line Count` と `Preview Max Characters` の小さい方の制限に従って切り詰めます。設定値が正の整数として読めない場合、または `1` 未満の場合は default を使います。上限を超える場合は上限値を使います。

preview visibility は Raycast Cache に `mdclip.preview.enabled` として保存します。旧 key の migration は行いません。

## 11. Actions

選択した Markdown file に対して次の actions を提供します。

| Action                     | icon               | 説明                                           |
| -------------------------- | ------------------ | ---------------------------------------------- |
| Copy Raw Content           | `Icon.Clipboard`   | file content を変更せずに clipboard へコピー   |
| Copy Expanded Content      | `Icon.Replace`     | 対応 placeholder を置換して clipboard へコピー |
| Show Preview               | `Icon.Eye`         | preview pane を表示                            |
| Hide Preview               | `Icon.EyeDisabled` | preview pane を非表示                          |
| Open in Editor             | `Icon.Pencil`      | configured editor で file を開く               |
| Open                       | `Icon.Document`    | default app で file を開く                     |
| Open with...               | Raycast default    | compatible app で file を開く                  |
| Show in Finder             | Raycast default    | Finder で file を表示                          |
| Open Extension Preferences | `Icon.Gear`        | 設定が必要な状態で preferences を開く          |

`Copy Raw Content` を primary action とします。

`Open in Editor` と `Open` は同時に表示しません。Editor preference が設定済みの場合は `Open in Editor`、未設定の場合は `Open` を表示します。

## 12. Dynamic Placeholders

`Copy Expanded Content` は、元の Markdown file を変更せず、copy 結果だけを置換します。

| Placeholder   | 置換内容                                      |
| ------------- | --------------------------------------------- |
| `{date}`      | 実行環境の locale に基づく現在日付            |
| `{time}`      | 実行環境の locale に基づく現在時刻            |
| `{datetime}`  | 実行環境の locale に基づく現在日時            |
| `{day}`       | 実行環境の locale に基づく曜日                |
| `{timezone}`  | `Asia/Tokyo UTC+09:00` のような現在 time zone |
| `{now}`       | 現在日時と time zone                          |
| `{uuid}`      | 出現箇所ごとに個別生成する UUID               |
| `{clipboard}` | 現在の clipboard text                         |

この表にない placeholder は置換せず、そのまま copy result に残します。

`{clipboard}` は、copy 対象 Markdown 本文内に `{clipboard}` が存在する場合だけ読み取ります。

Reference: https://manual.raycast.com/dynamic-placeholders

## 13. Error states

| 状態                                         | 表示                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| source disabled                              | 設定確認画面と `Open Extension Preferences`                                        |
| source folder unset                          | 設定確認画面と `Open Extension Preferences`                                        |
| configured path is not a directory           | 読み込み失敗画面と `Open Extension Preferences`                                    |
| no Markdown files                            | empty state と `Open Extension Preferences`                                        |
| partial load failure in All Markdown Sources | 読み込める files を表示し、失敗 source を `Could Not Load` section と Toast で表示 |
| copy failure                                 | failure Toast                                                                      |

## 14. Security and data handling

MdClip は、利用者が有効化して設定した Markdown Source Folder 配下の Markdown files だけを読み取ります。

通常利用中に MdClip 自体が network request を行うことはありません。

Markdown content は、利用者が copy action を実行した場合だけ clipboard へ渡します。

`{clipboard}` は、Markdown 本文に `{clipboard}` が含まれる場合だけ現在 clipboard text を読み取ります。

MdClip は Markdown files を作成、編集、rename、移動、削除しません。Git 操作や cloud sync も行いません。

## 15. Implementation

| Area                    | 方針                                                 |
| ----------------------- | ---------------------------------------------------- |
| Framework               | Raycast Extension, TypeScript, React, Raycast API    |
| File traversal          | Node.js standard library                             |
| Placeholder replacement | extension 内の明示的な置換処理                       |
| Preferences type        | Raycast CLI が生成する `raycast-env.d.ts` を信頼する |
| Runtime source model    | `MarkdownSource*` と `MarkdownFile*`                 |
| Compatibility migration | 旧 identity 用 migration は追加しない                |

## 16. Project commands

| Command                       | 役割                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| `npm run check`               | `npm run lint` の既存 alias                                       |
| `npm run lint`                | 開発・メンテナンス時の標準検証                                    |
| `npm run check:type`          | TypeScript 型検査                                                 |
| `npm run check:lint`          | Raycast CLI を使わない source ESLint                              |
| `npm run check:format`        | managed files の format check                                     |
| `npm run check:local`         | Raycast アプリに依存しない repository 固有 verification           |
| `npm run lint:raycast`        | Raycast CLI lint                                                  |
| `npm run build`               | Raycast build validation                                          |
| `npm run dev`                 | Raycast development mode                                          |
| `npm run demo:setup`          | demo Markdown Sources 作成                                        |
| `npm run demo:clean`          | demo Markdown Sources 削除                                        |
| `npm run sync:readme-media`   | `metadata/mdclip-1.png` から `media/mdclip-1.png` への media sync |
| `npm run format`              | managed files の write-format                                     |
| `npm run fix-lint`            | source ESLint 自動修正と write-format                             |
| `npm run update:dependencies` | dependency update maintainer workflow                             |
| `npm run migrate`             | Raycast API migration maintainer workflow                         |
| `npm run icon:generate`       | 確認用 icon 生成                                                  |

`npm run publish` は通常 npm script surface に置きません。

## 17. Verification

開発・メンテナンス時の標準検証:

```bash
npm run lint
```

Raycast CLI validation:

```bash
npm run lint:raycast
```

build validation:

```bash
npm run build
```

manual UI verification:

```bash
npm run dev
```

manual UI verification では、command names、preferences、list behavior、copy actions、preview、editor actions、error states が MdClip / Markdown Source model と一致することを確認します。current UI evidence と README media の確認は `docs/screenshot-media.md` の `MdClip UI Evidence and README Media Procedure` に従います。

## 18. Release path and Store publish re-approval path

Active public release unit は GitHub Release です。通常利用者の導入、更新、削除は `docs/getting-started.md` を正とし、latest GitHub Release の `Source code (zip)` を取得します。

Release owner / maintainer の GitHub Release 管理は `docs/release-management.md` を正とします。Release manifest は `.github/release-manifest.json`、GitHub Release body は `.github/release-changelog/*.md` を使います。

Current UI evidence と README media は `docs/screenshot-media.md` を正とします。

Store publish を再開する場合は、product direction、workflow、script、secret、Store Version History、screenshots、README、docs、GitHub About metadata を Store publish re-approval path としてまとめて再承認します。

`raycast-publish/` は Store publish re-approval resource set です。Store publish 用の README、Version History、screenshot 手順、背景説明をまとめます。Store publication が re-approved された後の Store screenshot / metadata procedure は `raycast-publish/screenshots.md` を正とします。root `CHANGELOG.md` を source-use root に復帰する場合は、root surface の意味と README / GitHub Release / Store Version History の整合性を別途判断します。

## 19. Repository structure

主要 file structure:

```text
repository-root
├── .github
│   ├── release-manifest.json
│   ├── release-changelog
│   │   └── vX.Y.Z.md
│   └── workflows
│       ├── build.yml
│       ├── publish-release-to-raycast.yml
│       └── release.yml
├── README.md
├── README.ja.md
├── docs
│   ├── assets
│   │   └── autumnal-peach.png
│   ├── getting-started.md
│   ├── local-verification.md
│   ├── release-management.md
│   ├── screenshot-media.md
│   └── specification.md
├── media
│   └── mdclip-1.png
├── metadata
│   ├── mdclip-1.png
│   ├── mdclip-2.png
│   └── mdclip-3.png
├── raycast-publish
│   ├── CHANGELOG.md
│   ├── README.md
│   ├── publish.md
│   └── screenshots.md
├── scripts
│   ├── demo-markdown-sources.mjs
│   ├── format.mjs
│   ├── generate-icon.mjs
│   ├── local-verification.mjs
│   ├── publish-raycast-pr.mjs
│   ├── release-manifest.mjs
│   ├── sync-readme-media.mjs
│   └── update-dependencies.mjs
└── src
    ├── markdown-source-1.tsx
    ├── markdown-source-2.tsx
    ├── markdown-source-3.tsx
    ├── all-markdown-sources.tsx
    ├── components
    │   ├── AllMarkdownSourcesCommand.tsx
    │   ├── ConfigurationRequired.tsx
    │   ├── MarkdownFileList.tsx
    │   └── MarkdownSourceCommand.tsx
    ├── services
    │   ├── clipboard.ts
    │   ├── dynamicPlaceholders.ts
    │   ├── markdownFiles.ts
    │   ├── preferences.ts
    │   └── preview.ts
    └── types.ts
```

主要 documentation roles:

| Path                         | Role                                               |
| ---------------------------- | -------------------------------------------------- |
| `README.md`                  | GitHub/source-use English README                   |
| `README.ja.md`               | GitHub/source-use Japanese README                  |
| `docs/getting-started.md`    | Normal user onboarding, update, and removal guide  |
| `docs/local-verification.md` | Development and maintenance verification guide     |
| `docs/release-management.md` | Release owner / maintainer release operation guide |
| `docs/screenshot-media.md`   | Current UI evidence and README/GitHub media guide  |
| `raycast-publish/`           | Store publish re-approval resource set             |

Generated or local-only paths include:

```text
node_modules/
raycast-env.d.ts
dist/
local-verification/
demo/markdown-sources/
assets/icon.generated.png
```

## 20. Media and metadata

Current UI evidence and README media handling is defined in `docs/screenshot-media.md`.

The active current-evidence paths are:

| Path                             | Role                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| `docs/assets/autumnal-peach.png` | Reusable Window Capture background                                 |
| `metadata/mdclip-1.png`          | Current MdClip screenshot 1, created by Raycast GUI/manual capture |
| `metadata/mdclip-2.png`          | Current MdClip screenshot 2, created by Raycast GUI/manual capture |
| `metadata/mdclip-3.png`          | Current MdClip screenshot 3, created by Raycast GUI/manual capture |
| `media/mdclip-1.png`             | README/GitHub media copied from `metadata/mdclip-1.png`            |

`scripts/sync-readme-media.mjs` copies `metadata/mdclip-1.png` to `media/mdclip-1.png`. It must not recreate old `local-copy-blocks` media.

Store publish screenshot handling belongs to `raycast-publish/screenshots.md` and the Store publish re-approval path. Old Store-oriented screenshots and media are not current MdClip UI evidence.
