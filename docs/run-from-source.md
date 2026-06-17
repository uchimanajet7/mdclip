# ソースコードから使う手順

## 1. この手順でできること

この手順では、`Local Copy Blocks` をソースコードから自分の Mac に読み込み、Raycast 上で使える状態にします。

Raycast Store からインストールする手順ではありません。Store 版と異なり、この手順で読み込んだ Extension は自動更新されません。更新したい場合は、ソースコードを更新してから再度 `npm run dev` を実行します。

`Local Copy Blocks` の機能と使い方は [README](../README.ja.md) を参照してください。開発者向けの確認手順は [ローカル確認手順](local-verification.md) を参照してください。

## 2. 向いている人

- Raycast Store を使わずに `Local Copy Blocks` を使いたい人
- 自分の Mac に Node.js と npm を入れても問題ない人
- ターミナルで数個のコマンドを実行できる人
- 使わなくなった場合に Extension、ソースコード、追加したツールを削除したい人

Node.js や npm を入れたくない場合、この手順は向きません。

## 3. 必要なもの

| 必要なもの   | 用途                                                    |
| ------------ | ------------------------------------------------------- |
| macOS        | Raycast と Extension を実行する環境                     |
| Raycast      | `Local Copy Blocks` を起動するアプリ                    |
| Node.js      | Extension をビルドして Raycast に読み込むための実行環境 |
| npm          | 依存 package を準備するための package manager           |
| ソースコード | `Local Copy Blocks` の Extension 本体                   |

Git は必須ではありません。Git を入れたくない場合は、GitHub から ZIP をダウンロードして使えます。

## 4. ツールをインストールする

### 4.1 Raycast

