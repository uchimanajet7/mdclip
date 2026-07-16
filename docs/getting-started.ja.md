# MdClip を使い始める

[English](getting-started.md) | 日本語

## 1. 目的

この手順では、最新の GitHub Release から `Source code (zip)` を取得し、Mac 上で依存関係を入れて、Raycast の開発モードから MdClip を使い始めます。

取得したソースアーカイブには、リリースタグに対応する固定のソースが入っています。新しいバージョンを使う場合は、最新の GitHub Release から `Source code (zip)` を取得し直し、プロジェクトで使う npm のバージョンを揃えてから、必要に応じて `npm ci` と `npm run dev` を再実行します。

## 2. 必要なもの

| 必要なもの                                     | 用途                                           |
| ---------------------------------------------- | ---------------------------------------------- |
| macOS                                          | Raycast と MdClip を実行する                   |
| Raycast                                        | MdClip を起動する                              |
| Node.js と npm                                 | 依存関係のインストールと開発モードの起動に使う |
| 最新の GitHub Release から取得したソースコード | MdClip 本体                                    |

Node.js と npm が使える状態か確認します。

```bash
node -v
npm -v
```

この手順では、現在の MdClip の依存関係に合わせて Node.js `22.22.2` 以上が使える状態を前提にします。リポジトリの `.node-version` には、検証済みの最新 Node.js LTS バージョンを記録しています。Node.js が未導入、またはバージョンが古い場合は、[Node.js 公式ダウンロードページ](https://nodejs.org/en/download) から LTS バージョンをインストールします。

npm は、`package.json` の `packageManager` に記録された検証済みのバージョンを使います。Node.js に同梱された npm がそのバージョンと異なる場合があるため、依存関係をインストールする前にプロジェクトのセットアップスクリプトで揃えます。

Git は必須ではありません。通常利用では、最新の GitHub Release にある `Source code (zip)` を利用できます。

## 3. ソースコードを取得する

GitHub のウェブ画面と Finder だけで取得できます。

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

開いたターミナルで次を実行します。

```bash
node scripts/setup-npm.mjs
npm ci
```

`node scripts/setup-npm.mjs` は `package.json` の `packageManager` を読み、選択された npm をグローバル npm として有効にして、実際のバージョンが一致することを確認します。現在の npm と異なる場合は、選択中の Node.js 環境に属するグローバル npm を更新します。初期設定中の古い npm はソースフォルダの外で実行するため、ソースフォルダの `devEngines` が古い npm 自身の更新を先に拒否することはありません。`npm ci` は、選択された npm を使って `package-lock.json` に記録された依存関係を `node_modules` にインストールします。

完了確認:

- コマンドが失敗せずに終了する。
- `mdclip/node_modules` フォルダが作成される。

## 5. Raycast の開発モードで起動する

同じ `mdclip` フォルダのターミナルで次を実行します。

```bash
npm run dev
```

`ready - built extension successfully` が表示されたら、Raycast から MdClip のコマンドを開けます。

`npm run dev` は MdClip を Raycast に読み込み、開発モードで起動します。初めて読み込んだ後は、ターミナルで `Control + C` を押して `npm run dev` を止めても MdClip は Raycast に残ります。変更を反映したい場合や、開発モードのログやホットリロードが必要な場合は、同じフォルダで `npm run dev` を再実行します。

## 6. Markdown Source を設定する

Raycast の `Settings` または `Preferences` で `Extensions` を開き、MdClip を選択します。

最初は次だけで始められます。

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
- `All Markdown Sources` で有効な Markdown Source を横断検索できる。

Dynamic Placeholders の詳細は [README](../README.ja.md#dynamic-placeholders) を参照してください。

## 8. 更新する

1. GitHub のウェブ画面で `https://github.com/uchimanajet7/mdclip/releases/latest` を開く。
2. 表示された最新リリースの `Source code (zip)` をダウンロードする。
3. Finder で展開する。
4. 必要なら古い `mdclip` フォルダと入れ替える。
5. 新しい `mdclip` フォルダで `node scripts/setup-npm.mjs` を実行する。
6. `npm ci` を実行する。
7. `npm run dev` を実行する。

完了確認:

- ダウンロードした ZIP ファイルが、最新リリースのページにある `Source code (zip)` である。
- 新しい `mdclip` フォルダで、選択された npm バージョンが有効になっている。
- 新しい `mdclip` フォルダで `npm ci` が失敗せずに終了する。
- 新しい `mdclip` フォルダで `npm run dev` を実行し、Raycast から MdClip のコマンドを開ける。

## 9. 使うのをやめる

削除対象は、Raycast に読み込んだ MdClip 拡張機能、取得したソースコード、必要に応じて追加したツールです。

### 9.1 Raycast から外す

1. Raycast で `Manage Extensions` を開く。
2. MdClip を選択する。
3. アンインストールまたは削除のアクションを実行する。

Raycast 上で外せない場合は、Raycast を終了してから Finder で次のフォルダを確認します。

```text
~/.config/raycast/extensions/mdclip
```

存在する場合は、この `mdclip` フォルダだけを削除します。`~/.config/raycast/extensions` には、他のローカル拡張機能が入っている場合があります。

### 9.2 ソースコードを削除する

Finder で展開した `mdclip` フォルダを削除します。

ソースコードのフォルダを削除すると、`npm ci` で作成された `node_modules` も一緒に削除されます。

## 10. 戻せたことを確認する

導入前の状態に戻す場合は、次を確認します。

- Raycast で MdClip のコマンドが表示されない。
- `~/.config/raycast/extensions/mdclip` が存在しない。
- ダウンロードして展開した `mdclip` フォルダが残っていない。

Node.js、npm、Raycast を他の用途でも使う場合は、それらのツール自体は削除せず、MdClip の拡張機能とソースコードだけを削除してください。
