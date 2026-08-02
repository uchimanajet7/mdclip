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
| Preview Max Characters   | textfield |               no | `4000`  | Unicode code point 数による preview 上限。前後空白を除いた `1`〜`20000` の ASCII 数字による整数。無効値は `4000`、`20000` 超は `20000`    |

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

symbolic link は対応対象外であり、辿りません。設定された Markdown Source path の最後の entry 自体が symbolic link の場合は、その link が有効な directory を指していても、切れた link でも、その source を読み込みません。Markdown Source 配下の file または directory の symbolic link は列挙対象から除外します。

この判定対象は、設定された path の最後の entry と Markdown Source 配下です。設定 path より上位にある ancestor path component は判定対象にせず、OS が解決した先の最後の entry が実体 directory なら読み込みます。symbolic link を許可する preference は設けません。

## 8. List UI

一覧 item は、検索と選択に必要な情報を優先します。

- title: file name
- subtitle: Markdown Source Folder からの relative parent path がある場合だけ表示
- accessories: preview 非表示時に updated time と file size を表示

一覧検索には [Raycast List の標準 filtering](https://developers.raycast.com/api-reference/user-interface/list) を使います。`filtering={{ keepSectionOrder: false }}` を明示し、検索中の section 順を固定せず、Raycast が item ranking に基づいて section 順を変更できる状態を維持します。各 item の検索 field は command の検索範囲に応じて次のとおりです。

- title（すべての command）: file name
- keywords（すべての command）: Markdown Source Folder からの relative path、relative parent path の各 segment
- keywords（All Markdown Sources のみ）: 上記に加えて Markdown Source の表示名

個別の Markdown Source command では file name または relative path から file を探します。All Markdown Sources では、これらに加えて Markdown Source の表示名からも file を探します。

検索 bar の入力と、Raycast の filtering に渡す title および keywords は、比較前に Unicode NFC へ正規化します。これにより、同じ文字が composed form と decomposed form のどちらで保存または入力されても同じ検索結果になります。NFKC による compatibility character の同一化は行いません。正規化するのは検索用の文字列だけです。`file.path`、Markdown Source Folder からの relative path の保持値、item ID、および preview、open、copy、Finder 表示で参照する path は filesystem から取得した元の文字列を維持し、file や directory の名前を変更しません。読み込み失敗 item の title も同じ検索境界で NFC へ正規化します。

Markdown file content は検索対象にしません。一覧検索のために content を読み込まず、選択中 file の preview または copy action が必要とする場合だけ読み込みます。

preview 表示中は detail pane に情報を集約し、一覧側の過密表示を避けます。

All Markdown Sources では、Markdown Source ごとの section を維持します。検索文字が空の場合は、有効かつ設定済みの Markdown Sources の設定順で section を表示します。検索文字がある場合は、Raycast の item ranking に基づく section 順の変更を許可します。Markdown Source の番号と設定順は検索優先度を表しません。検索結果の各 file は、section 順が変わった場合も所属する Markdown Source の section 内に表示します。

読み込めない source がある場合は、読み込める source の files を表示し、失敗 source を `Could Not Load` section と Toast で通知します。Toast は読み込み失敗の発生と対象 source を通知し、`Could Not Load` section は継続確認と `Open Extension Preferences` による復旧操作を提供します。`Could Not Load` は filtering 前の構造では通常の Markdown Source sections の後に置きます。検索文字がある場合は、他の sections と同様に Raycast の filtering と ranking の対象となります。

## 9. Sort

検索バー右側の `Sort` dropdown で表示順を切り替えます。

| Sort                   | 説明                                                  |
| ---------------------- | ----------------------------------------------------- |
| Updated (Newest First) | 更新日時が新しい順。初期値                            |
| Updated (Oldest First) | 更新日時が古い順                                      |
| Name (A-Z)             | file name ascending                                   |
| Path (A-Z)             | Markdown Source Folder からの relative path ascending |

All Markdown Sources では、検索文字が空の場合に source section を設定順で維持し、section 内の files だけを sort します。検索文字がある場合も、MdClip は選択した Sort に従う file 順で各 section を Raycast List へ渡します。section 順は Sort の対象にせず、Raycast の filtering と item ranking に基づく変更を許可します。

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

preview は `Preview Line Count` と `Preview Max Characters` のうち先に到達する制限に従って切り詰めます。`Preview Max Characters` は JavaScript の UTF-16 code unit 数ではなく Unicode code point 数による上限です。上限位置が Unicode extended grapheme cluster の途中にある場合は、その cluster 全体を表示対象から外し、直前の cluster boundary で終了します。cluster を完成させるために上限を超えて content を追加しないため、実際の表示文字数が設定値より少なくなる場合があります。boundary 判定には標準の `Intl.Segmenter` の `grapheme` granularity を使い、独自の Unicode 分割規則や追加 package は使いません。[Unicode UAX #29](https://www.unicode.org/reports/tr29/) [ECMA-402 `Intl.Segmenter`](https://tc39.es/ecma402/#intl-segmenter-objects)

preview 読み込みは、正規化後の行制限超過または code point 上限超過を確認できた時点で停止します。1 code point は UTF-8 で最大 4 bytes なので、最大設定値 `20000` でも code point 上限に必要な入力は最大約 80000 bytes と、境界確認に使う既存の 4096-byte read chunk に制限されます。長い combining sequence や ZWJ sequence が上限をまたぐ場合も、file 全体を読み続けず、その cluster を分割表示しません。

各設定値は前後の空白を除き、残った文字列全体が ASCII 数字 `[0-9]+` だけで構成される場合に整数として扱います。範囲内ならその値を使い、上限を超える場合は上限値を使います。JavaScript の数値範囲を超える長い数字列も上限値を使います。

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

設定済み source に Markdown files がない場合、個別 command は `Open Markdown Source Folder` を primary action とします。All Markdown Sources は source ごとに `Open <Source Name> Folder` を表示します。folder の設定先を変更する場合に備えて、`Open Extension Preferences` も secondary action として表示します。source disabled、source folder unset、または configured source folder を読み込めない場合は folder を開く action を表示せず、`Open Extension Preferences` を復旧経路とします。

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

| 状態                                                | 表示                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| source disabled                                     | 設定確認画面と `Open Extension Preferences`                                                |
| source folder unset                                 | 設定確認画面と `Open Extension Preferences`                                                |
| configured source path is a symbolic link           | symbolic link が非対応であること、実体 folder の選択、`Open Extension Preferences`         |
| configured source folder is unavailable             | source 名、folder が利用不能であること、復旧方法、`Open Extension Preferences`             |
| configured source folder or its contents unreadable | source 名、すべての files を読み取れないこと、復旧方法、`Open Extension Preferences`       |
| source contents changed or another read failure     | source 名、すべての files を読み取れなかったこと、再確認方法、`Open Extension Preferences` |
| no Markdown files                                   | empty state、source folder を開く primary action、`Open Extension Preferences`             |
| partial load failure in All Markdown Sources        | 読み込める files を表示し、失敗 source を `Could Not Load` section と Toast で表示         |
| clipboard read failure during expanded copy         | copy を開始せず、success HUD を表示せず、Failure Toast を表示                              |
| copy failure                                        | failure Toast                                                                              |

個別の Markdown Source command ですべての files を読み込めない場合は、`Could not load Markdown Source` を表示します。All Markdown Sources ですべての source を読み込めない場合は、`Could not load Markdown Sources` を表示します。

利用者向けの読み込み失敗表示には、Markdown Source の表示名、利用者が理解できる失敗状態、実行可能な復旧方法だけを含めます。Node.js の system error message、error code、system call、stack trace、absolute path は表示しません。

設定された source path の最後の entry 自体が symbolic link の場合は、link target の状態にかかわらず `Symbolic links are not supported. Select the original folder.` と表示します。切れた symbolic link も、単なる folder 消失ではなく同じ symbolic link 非対応状態として扱います。

ルートの configured source path が存在しない、directory ではなくなった、またはルートの directory scan 中に失われた場合は、source folder が利用不能であると表示します。通常の preferences 操作では `directory` picker が file の選択を防ぐため、`not a directory` を独立した利用者向け状態にはしません。

ルートまたは配下の読み込みで `EACCES` または `EPERM` が発生した場合は、source folder 内のすべての files を読み取れないことと、folder permissions の確認または別の folder の選択を案内します。

ルート以外の走査対象で `ENOENT` または `ENOTDIR` が発生した場合は、ルート folder が失われたとは断定しません。source folder 内のすべての files を読み取れなかったことと、folder の確認後に command を開き直すことを案内します。その他の予期しない source 読み込み失敗も同じ一般的な読み込み失敗として扱います。

部分失敗時の `Could Not Load` row は source の表示名を title とし、subtitle は `Symbolic links are not supported.`、`Folder is no longer available.`、または `Some files could not be read.` とします。Toast は失敗した source の表示名だけを通知し、読み込めた source の files はそのまま利用できます。

## 14. Security and data handling

MdClip は、利用者が有効化して設定した Markdown Source Folder 配下の Markdown files だけを読み取ります。

通常利用中に MdClip 自体が network request を行うことはありません。

Markdown content は、利用者が copy action を実行した場合だけ clipboard へ渡します。

`{clipboard}` は、Markdown 本文に `{clipboard}` が含まれる場合だけ現在 clipboard text を読み取ります。

MdClip は Markdown files を作成、編集、rename、移動、削除しません。Git 操作や cloud sync も行いません。

## 15. Implementation

| Area                      | 方針                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Framework                 | Raycast Extension, TypeScript, React, Raycast API                                                           |
| File traversal            | Node.js standard library                                                                                    |
| Placeholder replacement   | extension 内の明示的な置換処理                                                                              |
| Preferences type          | Raycast CLI が生成する `raycast-env.d.ts` を信頼する                                                        |
| Runtime source model      | `MarkdownSource*` と `MarkdownFile*`                                                                        |
| Compatibility migration   | 旧 identity 用 migration は追加しない                                                                       |
| Node.js toolchain         | `engines.node`で対応minimumを宣言し、`.node-version`はCIとrelease sourceで検証する選択値として分離する      |
| npm toolchain             | 実行環境のnpmを使い、`engines.npm`にはinstall-script policyに必要なminimumだけを宣言する                    |
| npm environment           | npmのexact versionを独立して固定せず、MdClipからglobal npmをインストール、更新、置換しない                  |
| Toolchain maintenance     | dependency maintenanceは`engines`範囲だけを前提とし、Node.js選定や`.node-version`更新とは分離する           |
| Dependency registry       | registry endpointは環境設定を使い、lockfileには`integrity`を保持してregistry固有`resolved` URLを記録しない  |
| Dependency install script | `allowScripts` で package name 単位に review し、未 review script は install error にする                   |
| Dependency updates        | non-major grouped候補、major個別判断、Raycast型契約同期、npm解決、後条件、clean install、完全検証を接続する |

application dependencyとGitHub Actionsの定期更新候補は `.github/dependabot.yml` のweekly Dependabot version updatesが提示します。npm patch/minor updatesは一つのgrouped Pull Requestにまとめ、major updatesはdependencyごとの個別Pull Requestとして明示的なmaintainer decisionに残します。Raycast拡張runtimeと結合する`@types/node`はregistry latestへの単独更新から除外し、`@raycast/api`のexact contractと同じ更新単位で扱います。最終的な互換性と採用判断はmaintainerが担当し、自動merge、自動publish、自動releaseを行いません。

`npm run update:dependencies` は、Raycast migration、direct・transitive dependency、manifest、lockfile、clean install、verificationを一つのlocal maintenance operationとして実行します。このcommandはGitのclean/dirty状態に依存せず、Git statusの検査、commit、stash、reset、restoreを行いません。

最初に実行中のNode.jsとnpmが`package.json`の`engines.node`と`engines.npm`を満たすことを確認します。exact version、LTS line、`.node-version`との一致は要求しません。このcommandはNode.jsの選定、install、切り替え、`.node-version`の更新、global npmの変更を行いません。

続いて、旧update pathが残した修復可能なdirect dependency下限のdriftだけを許可してdependency policyを検査し、現在のlockfileによるclean installを確認します。その他のpolicy違反やclean install不成立は許可しません。dependency rangeを変更する前にlatest公式Raycast migrationを実行し、`npm outdated --json --long`でdirect dependencyの`current`、declared range内の`wanted`、registryの`latest`を記録します。npmはinstall scriptを停止した `npm update --save` でdirect・transitive dependencyを更新・解決し、解決したdirect versionをmanifestとlockfileへ保存します。`strict-peer-deps=true`で不成立の組み合わせを拒否し、installed peer versionによる独自の事前filterは行いません。

root manifestは、MdClipのTypeScript入力が直接使用する`@types/node`と`@types/react`を`devDependencies`として所有します。`@types/node`は解決済み`@raycast/api`がdependencyとoptional peerの両方で宣言する同一のexact versionへ同期し、単独のregistry latest更新は行いません。`@types/react`はroot Reactと同じmajor/minorのcaret rangeで更新します。`csstype`は`@types/react`のtransitive dependencyとして解決し、direct dependencyやoverrideを追加しません。[Raycast changelog 1.46.0](https://developers.raycast.com/misc/changelog#1460---2023-01-18) はNode/React typeをoptional API peer dependenciesとtemplate `devDependencies`へ戻した現在の方針を記録しています。

`@types/node`の同期でmanifestが変わった場合だけ、install scriptを停止した`npm install`を一度実行してlockfileとinstall treeを再解決します。その後、direct dependencyのmanifest下限とresolved versionの一致、処理前からのresolved downgradeがないこと、declared range内に未適用の`wanted`がないことを検査します。`@types/node`のregistry latestとの差はRaycast runtime contractとして別表示し、それ以外のrange外latestだけをmaintainer decisionとして表示します。

候補確定後は、各direct dependencyのmanifest下限とlockfile resolved versionが一致すること、`current`と`wanted`が一致してdeclared range内の未適用更新がないことを機械検査します。`wanted`と`latest`が異なるmajor等は成功表示へ混ぜず、`Maintainer decision required`としてdependency名とversion差を表示します。その後にdependency policy、clean `npm ci`、通常lint、Raycast build、Raycast lintを同じNode.js processで順番に実行します。`npm ci`はmanifestやlockfileを更新しないため、更新処理ではなく凍結された最終状態の再現性検証として扱います。

失敗時はその場で停止し、peer dependency override、強制適用、独自のolder-compatible version探索、自動復元を行いません。既存の未コミット変更と更新途中の変更が同じworking treeに残る場合があるため、maintainerはcommand output、現在のGit diff、migration差分、resolver output、release notesを確認し、変更単位で次の対応を決定します。command自体は変更をstash、commit、reset、restore、破棄しません。runtime dependencyまたはmigrationによるsource変更がある場合だけ、Raycast development modeでprimary user taskを手動確認します。development toolingだけの更新では利用者向け動作に変化がなければGUI確認を必須にしません。

## 16. Project commands

| Command                       | 役割                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `npm run check`               | `npm run lint` の既存 alias                                                     |
| `npm run lint`                | 開発・メンテナンス時の標準検証                                                  |
| `npm run check:dependencies`  | updater regression、manifest/lockfile後条件、dependency policy検証              |
| `npm run check:type`          | TypeScript 型検査                                                               |
| `npm run check:lint`          | Raycast CLI を使わない source ESLint                                            |
| `npm run check:format`        | managed files の format check                                                   |
| `npm run check:local`         | Raycast アプリに依存しない repository 固有 verification                         |
| `npm run lint:raycast`        | Raycast CLI lint                                                                |
| `npm run build`               | Raycast build validation                                                        |
| `npm run dev`                 | Raycast development mode                                                        |
| `npm run demo:setup`          | demo Markdown Sources 作成                                                      |
| `npm run demo:clean`          | demo Markdown Sources 削除                                                      |
| `npm run sync:readme-media`   | `metadata/mdclip-1.png` から `media/mdclip-1.png` への media sync               |
| `npm run format`              | managed files の write-format                                                   |
| `npm run fix-lint`            | source ESLint 自動修正と write-format                                           |
| `npm run update:dependencies` | declared-range更新、Raycast型契約同期、range外判断表示、clean install、完全検証 |
| `npm run migrate`             | latest公式Raycast API migration                                                 |
| `npm run icon:generate`       | 確認用 icon 生成                                                                |

`npm run publish` は通常 npm script surface に置きません。

## 17. Verification

開発・メンテナンス時の標準検証:

```bash
npm run lint
```

dependency and toolchain maintenance:

```bash
npm run update:dependencies
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

manual UI verification では、command names、preferences、list behavior、copy actions、preview、editor actions、error states が MdClip / Markdown Source model と一致することを確認します。current screenshot / UI evidence と README media の確認は、共通手順である `docs/screenshot-media.md` の `MdClip Screenshot and UI Evidence Procedure` に従います。

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

README と Getting Started の両言語では、具体的な操作手順より前に、Raycast Store 経由ではないローカル拡張機能であること、GitHub Release のソースコードから導入すること、初回導入では Node.js とターミナルを使用すること、更新は新しい Release から手動で行うことを簡潔に示します。詳細手順は Getting Started に集約し、GitHub Release body は Release 固有の利用者操作だけを扱い、Store 公開用の内部情報は利用者向け導入説明に混在させません。

Release owner / maintainer の GitHub Release 管理は `docs/release-management.md` を正とします。Release manifest は `.github/release-manifest.json`、GitHub Release body は `.github/release-changelog/*.md` を使います。

README、GitHub、GitHub Release、Store で共有する current screenshot / UI evidence の作成、同期、検証は `docs/screenshot-media.md` を唯一の共通手順とします。Source display name は configured value または folder-derived fallback のどちらも有効であり、screenshot acceptance では固定した example name を要求しません。

Store publish を行う前に、product direction、workflow、script、secret、Store Version History、screenshots、README、docs、GitHub About metadata を一つの publication path として確認します。

`raycast-publish/` は Store publication resource set です。Store publish 用の README、Version History、Store 固有 screenshot checklist、背景説明をまとめます。`raycast-publish/screenshots.md` は `docs/screenshot-media.md` の共通手順を参照し、Store 固有の枚数、publication resource、Pull Request review evidence だけを追加確認します。root `CHANGELOG.md` を source-use root に復帰する場合は、root surface の意味と README / GitHub Release / Store Version History の整合性を別途判断します。

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
│       └── release.yml
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
│   ├── dependency-maintenance.test.mjs
│   ├── demo-markdown-sources.mjs
│   ├── format.mjs
│   ├── generate-icon.mjs
│   ├── local-verification.mjs
│   ├── publish-raycast-pr.mjs
│   ├── release-manifest.mjs
│   ├── release-manifest.test.mjs
│   ├── sync-readme-media.mjs
│   ├── toolchain.mjs
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

| Path                         | Role                                                |
| ---------------------------- | --------------------------------------------------- |
| `README.md`                  | GitHub/source-use English README                    |
| `README.ja.md`               | GitHub/source-use Japanese README                   |
| `docs/getting-started.md`    | English user onboarding, update, and removal guide  |
| `docs/getting-started.ja.md` | Japanese user onboarding, update, and removal guide |
| `docs/local-verification.md` | Development and maintenance verification guide      |
| `docs/release-management.md` | Release owner / maintainer release operation guide  |
| `docs/screenshot-media.md`   | Canonical screenshot and UI evidence procedure      |
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

Shared screenshot creation, current UI evidence verification, and README media handling are defined only in `docs/screenshot-media.md`.

The active current-evidence paths are:

| Path                             | Role                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| `docs/assets/autumnal-peach.png` | Reusable Window Capture background                                 |
| `metadata/mdclip-1.png`          | Current MdClip screenshot 1, created by Raycast GUI/manual capture |
| `metadata/mdclip-2.png`          | Current MdClip screenshot 2, created by Raycast GUI/manual capture |
| `metadata/mdclip-3.png`          | Current MdClip screenshot 3, created by Raycast GUI/manual capture |
| `media/mdclip-1.png`             | README/GitHub media copied from `metadata/mdclip-1.png`            |

`scripts/sync-readme-media.mjs` copies `metadata/mdclip-1.png` to `media/mdclip-1.png`. It must not recreate old `local-copy-blocks` media.

Store publish uses the accepted shared screenshots. `raycast-publish/screenshots.md` adds only the current Store-specific requirements and Pull Request review checks; it does not redefine the common capture procedure. Old Store-oriented screenshots and media are not current MdClip UI evidence.
