# MdClip 仕様書

## 1. 目的

MdClip は、利用者がローカルで管理している Markdown files を Raycast から素早く探し、本文をそのまま、または対応する Dynamic Placeholders を展開してコピーするための personal/local Raycast extension です。

MdClip は Markdown file の編集、note 管理、Markdown rendering を主目的にしません。中心価値は、既存の Markdown files を source of truth としたまま、Raycast から検索、preview、copy できることです。

## 2. Product direction

| 項目                       | 仕様                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Product title              | `MdClip`                                                                                                                             |
| Package name               | `mdclip`                                                                                                                             |
| Repository                 | `https://github.com/uchimanajet7/mdclip`                                                                                             |
| Distribution model         | Normal use: latest GitHub Release `Source code (zip)` plus local Raycast development mode. Development/verification: source checkout |
| Active release unit        | GitHub Releases                                                                                                                      |
| Raycast Store publish      | Inactive until the Store publication prerequisites are complete and the guarded publish path is intentionally enabled                |
| Old identity compatibility | Not supported                                                                                                                        |

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

| Preference               | Type      | Raycast required | Default | 説明                                                                                                                                      |
| ------------------------ | --------- | ---------------: | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Enable Markdown Source N | checkbox  |               no | `true`  | folder 設定済みの対象 source を個別 command と All Markdown Sources に含める                                                              |
| Markdown Source N Folder | directory |               no | none    | 対象 source を使うために必要な Markdown folder                                                                                            |
| Markdown Source N Name   | textfield |               no | none    | MdClip 内の一覧、section、metadata で使う source 表示名。Raycast Root Search の command title は変更しない。空の場合は folder name を使う |
| Editor                   | appPicker |               no | none    | Open in Editor で使う editor                                                                                                              |
| Preview Line Count       | textfield |               no | `10`    | 前後空白を除いた `1`〜`100` の ASCII 数字による整数。無効値は `10`、`100` 超は `100`                                                      |
| Preview Max Characters   | textfield |               no | `4000`  | 前後空白を除いた `1`〜`20000` の ASCII 数字による整数。無効値は `4000`、`20000` 超は `20000`                                              |

`Raycast required` は、値が未入力のときに Raycast が command を開く前に設定を要求するかを表します。README と Store README の `When needed` / `必要になる条件` は、利用者が MdClip の機能を使うための条件を表します。この 2 つを同じ「必須 / 任意」として扱いません。

3 つの Markdown Source Folder は、どれも `Raycast required: no` です。MdClip を利用するには設定済みの source が少なくとも 1 つ必要ですが、3 つすべての folder は必要ありません。使用する source は enabled にして folder を設定します。使用しない source には folder を設定する必要はありません。

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

一覧検索には Raycast List の標準 filtering を使います。各 item の検索 field は次のとおりです。

- title: file name
- keywords: Markdown Source Folder からの relative path、relative parent path の各 segment、Markdown Source の表示名

個別の Markdown Source command では file name または relative path から file を探します。All Markdown Sources では、これらに加えて Markdown Source の表示名からも file を探します。

Markdown file content は検索対象にしません。一覧検索のために content を読み込まず、選択中 file の preview または copy action が必要とする場合だけ読み込みます。

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

detail pane の metadata は、上から次の順で表示します。

| Metadata          | 用途                                                             |
| ----------------- | ---------------------------------------------------------------- |
| `Markdown Source` | file が属する論理的な Markdown Source を確認する                 |
| `Size`            | file size を確認する                                             |
| `Updated`         | file の更新日時を確認する                                        |
| `Full Path`       | file system 上の absolute path を確認する。metadata の最後に置く |

4 項目は separator を挟まず連続して表示します。`Full Path` は Detail 上で確認できる状態を維持し、主要な file 選択と preview content の確認を妨げないよう metadata の最後に置きます。