Raycast をインストールしていない場合は、[Raycast 公式サイト](https://www.raycast.com/)からダウンロードして `/Applications` に配置します。

Raycast を起動し、初期設定を完了してください。

Homebrew をすでに使っている場合は、次の方法でもインストールできます。

```bash
brew install --cask raycast
```

### 4.2 Node.js と npm

Node.js をインストールしていない場合は、[Node.js 公式サイト](https://nodejs.org/)から macOS 用の LTS 版をインストールします。npm は Node.js と一緒に入ります。

Homebrew をすでに使っている場合は、次の方法でもインストールできます。

```bash
brew install node
```

インストール後、ターミナルで次を実行します。

```bash
node -v
```

```bash
npm -v
```

このリポジトリの `package-lock.json` では `@raycast/api` が Node.js `>=22.22.2` を要求します。`node -v` で `v22.22.2` 以上が表示され、`npm -v` でバージョンが表示されれば、この手順で使えます。

### 4.3 Git

Git は、ソースコードを `git clone` で取得したい場合だけ必要です。

Git を入れずに使う場合は、GitHub の `Code` > `Download ZIP` または GitHub Release の `Source code` ZIP を使ってください。

Git を使う場合は、次でインストール済みか確認します。

```bash
git --version
```

Homebrew をすでに使っている場合は、次の方法でもインストールできます。

```bash
brew install git
```

## 5. ソースコードを取得する

作業用フォルダを 1 つ決めます。例として、`~/Downloads` や `~/Developer` など、自分で削除してよい場所を使います。

### 5.1 ZIP で取得する

Git を使わない場合は、[GitHub repository](https://github.com/uchimanajet7/raycast-local-copy-blocks) から ZIP をダウンロードして展開します。

展開した `raycast-local-copy-blocks` フォルダを Finder で開きます。

### 5.2 Git で取得する

Git を使う場合は、作業用フォルダで次を実行します。

```bash
git clone https://github.com/uchimanajet7/raycast-local-copy-blocks.git
```

```bash
cd raycast-local-copy-blocks
```

## 6. 依存 package を準備する

ターミナルで `raycast-local-copy-blocks` フォルダに移動します。

ZIP で取得した場合は、Finder で展開したフォルダを右クリックして `フォルダに新規ターミナル` を開くと、そのフォルダでターミナルを開始できます。

フォルダ内で次を実行します。

```bash
npm ci
```

`npm ci` は、`package-lock.json` に記録された依存 package を `node_modules` にインストールします。`node_modules` は `raycast-local-copy-blocks` フォルダの中に作成されます。

## 7. Raycast で起動する

`raycast-local-copy-blocks` フォルダで次を実行します。

```bash
npm run dev
```

`ready - built extension successfully` が表示されたら、Raycast で `Block Set 1`、`Block Set 2`、`Block Set 3`、`All Block Sets` を検索できます。

このコマンドは Raycast の development mode として Extension を読み込みます。試している間はターミナルを開いたままにしてください。終了する場合は、ターミナルで `Control + C` を押します。

## 8. Block Set を設定する

Raycast で `Local Copy Blocks` の Extension Preferences を開き、少なくとも 1 つの Block Set Folder を設定します。

最初に使う場合は、次の設定だけで始められます。

```text
Enable Block Set 1:
on

Block Set 1 Folder:
再利用したい Markdown ファイルを含むフォルダ
```

設定後、Raycast で `Block Set 1` を開き、Markdown ファイルが表示されることを確認します。

## 9. 動作確認する

Markdown ファイルを選択し、以下を確認します。

- `Copy Raw Content` で Markdown ファイルの本文をそのままコピーできる
- `Copy Expanded Content` で対応する Dynamic Placeholders を展開してコピーできる
- preview pane で Markdown ファイルの冒頭を確認できる
- `All Block Sets` で有効な Block Set を横断検索できる

Dynamic Placeholders の詳細は [README の Dynamic Placeholders](../README.ja.md#dynamic-placeholders) を参照してください。

## 10. ソースコードを更新する

ZIP で取得した場合は、GitHub から新しい ZIP をダウンロードして展開し直します。

Git で取得した場合は、`raycast-local-copy-blocks` フォルダで次を実行します。

```bash
git pull
```

更新後、次を実行します。

```bash
npm ci
```

```bash
npm run dev
```

## 11. 使うのをやめる

削除する対象は、Raycast に読み込んだ Extension、ダウンロードまたは clone したソースコード、必要に応じて追加したツールです。

### 11.1 Extension を Raycast から外す

Raycast で `Manage Extensions` を開き、`Local Copy Blocks` を選択して uninstall または remove の Action を実行します。Raycast の Extension 管理方法は [Manage Extensions Command](https://developers.raycast.com/information/developer-tools/manage-extensions-command) でも確認できます。

Raycast 上で削除できない場合は、Raycast を終了してから次のフォルダを確認します。

```text
~/.config/raycast/extensions/local-copy-blocks
```

存在する場合は、この `local-copy-blocks` フォルダだけを削除します。`~/.config/raycast/extensions` には他のローカル Extension が入っている場合があります。

### 11.2 ソースコードを削除する

ZIP で取得した場合は、展開した `raycast-local-copy-blocks` フォルダを削除します。

Git で取得した場合は、`git clone` で作成した `raycast-local-copy-blocks` フォルダを削除します。

このフォルダを削除すると、`npm ci` で作成された `node_modules` も一緒に削除されます。

### 11.3 Raycast を削除する

Raycast 自体を使わない場合は、Raycast を終了してから `/Applications/Raycast.app` をゴミ箱へ移動します。

Homebrew で Raycast をインストールした場合は、次でも削除できます。

```bash
brew uninstall --cask raycast
```

Raycast の設定や他の Raycast データも消す場合は、次のデータフォルダを削除します。他の Raycast 設定や Extension 情報も消えるため、必要な場合だけ行ってください。

```text
~/.config/raycast
```

### 11.4 Node.js と npm を削除する

Node.js と npm を他の用途で使わない場合は、インストール方法に合わせて削除します。

Homebrew で Node.js をインストールした場合は、次を実行します。

```bash
brew uninstall node
```

```bash
brew cleanup
```

Node.js 公式 installer でインストールした場合は、他の開発環境で Node.js を使っていないことを確認し、Node.js 公式配布物の macOS installer に対応する削除手順で削除します。

削除前に、現在使われている `node` と `npm` の場所を確認します。

```bash
which node
```

```bash
which npm
```

削除後は、次のコマンドで Node.js と npm が見つからないことを確認します。

```bash
node -v
```

```bash
npm -v
```

### 11.5 Git を削除する

Git をこの手順のためだけに Homebrew で入れた場合は、次を実行します。

```bash
brew uninstall git
```

```bash
brew cleanup
```

macOS の Command Line Tools と一緒に入った Git は、他の開発ツールでも使われる場合があります。不要であることを確認できない場合は、そのまま残してください。

## 12. 戻せたことを確認する

導入前の状態に戻す場合は、以下を確認します。

- Raycast で `Local Copy Blocks` の Command が表示されない
- `~/.config/raycast/extensions/local-copy-blocks` が存在しない
- ダウンロードまたは clone した `raycast-local-copy-blocks` フォルダが残っていない
- Node.js を削除した場合は `node -v` が失敗する
- npm を削除した場合は `npm -v` が失敗する
- Git を削除した場合は `git --version` が失敗する

Raycast、Node.js、npm、Git を他の用途でも使う場合は、それらのツール自体は削除せず、`Local Copy Blocks` の Extension とソースコードだけ削除してください。
