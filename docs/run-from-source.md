# ソースコードから使う手順

## 1. 目的

この手順では、MdClip を GitHub の source code から自分の Mac に読み込み、Raycast development mode で使える状態にします。

これは Raycast Store から install する手順ではありません。この方法で読み込んだ extension は、Raycast Store 経由では自動更新されません。更新する場合は source code を更新し、必要に応じて `npm ci` を実行してから、再度 `npm run dev` を実行します。

MdClip は過去に Raycast Store 公開を試みましたが、名称や説明を変更しても既存の reusable-text / snippet 系 workflow と重なるという review concern が残りました。そのため現在は source-use を通常経路とし、Store 公開用 resource は `raycast-publish/` に分けて保持しています。

## 2. 必要なもの

| 必要なもの                      | 用途                                              |
| ------------------------------- | ------------------------------------------------- |
| macOS                           | Raycast と MdClip を実行する                      |
| Raycast                         | MdClip を起動する                                 |
| Node.js と npm                  | 依存関係の install と development mode 起動に使う |
| GitHub から取得した source code | MdClip 本体                                       |

Git は必須ではありません。Git を使わない場合は GitHub の ZIP download で利用できます。

## 3. Source code を取得する

### 3.1 ZIP で取得する

Git を使わない場合は、GitHub Web UI と Finder だけで取得できます。

1. Web browser で `https://github.com/uchimanajet7/mdclip` を開く。
2. 緑色の `Code` button を押す。
3. `Download ZIP` を選ぶ。
4. Finder で download した ZIP file を開いて展開する。
5. 展開された `mdclip` folder を、自分で管理しやすい場所へ移動する。

完了確認:

- Finder で `mdclip` folder を開ける。
- その folder の中に `package.json` がある。

### 3.2 GitHub Desktop で取得する

GitHub Desktop を使う場合は、次の手順で repository を clone します。

1. GitHub Desktop を開く。
2. menu bar から `File` > `Clone Repository...` を選ぶ。
3. `URL` tab を開く。
4. `Repository URL` に `https://github.com/uchimanajet7/mdclip.git` を入力する。
5. `Local Path` に保存先 folder を選ぶ。
6. `Clone` を押す。
7. clone 完了後、GitHub Desktop の `Repository` > `Show in Finder` を選ぶ。

完了確認:

- Finder で `mdclip` folder を開ける。
- その folder の中に `package.json` がある。
- GitHub Desktop の repository 名が `mdclip` になっている。

### 3.3 CLI で取得する場合

CLI を使う場合は、作業用 folder で次を実行します。

```bash
git clone https://github.com/uchimanajet7/mdclip.git
cd mdclip
```

この CLI 手順は任意です。GitHub Desktop または ZIP で取得した場合は不要です。

## 4. 依存関係を入れる

Finder で `mdclip` folder を開き、folder を右クリックして `フォルダに新規ターミナル` を選びます。

開いた terminal で次を実行します。

```bash
npm ci
```

`npm ci` は `package-lock.json` に記録された依存関係を `node_modules` に install します。

完了確認:

- command が失敗せずに終了する。
- `mdclip/node_modules` folder が作成される。

## 5. Raycast development mode で起動する

同じ `mdclip` folder の terminal で次を実行します。

```bash
npm run dev
```

`ready - built extension successfully` が表示されたら、Raycast から MdClip の commands を開けます。

起動中は terminal を閉じないでください。終了する場合は terminal で `Control + C` を押します。

## 6. Markdown Source を設定する

Raycast で MdClip の extension preferences を開き、少なくとも 1 つの Markdown Source Folder を設定します。

最初は次だけで始められます。

```text
Enable Markdown Source 1:
on

Markdown Source 1 Folder:
再利用したい Markdown ファイルを含む folder
```

設定後、Raycast で `Markdown Source 1` を開き、Markdown files が表示されることを確認します。

## 7. 動作確認する

Markdown file を選択し、次を確認します。

- `Copy Raw Content` で Markdown file の本文をそのままコピーできる。
- `Copy Expanded Content` で対応する Dynamic Placeholders を展開してコピーできる。
- preview pane で Markdown file の冒頭を確認できる。
- `All Markdown Sources` で有効な source を横断検索できる。

Dynamic Placeholders の詳細は [README.ja](../README.ja.md#dynamic-placeholders) を参照してください。

## 8. 更新する

### ZIP で取得した場合

1. GitHub Web UI で `https://github.com/uchimanajet7/mdclip` を開く。
2. `Code` > `Download ZIP` で新しい ZIP を download する。
3. Finder で展開する。
4. 必要なら古い `mdclip` folder と入れ替える。
5. 新しい `mdclip` folder で `npm ci` を実行する。
6. `npm run dev` を実行する。

### GitHub Desktop で取得した場合

1. GitHub Desktop で `mdclip` repository を開く。
2. 上部の `Fetch origin` を押す。
3. 更新がある場合は `Pull origin` を押す。
4. `Repository` > `Show in Finder` で folder を開く。
5. その folder で terminal を開く。
6. `npm ci` を実行する。
7. `npm run dev` を実行する。

### CLI で取得した場合

```bash
git pull
npm ci
npm run dev
```

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

ZIP で取得した場合は、Finder で展開した `mdclip` folder を削除します。

GitHub Desktop で取得した場合は、先に GitHub Desktop で対象 repository が `mdclip` であることを確認し、`Repository` > `Show in Finder` で folder を開いてから、GitHub Desktop 側で repository を閉じ、Finder で `mdclip` folder を削除します。

CLI で取得した場合は、`git clone` で作成した `mdclip` folder を削除します。

source code folder を削除すると、`npm ci` で作成された `node_modules` も一緒に削除されます。

## 10. 戻せたことを確認する

導入前の状態に戻す場合は、次を確認します。

- Raycast で MdClip の command が表示されない。
- `~/.config/raycast/extensions/mdclip` が存在しない。
- download または clone した `mdclip` folder が残っていない。

Node.js、npm、Git、GitHub Desktop、Raycast を他の用途でも使う場合は、それらの tool 自体は削除せず、MdClip の extension と source code だけを削除してください。
