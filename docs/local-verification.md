# MdClip ローカル検証

## 1. 目的

この文書は、MdClip をローカルで開発、修正、確認するための検証手順を定義します。

MdClip の通常経路は、GitHub の source checkout または ZIP から依存関係を入れ、Raycast development mode で使うことです。Raycast Store publish、Store screenshot 作成、Store publish 用 Pull Request 作成は通常経路ではありません。

## 2. 検証方針

通常のローカル検証は `npm run lint` を使います。

`npm run lint` は Raycast CLI の `ray lint` ではありません。TypeScript、source ESLint、Prettier check、リポジトリ固有の local verification をまとめて実行します。

Raycast CLI lint は `npm run lint:raycast` として明示的に分離します。これは manifest、metadata、icon など Raycast extension としての検証、および Raycast CLI 側の lint 挙動を確認したいときに実行します。

`ray lint --relaxed` は通常の MdClip ローカル検証ではありません。`--relaxed` は package schema、icons、metadata の検証を省く軽量 mode です。必要なときだけ `npm run lint:raycast -- --relaxed` のように明示して使います。

## 3. 初回セットアップ

リポジトリルートで次を実行します。

```bash
npm ci
```

`npm ci` は、初回セットアップ、`package-lock.json` 変更後、依存関係を入れ直す場合に実行します。

## 4. npm scripts

| Script                        | 実体                                                                                      | 用途                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `npm run check`               | `npm run lint`                                                                            | 既存の一括確認名                                     |
| `npm run lint`                | `npm run check:type && npm run check:lint && npm run check:format && npm run check:local` | 通常のローカル検証                                   |
| `npm run check:type`          | `tsc -p tsconfig.json --noEmit`                                                           | TypeScript 型検査                                    |
| `npm run check:lint`          | `eslint src/**`                                                                           | Raycast CLI を使わない source lint                   |
| `npm run check:format`        | `node scripts/format.mjs --check`                                                         | 明示対象ファイルの整形差分確認                       |
| `npm run check:local`         | `node scripts/local-verification.mjs`                                                     | Raycast アプリに依存しないリポジトリ固有の確認       |
| `npm run lint:raycast`        | `ray lint`                                                                                | 明示的な Raycast CLI lint                            |
| `npm run build`               | `ray build -e dist`                                                                       | Raycast build 検証                                   |
| `npm run dev`                 | `ray develop`                                                                             | Raycast development mode で起動                      |
| `npm run demo:setup`          | `node scripts/demo-markdown-sources.mjs setup`                                            | ローカル確認用の demo Markdown Source folders を作成 |
| `npm run demo:clean`          | `node scripts/demo-markdown-sources.mjs clean`                                            | ローカル確認用の demo Markdown Source folders を削除 |
| `npm run format`              | `node scripts/format.mjs --write`                                                         | 明示対象ファイルの Prettier 整形                     |
| `npm run fix-lint`            | `eslint src/** --fix && npm run format`                                                   | source ESLint 自動修正と write-format                |
| `npm run update:dependencies` | `node scripts/update-dependencies.mjs`                                                    | 依存 package と Raycast API の一括更新               |
| `npm run migrate`             | `npx --yes @raycast/migration@latest .`                                                   | Raycast API 更新時の migration                       |
| `npm run icon:generate`       | `node scripts/generate-icon.mjs`                                                          | 確認用 icon 生成                                     |

`npm run format`、`npm run fix-lint`、`npm run migrate`、`npm run update:dependencies`、`npm run icon:generate`、`npm run demo:setup`、`npm run demo:clean` はファイルを書き換える可能性があります。目的が明確な場合だけ実行します。

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

1. `npm run check:type`
2. `npm run check:lint`
3. `npm run check:format`
4. `npm run check:local`

この確認では、次を扱います。

- TypeScript の型整合性
- `src` 配下の ESLint 結果
- `package.json` の format script で明示指定した管理対象ファイルの整形状態
- package manifest と command entry point の整合性
- Markdown Source preferences の構造
- Preview preferences の構造
- Raycast に依存しない Markdown file listing、preview、Dynamic Placeholders の動作

## 7. `npm run check:local` の確認内容

`npm run check:local` は `scripts/local-verification.mjs` を実行します。

この確認では、次を確認します。

- `package.json` の command 定義に対応する `src/*.tsx` entry point が存在すること
- Markdown Source preferences が期待する構造を持つこと
- Preview preferences が期待する構造を持つこと
- `.md` file を大文字小文字を区別せずに再帰的に検出できること
- `.git`、`node_modules`、隠し directory、`.md` ではない file を除外できること
- directory ではない path を error にできること
- 横断検索で一部 source の読み込み失敗と成功分の Markdown files を分けて返せること
- preview が指定行数と最大文字数に従って冒頭 preview を返せること
- `{date}`、`{time}`、`{datetime}`、`{day}`、`{timezone}`、`{now}`、`{uuid}`、`{clipboard}` を置換できること
- 複数の `{uuid}` を出現箇所ごとに別々の UUID へ置換できること
- `{clipboard}` を含まない Markdown 本文では clipboard を読み取らないこと

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

1. `npm ci`
2. `npm run build`
3. `npm run lint`
4. `npm run lint:raycast`

CI 上でも、通常のローカル検証と Raycast CLI lint は別 step として扱います。

## 10. 手動確認

Raycast アプリ上では、以下を人間が操作して確認します。

- command 名が MdClip / Markdown Source model に見えること
- Extension Preferences が Markdown Source として理解できること
- Markdown files の一覧が表示されること
- Raw content copy が動作すること
- Expanded content copy で Dynamic Placeholders が展開されること
- Preview と editor 起動が期待通りに動くこと
- 無効な source、未設定 folder、読み込み失敗時の状態が理解できること

Current MdClip UI evidence を作成する場合は、[Screenshot and Media Procedure](screenshot-media.md) を使います。これは Raycast GUI/manual work と user review を含むため、通常の `npm run lint` には含めません。

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

これらは、Raycast Store 公開を再開する明示承認がある場合だけ扱います。Store publish resource の背景と手順は `raycast-publish/publish.md` を正とします。

Current MdClip screenshot/media は Store 公開作業ではありません。ただし作成には Raycast GUI/manual capture と user review が必要です。