一覧の title に file name、subtitle に relative parent path を表示しているため、relative path は detail metadata では重複表示しません。relative path は一覧表示、検索、`Path (A-Z)` sort では引き続き使います。Raycast の `List.Item.Detail.Metadata` は選択 item の追加の構造化情報を表示する領域で、separator は metadata item を grouping する場合に使います。この metadata は 1 つの連続した file information set として表示するため、separator は使いません。[Raycast List API](https://developers.raycast.com/api-reference/user-interface/list) [Apple Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

preview は `Preview Line Count` と `Preview Max Characters` の小さい方の制限に従って切り詰めます。各設定値は前後の空白を除き、残った文字列全体が ASCII 数字 `[0-9]+` だけで構成される場合に整数として扱います。範囲内ならその値を使い、上限を超える場合は上限値を使います。JavaScript の数値範囲を超える長い数字列も上限値を使います。

未設定、空文字、`0`、負数、`+` 記号付き、小数、指数表記、数字以外を含む値、途中に空白がある値は無効です。無効な `Preview Line Count` は `10`、無効な `Preview Max Characters` は `4000` を使います。この補正で toast や追加の設定画面は表示しません。

制限によって表示されない content が実際に残る場合だけ、preview の末尾に `Preview truncated at the configured line or character limit. Open the file to view the full content.` と表示します。file 全体が制限内に収まる場合、制限位置で file が終了する場合、または empty file の場合は表示しません。

preview visibility は Raycast Cache に `mdclip.preview.enabled` として保存します。旧 key の migration は行いません。

## 11. Actions

選択した Markdown file に対して次の actions を提供します。

| Action                      | icon               | 説明                                           |
| --------------------------- | ------------------ | ---------------------------------------------- |
| Copy Raw Content            | `Icon.Clipboard`   | file content を変更せずに clipboard へコピー   |
| Copy Expanded Content       | `Icon.Replace`     | 対応 placeholder を置換して clipboard へコピー |
| Show Preview                | `Icon.Eye`         | preview pane を表示                            |
| Hide Preview                | `Icon.EyeDisabled` | preview pane を非表示                          |
| Open in Editor              | `Icon.Pencil`      | configured editor で file を開く               |
| Open                        | `Icon.Document`    | default app で file を開く                     |
| Open with...                | Raycast default    | compatible app で file を開く                  |
| Show in Finder              | Raycast default    | Finder で file を表示                          |
| Open Markdown Source Folder | `Icon.Folder`      | file がない個別 source の folder を開く        |
| Open Extension Preferences  | `Icon.Gear`        | 設定が必要な状態で preferences を開く          |

`Copy Raw Content` を primary action とします。

`Open in Editor` と `Open` は同時に表示しません。Editor preference が設定済みの場合は `Open in Editor`、未設定の場合は `Open` を表示します。

設定済み source に Markdown files がない場合、個別 command は `Open Markdown Source Folder` を primary action とします。All Markdown Sources は source ごとに `Open <Source Name> Folder` を表示します。folder の設定先を変更する場合に備えて、`Open Extension Preferences` も secondary action として表示します。source disabled、source folder unset、または configured path が directory ではない場合は folder を開く action を表示せず、`Open Extension Preferences` を復旧経路とします。

## 12. Dynamic Placeholders

MdClip は Raycast Dynamic Placeholders と同じ `{placeholder}` 形式の記法を使います。`Copy Expanded Content` は、元の Markdown file を変更せず、copy 結果だけを置換します。

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

Clipboard text を取得できた場合は、その text で `{clipboard}` を置換します。Clipboard に text がなく `Clipboard.readText()` が `undefined` を返した場合は、Raycast Dynamic Placeholders と同様に `{clipboard}` を削除して copy を続行します。

Clipboard text の読み取りが error になった場合、`Copy Expanded Content` は placeholder 展開を中止します。Clipboard への書き込みと success HUD は実行せず、既存の copy failure handler が Failure Toast を表示します。error は空の Clipboard text として扱いません。

Related replacement model: https://manual.raycast.com/dynamic-placeholders

MdClip の placeholder 展開は、上の表にある対応 placeholder について Raycast Dynamic Placeholders の置換方式に合わせて設計しています。

## 13. Error states

| 状態                                         | 表示                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| source disabled                              | 設定確認画面と `Open Extension Preferences`                                        |
| source folder unset                          | 設定確認画面と `Open Extension Preferences`                                        |
| configured path is not a directory           | 読み込み失敗画面と `Open Extension Preferences`                                    |
| no Markdown files                            | empty state、source folder を開く primary action、`Open Extension Preferences`     |
| partial load failure in All Markdown Sources | 読み込める files を表示し、失敗 source を `Could Not Load` section と Toast で表示 |
| clipboard read failure during expanded copy  | copy を開始せず、success HUD を表示せず、Failure Toast を表示                      |
| copy failure                                 | failure Toast                                                                      |

## 14. Security and data handling

MdClip は、利用者が有効化して設定した Markdown Source Folder 配下の Markdown files だけを読み取ります。

通常利用中に MdClip 自体が network request を行うことはありません。

Markdown content は、利用者が copy action を実行した場合だけ clipboard へ渡します。

`{clipboard}` は、Markdown 本文に `{clipboard}` が含まれる場合だけ現在 clipboard text を読み取ります。

MdClip は Markdown files を作成、編集、rename、移動、削除しません。Git 操作や cloud sync も行いません。

## 15. Implementation

| Area                      | 方針                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Framework                 | Raycast Extension, TypeScript, React, Raycast API                                                            |
| File traversal            | Node.js standard library                                                                                     |
| Placeholder replacement   | extension 内の明示的な置換処理                                                                               |
| Preferences type          | Raycast CLI が生成する `raycast-env.d.ts` を信頼する                                                         |
| Runtime source model      | `MarkdownSource*` と `MarkdownFile*`                                                                         |
| Compatibility migration   | 旧 identity 用 migration は追加しない                                                                        |
| Node.js toolchain         | `.node-version` に検証済みlatest LTSを正確に固定し、`engines.node` はRaycast APIのminimumを宣言する          |
| npm toolchain             | `packageManager` と `devEngines.packageManager` に検証済みexact versionを固定し、npm 11.17.0以上を必須にする |
| npm bootstrap             | repository外でconfigured registryからselected npmをscriptなしに導入してから最初のproject commandを実行する   |
| Toolchain freshness       | weekly read-only workflowでNode.js LTS、npm latest、Dependabot Core npm major compatibilityを確認する        |
| Dependency registry       | registry endpointは環境設定を使い、lockfileには`integrity`を保持してregistry固有`resolved` URLを記録しない   |
| Dependency install script | `allowScripts` で package name 単位に review し、未 review script は install error にする                    |

npm latestがDependabot Coreの対応majorを超える場合だけ、npm major selectionを明示的な互換性holdとして維持します。hold中も対応済みmajor内のlatestを別に検知し、minor/patch updateを止めません。Dependabot Coreのmain sourceは実装状況の根拠であり、GitHub hosted Dependabotへの配備を証明するものではありません。新しいnpm majorの採用完了には、clean CIとGitHub hosted Dependabotの実行結果が必要です。

`npm run update:dependencies` はapplication dependencyだけを更新し、Node.jsまたはnpmを変更しません。`npm run update:toolchain` は `.node-version`、`packageManager`、`devEngines.packageManager`、lockfile root metadataを一体で更新します。Node.js selectionが変わった場合、更新前のNode.js processで完了を宣言せず、新しいNode.jsとselected npmでbootstrapとverificationをやり直します。

dependency updateはconfigured registryから最新の公式Raycast migrationを取得し、更新前の`@raycast/api` versionに必要な変換を適用してからdirect dependency一覧を読み直します。direct dependencyはlatestを最初に試します。latestがstrict peer dependency resolutionで拒否された場合だけ、temporary project上で公開済みstable versionを新しい順に実際のnpm resolverへ渡し、成立する最も新しいversionを選びます。dependency候補の取得中はinstall scriptを実行せず、候補確定後のclean `npm ci`でlockfileのversionと`integrity`を使って依存関係を入れ直し、review済みscriptを実行します。保留したdependencyについては `npm explain --json` の構造化された依存経路とSemVer判定を使い、直接の阻害依存、各依存枝で最も近い推移阻害依存、さらに深い阻害依存の件数を表示します。npmのerror message文字列から互換rangeや依存経路を推測しません。

## 16. Project commands

| Command                            | 役割                                                                |
| ---------------------------------- | ------------------------------------------------------------------- |
| `npm run check`                    | `npm run lint` の既存 alias                                         |
| `npm run lint`                     | 開発・メンテナンス時の標準検証                                      |
| `npm run check:dependencies`       | dependency source、lockfile integrity、install script policy の検証 |
| `npm run check:dependency-updater` | peer dependency阻害情報の抽出・要約・表示のtest                     |
| `npm run check:toolchain`          | Node.js LTS、npm latest、Dependabot compatibilityのread-only検証    |
| `npm run check:type`               | TypeScript 型検査                                                   |
| `npm run check:lint`               | Raycast CLI を使わない source ESLint                                |
| `npm run check:format`             | managed files の format check                                       |
| `npm run check:local`              | Raycast アプリに依存しない repository 固有 verification             |
| `npm run lint:raycast`             | Raycast CLI lint                                                    |
| `npm run build`                    | Raycast build validation                                            |
| `npm run dev`                      | Raycast development mode                                            |
| `npm run demo:setup`               | demo Markdown Sources 作成                                          |
| `npm run demo:clean`               | demo Markdown Sources 削除                                          |
| `npm run sync:readme-media`        | `metadata/mdclip-1.png` から `media/mdclip-1.png` への media sync   |
| `npm run format`                   | managed files の write-format                                       |
| `npm run fix-lint`                 | source ESLint 自動修正と write-format                               |
| `npm run update:dependencies`      | latest 優先・peer-compatible fallback 付き dependency update        |
| `npm run update:toolchain`         | Node.js/npm selectionとlockfile root metadataの一体更新             |
| `npm run migrate`                  | latest公式Raycast API migration                                     |
| `npm run icon:generate`            | 確認用 icon 生成                                                    |

`npm run publish` は通常 npm script surface に置きません。

## 17. Verification

開発・メンテナンス時の標準検証:

```bash
npm run lint
```

toolchain freshness validation:

```bash
npm run check:toolchain
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

## 18. Documentation language contract

MdClip の public source-use documentation は英語をprimary languageとし、英語と日本語の対応文書を次のfamilyとして管理します。

| Family          | English canonical path    | Japanese sibling path        |
| --------------- | ------------------------- | ---------------------------- |
| README          | `README.md`               | `README.ja.md`               |
| Getting Started | `docs/getting-started.md` | `docs/getting-started.ja.md` |

宣言済みfamilyには次のcontractを適用します。

- 英語のcanonical documentはlanguage suffixを付けない。
- 日本語のsibling documentはlowercaseの`.ja.md` suffixを使う。日本語のlanguage tagは`ja`であり、country codeの`JP`をlanguage suffixとして使わない。
- `.en.md`のalias、`.jp.md`のalias、language選択専用page、locale directoryを追加しない。
- 各documentはH1直後に相互language linkを置く。英語側は`English | [日本語](...)`、日本語側は`[English](...) | 日本語`を使う。
- repository内の相互linkとpaired documentへの参照にはrelative pathを使う。
- English reader向けsurfaceは英語のGetting Started、日本語reader向けsurfaceは日本語のGetting Startedを参照する。

Getting Started の両言語は、必要環境、source code取得、dependency setup、Raycast起動、Markdown Source設定、動作確認、update、removal、completion checksの同じuser taskを扱います。見出し文言、段落数、行数、逐語訳の一致は要求せず、それぞれの言語で自然かつ正確な説明を使います。日本語の利用者向け文書では一般説明を自然な日本語で記述し、UIラベル、コマンド、パス、ファイル名、製品名、コード識別子は、利用者が実際の画面やターミナルと照合できる表記を使います。

`scripts/check-documentation-language-contract.mjs` は、`README.md`、`README.ja.md`、`docs/`、`raycast-publish/`、`.github/release-changelog/`を製品文書面として正方向に定義し、その中で宣言済みfamilyの存在、canonical path、H1直後の相互language link、paired documentを参照する全Markdown linkの登録とtargetを検査します。Git repositoryや個人環境のignore設定には依存せず、repository checkoutとGitHub Releaseのsource archiveで同じ対象を検査します。新しい製品文書面を追加する場合は、checkerの対象登録と検出testを同じ変更単位で更新します。正常、欠落、各製品文書directoryの旧pathによる迂回、面外のlocal Markdown、未登録参照、部分migration、recoveryは `scripts/check-documentation-language-contract.test.mjs` で検証し、`npm run check:docs`を`npm run lint`に含めます。

翻訳内容の意味や日本語の自然さは自動生成やclassifierで判定しません。利用者向けtaskを変更する場合は両言語を同じ変更単位で更新し、maintainerがtask coverage、日本語の一般説明、実際のUIラベルやコマンドとの一致をmanual reviewします。

`docs/local-verification.md`、`docs/release-management.md`、`docs/specification.md`、`docs/screenshot-media.md`は、英日対応のpublic user document familyではなく、用途と言語が固定されたspecialized maintainer documentです。これらに対応文書の新規作成やlanguage suffixを要求しません。ただし、paired documentへの参照は上記contractに従います。

Reference:

- W3C language tag guidance: https://www.w3.org/International/articles/language-tags/index.en
- W3C localized navigation guidance: https://www.w3.org/International/questions/qa-navigation-select
- GitHub relative link guidance: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes

## 19. Release path and Store publication prerequisites

Active public release unit は GitHub Release です。通常利用者の導入、更新、削除は、英語では `docs/getting-started.md`、日本語では `docs/getting-started.ja.md` を正とし、latest GitHub Release の `Source code (zip)` を取得します。

Release owner / maintainer の GitHub Release 管理は `docs/release-management.md` を正とします。Release manifest は `.github/release-manifest.json`、GitHub Release body は `.github/release-changelog/*.md` を使います。

Current UI evidence と README media は `docs/screenshot-media.md` を正とします。

Store publish を行う前に、product direction、workflow、script、secret、Store Version History、screenshots、README、docs、GitHub About metadata を一つの publication path として確認します。

`raycast-publish/` は Store publication resource set です。Store publish 用の README、Version History、screenshot 手順、背景説明をまとめます。Store publication 前の Store screenshot / metadata procedure は `raycast-publish/screenshots.md` を正とします。root `CHANGELOG.md` を source-use root に復帰する場合は、root surface の意味と README / GitHub Release / Store Version History の整合性を別途判断します。

## 20. Repository structure

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
│       ├── release.yml
│       └── toolchain-freshness.yml
├── .node-version
├── README.md
├── README.ja.md
├── docs
│   ├── assets
│   │   └── autumnal-peach.png
│   ├── getting-started.md
│   ├── getting-started.ja.md
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
│   ├── check-dependency-sources.mjs
│   ├── check-documentation-language-contract.mjs
│   ├── check-documentation-language-contract.test.mjs
│   ├── check-toolchain-freshness.mjs
│   ├── demo-markdown-sources.mjs
│   ├── format.mjs
│   ├── generate-icon.mjs
│   ├── local-verification.mjs
│   ├── publish-raycast-pr.mjs
│   ├── release-manifest.mjs
│   ├── setup-npm.mjs
│   ├── sync-readme-media.mjs
│   ├── toolchain.mjs
│   ├── update-dependencies.mjs
│   └── update-toolchain.mjs
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

| Path                         | Role                                                |
| ---------------------------- | --------------------------------------------------- |
| `README.md`                  | GitHub/source-use English README                    |
| `README.ja.md`               | GitHub/source-use Japanese README                   |
| `docs/getting-started.md`    | English user onboarding, update, and removal guide  |
| `docs/getting-started.ja.md` | Japanese user onboarding, update, and removal guide |
| `docs/local-verification.md` | Development and maintenance verification guide      |
| `docs/release-management.md` | Release owner / maintainer release operation guide  |
| `docs/screenshot-media.md`   | Current UI evidence and README/GitHub media guide   |
| `raycast-publish/`           | Store publication resource set                      |

Generated or local-only paths include:

```text
node_modules/
raycast-env.d.ts
dist/
local-verification/
demo/markdown-sources/
assets/icon.generated.png
```

## 21. Media and metadata

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

Store publish screenshot handling belongs to `raycast-publish/screenshots.md` and the Store publication prerequisites. Old Store-oriented screenshots and media are not current MdClip UI evidence.
