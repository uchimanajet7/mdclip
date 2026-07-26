# MdClip を使い始める

[English](getting-started.md) | 日本語

## 1. 目的

MdClip は現在、Raycast Store ではなく、GitHub Release のソースコードから導入するローカル Raycast 拡張機能です。初回導入には Node.js とターミナルを使用し、更新時は最新リリースを取得して手順を再実行します。

この文書では、ソースコードの取得、依存関係の導入、Raycast 開発モードでの起動、Markdown Source の設定、動作確認、更新、削除の各手順を説明します。取得したソースアーカイブは、対応するリリースタグに固定されています。

## 2. 必要なもの

| 必要なもの                                     | 用途                                           |
| ---------------------------------------------- | ---------------------------------------------- |
| macOS                                          | Raycast と MdClip を実行する                   |
| Raycast                                        | MdClip を起動する                              |
| Node.js と npm                                 | 依存関係のインストールと開発モードの起動に使う |
| 最新の GitHub Release から取得したソースコード | MdClip 本体                                    |

Git は必須ではありません。通常利用では、最新の GitHub Release にある `Source code (zip)` を利用できます。

## 3. ソースコードを取得する

GitHub のリリースページからダウンロードし、Finder で展開できます。

1. ウェブブラウザで `https://github.com/uchimanajet7/mdclip/releases/latest` を開く。
2. 表示された最新リリースの `Source code (zip)` をダウンロードする。
3. Finder でダウンロードした ZIP ファイルを開いて展開する。
4. 展開された `mdclip` フォルダを、自分で管理しやすい場所へ移動する。

完了確認:

- ダウンロードした ZIP ファイルが、最新リリースのページにある `Source code (zip)` である。
- Finder で `mdclip` フォルダを開ける。
- そのフォルダの中に `package.json` がある。

## 4. 依存関係を入れる

Finder で `mdclip` フォルダを開き、フォルダを右クリックして `フォルダに新規ターミナル` を選びます。

依存関係を入れる前に、この MdClip リリースで使用する Node.js バージョンと、Mac で現在選択されている Node.js と npm のバージョンを確認します。

```bash
cat .node-version
node -v
npm -v
```

`cat .node-version` に表示された Node.js バージョンを使用します。Node.js が未導入の場合、または `node -v` に別のバージョンが表示される場合は、[Node.js のインストール案内](https://nodejs.org/en/download)を使って、表示されたバージョンをインストールまたは切り替えます。

開いたターミナルで次を実行します。

```bash
npm ci
```

`.node-version` に示された Node.js には、MdClip の最小要件を満たす npm が含まれています。MdClip がグローバル npm をインストールまたは置換することはありません。`npm ci` は、`package-lock.json` を使って、展開したソースフォルダに MdClip の依存関係をインストールします。

完了確認:

- コマンドが失敗せずに終了する。
- `mdclip/node_modules` フォルダが作成される。

## 5. Raycast の開発モードで起動する

同じ `mdclip` フォルダのターミナルで次を実行します。

```bash
npm run dev
```

`ready - built extension successfully` が表示されたら、Raycast から MdClip のコマンドを開けます。

`npm run dev` は MdClip を Raycast に読み込み、開発モードで起動します。初めて読み込んだ後は、ターミナルで `Control + C` を押して `npm run dev` を止めても MdClip は Raycast に残ります。変更を反映したい場合や、開発モードのログや変更の自動反映が必要な場合は、同じフォルダで `npm run dev` を再実行します。

## 6. Markdown Source を設定する

Raycast の `Settings` または `Preferences` で `Extensions` を開き、MdClip を選択します。

最初は Markdown Source 1 だけで始められます。MdClip を利用するには、設定済みの Markdown Source が少なくとも 1 つ必要です。追加の Markdown Source を使う場合は、その Markdown Source にもフォルダを設定してください。使わない Markdown Source にはフォルダを設定する必要はありません。

```text
Enable Markdown Source 1:
on

Markdown Source 1 Folder:
再利用したい Markdown ファイルを含むフォルダ
```

`Markdown Source 1 Folder` には、実際に `.md` ファイルを置いているフォルダを指定します。

設定後、Raycast で `Markdown Source 1` コマンドを開き、Markdown ファイルが表示されることを確認します。

## 7. 動作確認する

Markdown ファイルを選択し、次を確認します。

- `Copy Raw Content` で Markdown ファイルの本文をそのままコピーできる。
- `Copy Expanded Content` で対応する Dynamic Placeholders を展開してコピーできる。
- プレビューペインで Markdown ファイルの冒頭を確認できる。
- 個別の Markdown Source コマンドで、ファイル名または相対パスからファイルを探せる。
- `All Markdown Sources` では、有効なすべての Source から Markdown Source の表示名でもファイルを探せる。
- Markdown ファイルの本文だけに含まれる語句では、そのファイルが検索結果に表示されない。

Dynamic Placeholders の詳細は [README](../README.ja.md#dynamic-placeholders) を参照してください。

## 8. 更新する

1. ウェブブラウザで `https://github.com/uchimanajet7/mdclip/releases/latest` を開く。
2. 表示された最新リリースの `Source code (zip)` をダウンロードする。
3. Finder で展開する。
4. 必要なら古い `mdclip` フォルダと入れ替える。
5. 新しい `mdclip` フォルダで、[4. 依存関係を入れる](#4-依存関係を入れる)の手順を実行する。
6. 新しい `mdclip` フォルダで `npm run dev` を実行する。

完了確認:

- ダウンロードした ZIP ファイルが、最新リリースのページにある `Source code (zip)` である。
- 新しい `mdclip` フォルダで、`cat .node-version` に表示された Node.js バージョンが有効になっている。
- 新しい `mdclip` フォルダで `npm ci` が失敗せずに終了する。
- 新しい `mdclip` フォルダで `npm run dev` を実行し、Raycast から MdClip のコマンドを開ける。

## 9. 使うのをやめる

削除対象は、Raycast に読み込んだ MdClip 拡張機能、取得したソースコード、必要に応じて追加したツールです。

### 9.1 Raycast から MdClip を削除する

1. Raycast で `Manage Extensions` を開く。
2. MdClip を選択する。
3. アンインストールまたは削除のアクションを実行する。

Raycast から MdClip を削除できない場合は、[GitHub Issues](https://github.com/uchimanajet7/mdclip/issues) で問題を報告してください。

### 9.2 ソースコードを削除する

Finder で展開した `mdclip` フォルダを削除します。

ソースコードのフォルダを削除すると、`npm ci` で作成された `node_modules` も一緒に削除されます。

## 10. MdClip を削除できたことを確認する

導入前の状態に戻す場合は、次を確認します。

- Raycast で MdClip のコマンドが表示されない。
- ダウンロードして展開した `mdclip` フォルダが残っていない。

Node.js、npm、Raycast を他の用途でも使う場合は、それらのツール自体は削除せず、MdClip の拡張機能とソースコードだけを削除してください。
