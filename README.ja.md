# MdClip

[English](README.md) | 日本語

MdClip は、ローカルの Markdown ファイルを Raycast から探し、ファイル本文をコピーするための個人利用向けのローカル Raycast 拡張機能です。

再利用したい本文を Markdown ファイルとして管理し、Raycast から検索、プレビュー、コピーしたいときに使います。まずは下の「使い始める」から、ローカルで起動する手順に進んでください。

![Raycast で Markdown Source のプレビューを表示している MdClip](media/mdclip-1.png)

## 何ができるか

MdClip は、Markdown ファイルそのものを情報の正本として扱います。

- 再利用したい本文を通常の `.md` ファイルとして管理する
- それらのファイルを最大 3 つの Markdown Source に分ける
- Raycast から Markdown Source コマンドを開き、検索、プレビュー、コピーを行う
- ファイル本文をそのままコピーするか、対応するプレースホルダーをコピー時に展開してコピーする

MdClip は Markdown ファイルを新規作成、編集、移動、名前変更、削除しません。

## 使い始める

通常利用では、[最新の GitHub Release](https://github.com/uchimanajet7/mdclip/releases/latest) から `Source code (zip)` を取得します。取得するソースアーカイブは、最新のリリースタグに紐づくソースです。

```bash
node scripts/setup-npm.mjs
npm ci
npm run dev
```

セットアップスクリプトは、`package.json` で選択した正確な npm バージョンを有効にします。現在の npm と異なる場合は、選択中の Node.js 環境に属するグローバル npm を更新します。リポジトリの `.node-version` には、検証対象の Node.js LTS バージョンを記録しています。

`npm run dev` が起動したら、Raycast の拡張機能設定で少なくとも 1 つの Markdown Source Folder を設定します。

詳しい導入、更新、削除手順は [使い始める手順](docs/getting-started.ja.md) を参照してください。

## コマンド

| コマンド             | 用途                                                        |
| -------------------- | ----------------------------------------------------------- |
| Markdown Source 1    | Markdown Source 1 の Markdown ファイルを表示                |
| Markdown Source 2    | Markdown Source 2 の Markdown ファイルを表示                |
| Markdown Source 3    | Markdown Source 3 の Markdown ファイルを表示                |
| All Markdown Sources | 有効なすべての Markdown Source から Markdown ファイルを検索 |

対象フォルダが決まっている場合は個別の Markdown Source コマンドを使い、場所が曖昧な場合は All Markdown Sources を使います。

Raycast の Root Search では、この表や `package.json` のコマンド配列と異なる順序でコマンドが表示されることがあります。MdClip のマニフェストでは Markdown Source 1、2、3、All Markdown Sources の順で定義していますが、Root Search の結果は Raycast 側のランキングデータによって並び替わります。表示順が気になる場合は、Raycast の Reset Ranking アクションを使ってください。参照: Raycast の [Search Bar manual](https://manual.raycast.com/search-bar) と [Manifest command properties](https://developers.raycast.com/information/manifest)。

## 設定

利用前に、有効な Markdown Source Folder を少なくとも 1 つ設定してください。Raycast の設定では各フォルダは個別に任意なので、使わない Markdown Source は空のままで構いません。

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

| 設定項目               | 必要性 | 説明                                                                                                                                             |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Enable Markdown Source | 任意   | その Markdown Source を個別コマンドと All Markdown Sources の対象に含めるかどうか                                                                |
| Markdown Source Folder | 任意   | その Markdown Source が読み取る Markdown ファイルのフォルダ。利用には、有効な Markdown Source のフォルダが少なくとも 1 つ必要                    |
| Markdown Source Name   | 任意   | MdClip 内の一覧、セクション、メタデータで使う Markdown Source の表示名。Raycast Root Search のコマンド名は変わらない。空の場合はフォルダ名を使う |
| Editor                 | 任意   | Open in Editor で使うエディタ                                                                                                                    |
| Preview Line Count     | 任意   | プレビューに表示する冒頭行数。初期値は `10`、上限は `100`。正の整数として読めない値は初期値を使う                                                |
| Preview Max Characters | 任意   | プレビューに表示する最大文字数。初期値は `4000`、上限は `20000`。正の整数として読めない値は初期値を使う                                          |

## アクション

Markdown ファイルを選択した状態で、次のアクションを使えます。

| アクション            | 説明                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| Copy Raw Content      | Markdown ファイル本文を変更せずにそのままコピー                      |
| Copy Expanded Content | 対応するプレースホルダーを置換してから Markdown ファイル本文をコピー |
| Show/Hide Preview     | プレビューペインの表示を切り替える                                   |
| Open in Editor        | 設定済みのエディタで選択中ファイルを開く                             |
| Open                  | エディタ未設定時に既定アプリで選択中ファイルを開く                   |
| Open with...          | 任意の対応アプリで選択中ファイルを開く                               |
| Show in Finder        | Finder で選択中ファイルを表示                                        |

既定のアクションは `Copy Raw Content` です。

## Dynamic Placeholders

MdClip は Raycast Dynamic Placeholders と同じ `{placeholder}` 形式の書き方を使います。`Copy Expanded Content` は、次の MdClip 対応プレースホルダーだけを置換します。元の Markdown ファイルは変更しません。

| プレースホルダー | 置換内容                                          |
| ---------------- | ------------------------------------------------- |
| `{date}`         | 実行環境のロケールに基づく現在日付                |
| `{time}`         | 実行環境のロケールに基づく現在時刻                |
| `{datetime}`     | 実行環境のロケールに基づく現在日時                |
| `{day}`          | 実行環境のロケールに基づく曜日                    |
| `{timezone}`     | `Asia/Tokyo UTC+09:00` のような現在のタイムゾーン |
| `{now}`          | 現在日時とタイムゾーン                            |
| `{uuid}`         | 出現箇所ごとに個別生成する UUID                   |
| `{clipboard}`    | 現在のクリップボードのテキスト                    |

関連する置換方式: [Raycast Dynamic Placeholders](https://manual.raycast.com/dynamic-placeholders)

MdClip のプレースホルダー展開は、上の表にある対応プレースホルダーについて Raycast Dynamic Placeholders の置換方式に合わせて設計しています。

## Markdown ファイルの扱い

MdClip は、拡張子 `.md` のファイルを大文字小文字を区別せずに再帰的に読み取ります。

次のパスは一覧対象から除外します。

- `.git`
- `node_modules`
- 隠しディレクトリ
- 拡張子が `.md` ではないファイル

シンボリックリンクは辿りません。

## データの扱い

MdClip は、利用者が有効化して設定した Markdown Source Folder 配下の Markdown ファイルだけを読み取ります。

Markdown 本文は、利用者がコピーアクションを実行した場合だけクリップボードに渡します。現在のクリップボードのテキストは、`Copy Expanded Content` が `{clipboard}` を含む Markdown ファイルを処理する場合だけ読み取ります。

通常利用中に MdClip 自体がネットワークリクエストを行うことはありません。

## 開発とメンテナンス

- [開発・メンテナンス検証](docs/local-verification.md)
- [メンテナー向けリリース管理](docs/release-management.md)
