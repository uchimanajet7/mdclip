# MdClip を使い始める

## 1. 目的

この手順では、最新 GitHub Release の `Source code (zip)` を取得し、Mac 上で依存関係を入れて、Raycast development mode から MdClip を使い始めます。

取得した source archive は release tag に対応する固定のソースです。新しい version を使う場合は、最新 GitHub Release の `Source code (zip)` を取得し直し、projectのnpmをsetupしてから、必要に応じて `npm ci` と `npm run dev` を再実行します。

## 2. 必要なもの

| 必要なもの                                   | 用途                                              |
| -------------------------------------------- | ------------------------------------------------- |
| macOS                                        | Raycast と MdClip を実行する                      |
| Raycast                                      | MdClip を起動する                                 |
| Node.js と npm                               | 依存関係の install と development mode 起動に使う |
| 最新 GitHub Release から取得した source code | MdClip 本体                                       |

Node.js と npm が使える状態か確認します。

```bash
node -v
npm -v
```

この手順では、現在の MdClip 依存関係に合わせて Node.js `22.22.2` 以上が使える状態を前提にします。repository の `.node-version` は検証済みの最新 Node.js LTS を記録しています。Node.js が未導入、または version が古い場合は [Node.js 公式 download page](https://nodejs.org/en/download) から LTS version を install します。

npm は `package.json` の `packageManager` に記録された検証済みversionを使います。Node.js同梱npmがそのversionと異なる場合があるため、次の依存関係install前にprojectのsetup scriptで揃えます。

Git は必須ではありません。通常利用では、最新 GitHub Release の `Source code (zip)` を利用できます。

## 3. Source code を取得する

GitHub Web UI と Finder だけで取得できます。

1. Web browser で `https://github.com/uchimanajet7/mdclip/releases/latest` を開く。
2. 表示された latest release の `Source code (zip)` を download する。
3. Finder で download した ZIP file を開いて展開する。
4. 展開された `mdclip` folder を、自分で管理しやすい場所へ移動する。

完了確認:

- download した ZIP file が latest release page の `Source code (zip)` である。
- Finder で `mdclip` folder を開ける。
- その folder の中に `package.json` がある。

## 4. 依存関係を入れる

Finder で `mdclip` folder を開き、folder を右クリックして `フォルダに新規ターミナル` を選びます。

開いた terminal で次を実行します。

```bash
node scripts/setup-npm.mjs
npm ci
```

`node scripts/setup-npm.mjs` は `package.json` の `packageManager` を読み、選択されたnpmをglobal npmとして有効化して、実際のversionが一致することを確認します。`npm ci` はそのnpmで `package-lock.json` に記録された依存関係を `node_modules` にinstallします。

完了確認:

- command が失敗せずに終了する。
- `mdclip/node_modules` folder が作成される。

## 5. Raycast development mode で起動する

同じ `mdclip` folder の terminal で次を実行します。

```bash
npm run dev
```

`ready - built extension successfully` が表示されたら、Raycast から MdClip の commands を開けます。

`npm run dev` は MdClip を Raycast に import し、development mode で起動します。初回 import 後は、terminal で `Control + C` を押して `npm run dev` を止めても MdClip は Raycast に残ります。変更を反映したい場合や development mode の logs / hot reload が必要な場合は、同じ folder で `npm run dev` を再実行します。

## 6. Markdown Source を設定する

Raycast の Settings または Preferences で `Extensions` を開き、MdClip を選択します。

最初は次だけで始められます。

```text
Enable Markdown Source 1:
on

Markdown Source 1 Folder:
再利用したい Markdown ファイルを含む folder
```

`Markdown Source 1 Folder` には、実際に `.md` files を置いている folder を指定します。

設定後、Raycast で `Markdown Source 1` command を開き、Markdown files が表示されることを確認します。

## 7. 動作確認する

Markdown file を選択し、次を確認します。

- `Copy Raw Content` で Markdown file の本文をそのままコピーできる。
- `Copy Expanded Content` で対応する Dynamic Placeholders を展開してコピーできる。
- preview pane で Markdown file の冒頭を確認できる。
- `All Markdown Sources` で有効な source を横断検索できる。

Dynamic Placeholders の詳細は [README.ja](../README.ja.md#dynamic-placeholders) を参照してください。

## 8. 更新する

1. GitHub Web UI で `https://github.com/uchimanajet7/mdclip/releases/latest` を開く。
2. 表示された latest release の `Source code (zip)` を download する。
3. Finder で展開する。
4. 必要なら古い `mdclip` folder と入れ替える。
5. 新しい `mdclip` folder で `node scripts/setup-npm.mjs` を実行する。
6. `npm ci` を実行する。
7. `npm run dev` を実行する。

完了確認:

- download した ZIP file が latest release page の `Source code (zip)` である。
- 新しい `mdclip` folder で選択されたnpm versionが有効になっている。
- 新しい `mdclip` folder で `npm ci` が失敗せずに終了する。
- 新しい `mdclip` folder で `npm run dev` を実行し、Raycast から MdClip の commands を開ける。

## 9. 使うのをやめる

削除対象は、Raycast に読み込んだ MdClip extension、取得した source code、必要に応じて追加した tool です。

### 9.1 Raycast から外す

1. Raycast で `Manage Extensions` を開く。
2. MdClip を選択する。
3. uninstall または remove の action を実行する。

Raycast 上で外せない場合は、Raycast を終了してから Finder で次の folder を確認します。

```text
~/.config/raycast/extensions/mdclip
```

存在する場合は、この `mdclip` folder だけを削除します。`~/.config/raycast/extensions` には他の local extension が入っている場合があります。

### 9.2 Source code を削除する

Finder で展開した `mdclip` folder を削除します。

source code folder を削除すると、`npm ci` で作成された `node_modules` も一緒に削除されます。

## 10. 戻せたことを確認する

導入前の状態に戻す場合は、次を確認します。

- Raycast で MdClip の command が表示されない。
- `~/.config/raycast/extensions/mdclip` が存在しない。
- download して展開した `mdclip` folder が残っていない。

Node.js、npm、Raycast を他の用途でも使う場合は、それらの tool 自体は削除せず、MdClip の extension と source code だけを削除してください。
