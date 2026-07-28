# MdClip 開発・メンテナンス検証

## 1. 目的

この文書は、MdClip の開発、修正、メンテナンス、release 準備で使う検証手順を定義します。

MdClip を利用するための導入、更新、削除手順は [使い始める手順](getting-started.ja.md) にまとめています。この文書では、repository checkout や source archive 上で変更確認、release 前確認、Raycast CLI 検証、手動 UI 確認を行う場合の確認範囲を扱います。

## 2. 検証方針

開発・メンテナンス時の標準検証は `npm run lint` を使います。

`npm run lint` は Raycast CLI の `ray lint` ではありません。TypeScript、source ESLint、Prettier check、リポジトリ固有の local verification をまとめて実行します。

Raycast CLI lint は `npm run lint:raycast` として明示的に分離します。これは manifest、metadata、icon など Raycast extension としての検証、および Raycast CLI 側の lint 挙動を確認したいときに実行します。

`ray lint --relaxed` は通常の MdClip ローカル検証ではありません。`--relaxed` は package schema、icons、metadata の検証を省く軽量 mode です。必要なときだけ `npm run lint:raycast -- --relaxed` のように明示して使います。

## 3. 初回セットアップ

リポジトリルートで次を実行します。

```bash
npm ci
```

`.node-version` に示されたNode.jsを使用します。このNode.js releaseには、MdClipのnpm minimumを満たすnpmが含まれています。MdClipはnpmのexact versionを独立して固定せず、global npmをインストール、更新、置換しません。`npm ci` は、初回セットアップ、`package-lock.json` 変更後、依存関係を入れ直す場合に実行します。

