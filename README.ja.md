# MdClip

MdClip は、ローカル Markdown ファイルを Raycast から探し、ファイル本文をコピーするための personal/local Raycast extension です。

この repository は public ですが、現在の利用経路は Raycast Store からの install ではありません。GitHub から source code を取得し、依存関係を入れて、Raycast development mode で使うことを通常経路とします。

![Raycast で Markdown Source の preview を表示している MdClip](media/mdclip-1.png)

## 何ができるか

MdClip は、Markdown ファイルそのものを source of truth として扱います。

- 再利用したい本文を通常の `.md` ファイルとして管理する
- それらのファイルを最大 3 つの Markdown Source に分ける
- Raycast から Markdown Source command を開き、検索、preview、copy を行う
- ファイル本文をそのままコピーするか、対応 placeholder をコピー時に展開してコピーする

MdClip は Markdown ファイルを新規作成、編集、移動、rename、削除しません。

## ソースコードから使う

基本の起動手順は次の通りです。

```bash
npm ci
npm run dev
```

`npm run dev` が起動したら、Raycast の extension preferences で少なくとも 1 つの Markdown Source Folder を設定します。

詳しい導入、更新、削除手順は [ソースコードから使う手順](docs/run-from-source.md) を参照してください。

## Commands

| Command              | 用途                                                        |
| -------------------- | ----------------------------------------------------------- |
| Markdown Source 1    | Markdown Source 1 の Markdown ファイルを表示                |
| Markdown Source 2    | Markdown Source 2 の Markdown ファイルを表示                |
| Markdown Source 3    | Markdown Source 3 の Markdown ファイルを表示                |
| All Markdown Sources | 有効なすべての Markdown Source から Markdown ファイルを検索 |

対象フォルダが決まっている場合は個別の Markdown Source command を使い、場所が曖昧な場合は All Markdown Sources を使います。

Raycast の Root Search では、この表や `package.json` の command 配列と異なる順序で command が表示されることがあります。MdClip の manifest では Markdown Source 1、2、3、All Markdown Sources の順で定義していますが、Root Search の結果は Raycast 側の ranking data によって並び替わります。表示順が気になる場合は、Raycast の Reset Ranking action を使ってください。参照: Raycast の [Search Bar manual](https://manual.raycast.com/search-bar) と [Manifest command properties](https://developers.raycast.com/information/manifest)。

## Preferences

利用前に、少なくとも 1 つの Markdown Source Folder を設定してください。

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

| Preference             | 必要性 | 説明                                                                      |
| ---------------------- | ------ | ------------------------------------------------------------------------- |
| Enable Markdown Source | 任意   | その source を個別 command と All Markdown Sources の対象に含めるかどうか |
| Markdown Source Folder | 必須   | その source が読み取る Markdown ファイルの folder                         |
| Markdown Source Name   | 任意   | Raycast 上の表示名。空の場合は folder 名を使う                            |
| Editor                 | 任意   | Open in Editor で使う editor                                              |
| Preview Line Count     | 任意   | preview に表示する冒頭行数。初期値は `10`                                 |
| Preview Max Characters | 任意   | preview に表示する最大文字数。初期値は `4000`                             |

## Actions

Markdown ファイルを選択した状態で、次の action を使えます。

| Action                | 説明                                                          |
| --------------------- | ------------------------------------------------------------- |
| Copy Raw Content      | Markdown ファイル本文を変更せずにそのままコピー               |
| Copy Expanded Content | 対応 placeholder を置換してから Markdown ファイル本文をコピー |
| Show/Hide Preview     | preview pane の表示を切り替える                               |
| Open in Editor        | 設定済み editor で選択中ファイルを開く                        |
| Open                  | editor 未設定時に既定アプリで選択中ファイルを開く             |
| Open with...          | 任意の対応アプリで選択中ファイルを開く                        |
| Show in Finder        | Finder で選択中ファイルを表示                                 |

既定 action は `Copy Raw Content` です。

## Dynamic Placeholders

`Copy Expanded Content` は、次の placeholder だけを置換します。元の Markdown ファイルは変更しません。

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

参照: [Raycast Dynamic Placeholders](https://manual.raycast.com/dynamic-placeholders)

## Markdown ファイルの扱い

MdClip は、拡張子 `.md` のファイルを大文字小文字を区別せずに再帰的に読み取ります。

次の path は一覧対象から除外します。

- `.git`
- `node_modules`
- 隠し directory
- 拡張子が `.md` ではない file

symbolic link は辿りません。

## ローカル検証

通常のローカル検証は次を使います。

```bash
npm run lint
```

Raycast CLI lint は別 command として残しています。

```bash
npm run lint:raycast
```

詳細は [ローカル検証](docs/local-verification.md) を参照してください。

## Release と Store の状態

現在の public release unit は GitHub Releases です。

Raycast Store publish は inactive です。Store publish command、Store screenshot、Store Version History は通常の source-use path には含めません。inactive な公開用 resource は将来の再検討に備えて [raycast-publish](raycast-publish/publish.md) にまとめ、現在の方針は [リリース管理](docs/release-management.md) に記載しています。

## データの扱い

MdClip は、利用者が有効化して設定した Markdown Source Folder 配下の Markdown ファイルだけを読み取ります。

Markdown 本文は、利用者が copy action を実行した場合だけ clipboard に渡します。現在の clipboard text は、`Copy Expanded Content` が `{clipboard}` を含む Markdown ファイルを処理する場合だけ読み取ります。

通常利用中に MdClip 自体が network request を行うことはありません。
