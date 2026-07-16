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

`node scripts/setup-npm.mjs` は、現在選択している Node.js 環境で使われるグローバル npm のバージョンを変更する場合があります。導入、更新、削除、副作用の詳細は [使い始める手順](docs/getting-started.ja.md) を参照してください。

`npm run dev` が起動したら、Raycast の拡張機能設定で少なくとも 1 つの Markdown Source Folder を設定します。

## コマンド

| コマンド             | 用途                                                        |
| -------------------- | ----------------------------------------------------------- |
| Markdown Source 1    | Markdown Source 1 の Markdown ファイルを表示                |
| Markdown Source 2    | Markdown Source 2 の Markdown ファイルを表示                |
| Markdown Source 3    | Markdown Source 3 の Markdown ファイルを表示                |
| All Markdown Sources | 有効なすべての Markdown Source から Markdown ファイルを検索 |

対象フォルダが決まっている場合は個別の Markdown Source コマンドを使い、場所が曖昧な場合は All Markdown Sources を使います。

Raycast Root Search のコマンド順は利用状況に応じて変わります。順序が意図どおりでない場合は、対象コマンドを選択し、`⌘ K` で Action Panel を開いて `Reset Ranking` を実行してください。詳しくは [Raycast Search Bar manual](https://manual.raycast.com/search-bar) を参照してください。

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

## ヘルプ

導入、更新、削除については [使い始める手順](docs/getting-started.ja.md) を参照してください。MdClip の問題が解決しない場合は、[既存の Issues](https://github.com/uchimanajet7/mdclip/issues) を確認してください。未報告であれば、GitHub にサインインして新しい Issue を作成してください。

再現手順、実際の結果、期待する結果、MdClip、Raycast、macOS のバージョンを記載してください。非公開の Markdown 本文、クリップボードの内容、その他の機密情報は記載しないでください。

## 開発とメンテナンス

- [開発・メンテナンス検証](docs/local-verification.md)
- [メンテナー向けリリース管理](docs/release-management.md)