install-script policyのhardeningを含むnpm 11.17.0以上が必要です。`package.json` の `engines.npm` とproject `.npmrc` の `engine-strict=true` により、policy minimumを満たさないinstallを停止します。npmの特定patch versionは要求しません。[npm `engines`](https://docs.npmjs.com/cli/v12/configuring-npm/package-json/#engines) は対応範囲を宣言でき、[`engine-strict`](https://docs.npmjs.com/cli/v12/using-npm/config/#engine-strict) はengine不一致をinstall errorにします。

`.node-version` は検証対象のlatest stable Node.jsを示します。`engines.node` は現在のRaycast APIが要求するminimumを表し、`.node-version` のselected versionとは役割が異なります。現在のNode.js 26.5.0はnpm 11.17.0を同梱しており、追加のnpm setupなしでnpm minimumを満たします。[Node.js release index](https://nodejs.org/dist/index.json)

## 4. npm scripts

| Script                             | 実体                                                                            | 用途                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run check`                    | `npm run lint`                                                                  | 既存の一括確認名                                                    |
| `npm run lint`                     | dependency、release、documentation、type、format、local verification の順次実行 | 通常のローカル検証                                                  |
| `npm run check:dependencies`       | `node scripts/check-dependency-sources.mjs`                                     | dependency source、lockfile integrity、install script policy の確認 |
| `npm run check:dependency-updater` | `node --test scripts/peer-dependency-report.test.mjs`                           | peer dependency阻害情報の抽出・要約・表示を検査                     |
| `npm run check:release`            | `node --test scripts/release-manifest.test.mjs`                                 | GitHub Release body の構造契約を検査                                |
| `npm run check:docs`               | documentation language contract の test と repository 検査                      | 英日文書ペア、言語切替、canonical path、登録済み参照を検査          |
| `npm run check:toolchain`          | `node scripts/check-toolchain-freshness.mjs`                                    | latest stable Node.jsと同梱npmのminimum適合をread-only確認          |
| `npm run check:type`               | `tsc -p tsconfig.json --noEmit`                                                 | TypeScript 型検査                                                   |
| `npm run check:lint`               | `eslint src/**`                                                                 | Raycast CLI を使わない source lint                                  |
| `npm run check:format`             | `node scripts/format.mjs --check`                                               | 明示対象ファイルの整形差分確認                                      |
| `npm run check:local`              | `node scripts/local-verification.mjs`                                           | Raycast アプリに依存しないリポジトリ固有の確認                      |
| `npm run lint:raycast`             | `ray lint`                                                                      | 明示的な Raycast CLI lint                                           |
| `npm run build`                    | `ray build -e dist`                                                             | Raycast build 検証                                                  |
| `npm run dev`                      | `ray develop`                                                                   | Raycast development mode で起動                                     |
| `npm run demo:setup`               | `node scripts/demo-markdown-sources.mjs setup`                                  | ローカル確認用の demo Markdown Source folders を作成                |
| `npm run demo:clean`               | `node scripts/demo-markdown-sources.mjs clean`                                  | ローカル確認用の demo Markdown Source folders を削除                |
| `npm run format`                   | `node scripts/format.mjs --write`                                               | 明示対象ファイルの Prettier 整形                                    |
| `npm run fix-lint`                 | `eslint src/** --fix && npm run format`                                         | source ESLint 自動修正と write-format                               |
| `npm run update:dependencies`      | `node scripts/update-dependencies.mjs`                                          | latest優先でapplication dependencyを更新                            |
| `npm run update:toolchain`         | `node scripts/update-toolchain.mjs`                                             | `.node-version`をlatest stable Node.jsへ更新                        |
| `npm run migrate`                  | `npx --yes @raycast/migration@latest .`                                         | 最新の公式Raycast migrationによるAPI migration                      |
| `npm run icon:generate`            | `node scripts/generate-icon.mjs`                                                | 確認用 icon 生成                                                    |

`npm run format`、`npm run fix-lint`、`npm run migrate`、`npm run update:dependencies`、`npm run update:toolchain`、`npm run icon:generate`、`npm run demo:setup`、`npm run demo:clean` はファイルを書き換える可能性があります。目的が明確な場合だけ実行します。

`npm run update:dependencies` はNode.jsとnpmを変更しません。最初のpolicy検査後、実行環境のconfigured registryを使って最新の公式Raycast migrationを実行します。migrationは更新前のlockfileにある`@raycast/api` versionを基準に必要な変換を選び、`package.json`のdependencyを追加・削除する場合があるため、その完了後にdirect dependency一覧を読み直してから更新を始めます。install scriptを停止したまま現在のsemver範囲内を更新し、各direct dependencyの `latest` を試します。`latest` がpeer dependency条件を満たさない場合だけ、temporary project上で公開済みstable versionを新しい順に実際のnpm resolverへ渡し、成立する最も新しいversionを維持または選択します。候補確定後はclean `npm ci`でlockfileのversionと`integrity`を使って依存関係を入れ直し、review済みinstall scriptを実行してから通常検査へ進みます。保留時は `npm explain --json` とSemVer判定から、直接の阻害依存、各依存枝で最も近い推移阻害依存、さらに深い阻害依存の件数を表示します。完全な依存木は表示内の `npm explain <package>` で確認できます。npm error messageの文字列から互換rangeや依存経路を推測せず、peer overrideも許可しません。peer dependency以外の更新失敗は無視せずに処理を停止します。[Raycast migration](https://developers.raycast.com/misc/migration) は更新前のAPI versionから必要なmigrationを検出する仕組みと`@raycast/migration@latest`の直接実行を案内しています。[npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) はlockfileとmanifestの不一致時に停止し、lockfileを書き換えずにclean installします。

`npm run check:docs` は、`README.md`、`README.ja.md`、`docs/`、`raycast-publish/`、`.github/release-changelog/`を製品文書面として正方向に定義し、宣言済みの英日文書ペア、H1直後の相互言語link、canonical path、paired documentを参照する全Markdown linkをNode.js標準機能だけで検査します。Gitや個人環境のignore設定を必要としないため、repository checkoutとGitHub Releaseのsource archiveで同じ対象を検査します。翻訳文の意味や文章の一致は機械判定せず、導入、更新、削除、完了確認のtask coverageをmaintainerが両言語で確認します。

`npm run update:toolchain` はNode.js公式release indexにあるlatest stable Node.jsを確認し、`.node-version`だけを更新します。そのNode.jsに同梱されるnpmが`engines.npm`を満たさない場合は更新しません。selected Node.jsが変わった場合は更新前のNode.js processで完了扱いにせず、exit status 2で終了します。新しいNode.jsへ切り替え、`npm ci`、lint、Raycast lint、buildを実行した後に完了を判断します。

`npm run check:toolchain` はファイルを変更しません。Node.js公式release indexからlatest stable Node.jsとその同梱npmを確認し、`.node-version`の更新有無と`engines.npm`への適合を報告します。npm registryのlatestやDependabotの対応majorを独立したnpm選択条件にはしません。通常のlint/buildへnetwork freshnessを混ぜず、定期workflowと明示実行だけで使います。[Node.js release index](https://nodejs.org/dist/index.json)

project `.npmrc` は registry host や認証情報を固定せず、registry dependency の `resolved` URL を `package-lock.json` から省略し、peer dependency override を禁止し、必要な npm version と install-script review を厳格化します。local、CI、dependency update、toolchain、Store補助経路はそれぞれの実行環境のnpm registry設定を使い、lockfileのversionと`integrity`を共有します。[npm config の `omit-lockfile-registry-resolved`](https://docs.npmjs.com/cli/v11/using-npm/config/#omit-lockfile-registry-resolved) は、registry dependencyのtarball endpointを後続install時のregistry設定から解決する構成です。

dependency の install script は `package.json` の `allowScripts` で package name 単位に review します。`resolved` URL を省略する構成では npm が lockfile URL から信頼できる version identity を取得できないため、version 固定 entry は使いません。name-only entry は将来の同名 package version にも適用されるので、dependency update のたびに `package-lock.json` の `hasInstallScript` と `allowScripts` の完全一致を `npm run check:dependencies` で検査します。未 review の install script は `.npmrc` の `strict-allow-scripts=true` により install error にします。[npm の install-script approval](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/) は name-only entry が将来 version にも適用されることを説明し、[`strict-allow-scripts`](https://docs.npmjs.com/cli/v11/commands/npm-install/#strict-allow-scripts) は未 review script を hard error にします。

## 5. 通常の確認順

fresh checkout 直後、または `raycast-env.d.ts` が未生成の場合は、先に build を実行します。

```bash
npm run build
```

その後、通常のローカル検証を実行します。

```bash
npm run lint
```

Raycast 上の実操作を確認する場合は development mode を起動します。

```bash
npm run dev
```

`npm run build` は Raycast CLI による build 検証です。ローカルの Raycast extension 出力先や `raycast-env.d.ts` を作成または更新する可能性があります。

`npm run dev` は Raycast アプリに extension を import して起動します。Raycast アプリがインストールされ、development mode の extension を実行できる環境で使います。

## 6. `npm run lint` の確認内容

`npm run lint` は次を順に実行します。

1. `npm run check:dependencies`
2. `npm run check:dependency-updater`
3. `npm run check:release`
4. `npm run check:docs`
5. `npm run check:type`
6. `npm run check:lint`
7. `npm run check:format`
8. `npm run check:local`

この確認では、次を扱います。

- registry 固有の `resolved` URL、認証設定、workstation 固有 registry host が repository metadata に混入していないこと
- registry package の `integrity` metadata が維持されていること
- install script を持つ package と `allowScripts` の name-only policy が完全一致し、version pin や stale entry がないこと
- 未 review の install script が `npm ci` で hard error になる project 設定であること
- future GitHub Release body が利用者向け2-task契約を満たすこと
- README と Getting Started の英日pair、相互言語link、canonical path、全登録参照が一致すること
- TypeScript の型整合性
- `src` 配下の ESLint 結果
- `package.json` の format script で明示指定した管理対象ファイルの整形状態
- package manifest と command entry point の整合性
- Markdown Source preferences の構造
- Preview preferences の type、required、default、利用者向け description
- Raycast に依存しない Markdown file listing、preview、Dynamic Placeholders の動作

## 7. `npm run check:local` の確認内容

`npm run check:local` は `scripts/local-verification.mjs` を実行します。

この確認では、次を確認します。

- `package.json` の command 定義に対応する `src/*.tsx` entry point が存在すること
- Markdown Source preferences が期待する構造を持つこと
- Preview preferences が期待する type、required、default、利用者向け description を持つこと
- Preview preferences が前後空白を除去し、ASCII 数字だけの範囲内整数と先頭ゼロ付き整数を受理すること
- Preview preferences が未設定、空文字、`0`、負数、`+` 記号付き、小数、指数表記、数字以外を含む値、途中に空白がある値を既定値へ戻すこと
- Preview preferences が上限超過値と JavaScript の数値範囲を超える数字列を上限値へ丸めること
- `.md` file を大文字小文字を区別せずに再帰的に検出できること
- `.git`、`node_modules`、隠し directory、`.md` ではない file を除外できること
- 存在しない source root と directory ではなくなった source root を `source-unavailable` に分類できること
- root または配下で発生した `EACCES` と `EPERM` を `source-unreadable` に分類できること
- 配下で発生した `ENOENT` と `ENOTDIR`、およびその他の読み込み失敗を、root folder の消失と断定せず `source-read-failed` に分類できること
- source load failure が Node.js の生の error message を利用者向け結果として保持しないこと
- 横断検索で一部 source の読み込み失敗と成功分の Markdown files を分けて返せること
- 検索 field が file name を title、relative path とその directory segment および Markdown Source 表示名を keywords として返すこと
- 検索 keywords に absolute path と Markdown file content が含まれないこと
- preview が指定行数と最大文字数に従って冒頭 content と省略有無を返せること
- 行数または文字数の制限より後ろに content がある場合だけ preview を省略扱いにし、制限位置で終了する file、short file、empty file を省略扱いにしないこと
- CRLF を含む file でも preview content と省略有無を正しく判定できること
- `{date}`、`{time}`、`{datetime}`、`{day}`、`{timezone}`、`{now}`、`{uuid}`、`{clipboard}` を置換できること
- 複数の `{uuid}` を出現箇所ごとに別々の UUID へ置換できること
- `{clipboard}` を含まない Markdown 本文では clipboard を読み取らないこと
- clipboard text がない場合は `{clipboard}` を削除し、expanded content の copy と success HUD を完了できること
- clipboard text の読み取りが error になった場合は error を伝播し、Clipboard への書き込みと success HUD を実行しないこと
- `Copy Raw Content` は clipboard text を読み取らず、元の `{clipboard}` を変更せずに copy できること

この単体確認は `local-verification/local-verification-fixtures` と `local-verification/local-verification-dist` を作成または更新します。

## 8. Raycast CLI lint

Raycast CLI lint を確認する場合は、通常の `npm run lint` ではなく次を実行します。

```bash
npm run lint:raycast
```

この確認は、MdClip の通常ローカル検証とは別の Raycast CLI 検証です。Raycast Store publish を実行するものではありません。

軽量 mode が必要な場合は、明示的に次を実行します。

```bash
npm run lint:raycast -- --relaxed
```

`--relaxed` は schema、icons、metadata の検証を省きます。通常のローカル検証としては使いません。

## 9. GitHub Actions

`Build` workflow は、branch push、Pull Request、手動実行、または他 workflow からの呼び出しで実行されます。

現在の `Build` workflow は次を実行します。

1. `.node-version` のNode.js setup
2. `npm run check:dependencies`
3. `npm ci`
4. `npm run build`
5. `npm run lint`
6. `npm run lint:raycast`

Node.js selectionはworkflowへ重複記述せず、`.node-version` をsource of truthにします。npmはselected Node.jsに同梱されるversionを使い、`engines.npm`のminimumだけを要求します。すべての`setup-node` pathはnpm cacheを無効化し、external actionはfull commit SHAへ固定します。`Build`は実行環境のnpm registry設定を使い、通常CIとReleaseで共有する唯一のdependency installを担当します。Release metadata jobsはNode.js standard libraryだけを使うため`npm ci`を実行しません。Raycast Publishは`release-source/.node-version`をsetupしてから、script内部の`npm ci`とlatest公式CLIを取得する`npx`を実行します。

`Toolchain Freshness` workflowは毎週火曜日09:17（Asia/Tokyo）と手動実行時に `npm run check:toolchain` を実行します。GitHub Actionsのscheduled workflowは毎時0分付近に遅延しやすいため17分にずらし、通常buildやPull Requestを最新releaseの発生だけで失敗させないよう別workflowにしています。[GitHub Actions `schedule`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## 10. 手動確認

Raycast アプリ上では、以下を人間が操作して確認します。

- command 名が MdClip / Markdown Source model に見えること
- Extension Preferences が Markdown Source として理解できること
- Markdown files の一覧が表示されること
- Raw content copy が動作すること
- Expanded content copy で Dynamic Placeholders が展開されること
- Preview と editor 起動が期待通りに動くこと
- Preview detail metadata が上から `Markdown Source`、`Size`、`Updated`、`Full Path` の順で separator なしで表示され、`Relative Path` は metadata に重複表示されないこと
- relative parent path の一覧表示、relative path 検索、`Path (A-Z)` sort が維持されていること
- 設定済みの empty Markdown Source では個別 command からその folder を開けること
- すべての設定済み source が empty の場合、All Markdown Sources から source ごとの folder を区別して開けること
- 個別 command の source folder が利用不能な場合は `Could not load Markdown Source`、source 名、`folder is no longer available`、復旧方法、`Open Extension Preferences` が表示されること
- All Markdown Sources のすべての source を読み込めない場合は `Could not load Markdown Sources` と source ごとの利用者向け説明が表示されること
- All Markdown Sources の一部だけを読み込めない場合は、成功した files、失敗 source 名の Toast、`Could Not Load` section、`Folder is no longer available.` または `Some files could not be read.`、`Open Extension Preferences` が同時に確認できること
- source 読み込み失敗の表示に Node.js の error code、system call、stack trace、absolute path が含まれないこと
- 実際に省略された preview だけに省略案内が表示され、short file と empty file には表示されないこと
- 無効な source、未設定 folder、読み込み失敗時の状態が理解できること

Current MdClip screenshot / UI evidence を作成する場合は、共通手順である [Screenshot and UI Evidence Procedure](screenshot-media.md) を使います。これは Raycast GUI/manual work と manual visual checks を含むため、通常の `npm run lint` には含めません。Store 公開時だけ追加する確認は `raycast-publish/screenshots.md` が扱い、共通撮影手順を重複して定義しません。

## 11. Store 公開関連

Raycast Store 公開に関係する作業は、通常の MdClip ローカル検証ではありません。

現在の通常 npm script surface には、Store 公開用の `npm run publish` を置きません。

通常のローカル検証に含めないもの:

- Store 公開用 npm script の復帰
- `publish_to_raycast`
- Raycast Store 用 screenshot 作成
- Raycast Store Version History 用 `raycast-publish/CHANGELOG.md` の更新や publish source への反映
- Store-facing `raycast-publish/README.md` の更新や publish source への反映
- `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC`

Raycast Store 公開を行う場合は、先に `raycast-publish/publish.md` の Store publication prerequisites を完了してから、これらを扱います。

Current MdClip screenshot/media は Store 公開作業ではありません。ただし作成には Raycast GUI/manual capture と manual visual checks が必要です。
