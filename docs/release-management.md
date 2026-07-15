# MdClip メンテナー向けリリース管理

## 1. 目的

この文書は、MdClip の release owner / maintainer が GitHub Release 作成、release manifest、release body、検証、workflow 実行順を管理するための手順を定義します。

| 項目             | 位置づけ                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Audience         | MdClip の release owner / maintainer                                                                                  |
| Scope            | GitHub Release 作成、release manifest、release body、検証、workflow 実行順、Store publish re-approval path            |
| Active user path | 利用者向けの導入と更新は [MdClip を使い始める](getting-started.md) を正とする                                         |
| Store path       | Store publish の再開判断と必要 resource は [Store publish re-approval path](#8-store-publish-re-approval-path) で扱う |

MdClip の active release path は GitHub Release です。release owner / maintainer は、latest release tag に紐づく source archive が利用者向け取得導線になることを前提に release を管理します。

## 2. Release owner 管理対象

| 対象                             | 役割                                                   | release 管理での扱い                                                |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| GitHub Release                   | latest release tag と source archive の公開単位        | Active public release unit                                          |
| `Release` workflow               | Git tag と GitHub Release を作成する                   | `.github/release-manifest.json` に従って手動実行する                |
| `Build` workflow                 | build、local verification、Raycast CLI lint を確認する | branch push、Pull Request、手動実行、または他 workflow から実行する |
| `.github/release-manifest.json`  | 次に作成する GitHub Release の計画ファイル             | `Release` workflow の入力として管理する                             |
| `.github/release-changelog/*.md` | GitHub Release body の source                          | release tag と同じ version 名で作成または更新する                   |
| `docs/screenshot-media.md`       | README / GitHub / release 用 UI evidence 手順          | current UI evidence を扱う release 前確認で使う                     |
| `docs/local-verification.md`     | 開発・メンテナンス検証手順                             | release 前の local verification と手動確認の範囲を定義する          |

## 3. 公式情報の位置づけ

- GitHub Releases は tag に基づき、release notes と source archive を公開できる repository-native release unit です。
  - https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- GitHub source archives は release / tag に紐づく source code の取得経路です。
  - https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives
- GitHub Actions の continuous integration は build と test を workflow で確認する仕組みです。
  - https://docs.github.com/en/actions/get-started/continuous-integration
- Raycast CLI は extension の develop、build、lint を扱います。
  - https://developers.raycast.com/information/developer-tools/cli

## 4. Release manifest

`.github/release-manifest.json` は、次に作成する GitHub Release の計画ファイルです。

現在の MdClip transition release は `v0.2.0` です。`v0.1.4` は既存 tag であり、Local Copy Blocks 時代の release history として扱います。

形式は以下とします。

```json
{
  "tag": "vX.Y.Z",
  "title": "vX.Y.Z",
  "previousGitHubReleaseTag": "vX.Y.Z",
  "githubReleaseChangelogFile": ".github/release-changelog/vX.Y.Z.md"
}
```

| 項目                         | 意味                                                 |
| ---------------------------- | ---------------------------------------------------- |
| `tag`                        | 今回作成する GitHub Release tag                      |
| `title`                      | 今回作成する GitHub Release title                    |
| `previousGitHubReleaseTag`   | 最後に作成済みの GitHub Release tag                  |
| `githubReleaseChangelogFile` | 今回の GitHub Release body として使う changelog file |

Store publish state は GitHub Release 作成 manifest には含めません。Store publish 再開時の管理対象は [Store publish re-approval path](#8-store-publish-re-approval-path) で扱います。

現在の manifest は次を指します。

```json
{
  "tag": "v0.2.0",
  "title": "v0.2.0",
  "previousGitHubReleaseTag": "v0.1.4",
  "githubReleaseChangelogFile": ".github/release-changelog/v0.2.0.md"
}
```

## 5. GitHub Release 用 changelog

`.github/release-changelog/vX.Y.Z.md` は、GitHub Release body として使う changelog file です。

1 つの GitHub Release tag に対して 1 file 作成します。file name の `vX.Y.Z` は、対応する GitHub Release tag と一致させます。

将来作成する release body は、次の固定書式を使います。

```markdown
## What changes for you

- <この Release で利用者が見える・できることの変化と、その意味>

## Install or update

- <この Release を取得・更新・移行して使うために利用者が行うこと>
```

書式には次の規則を適用します。

- `## What changes for you`、`## Install or update` の 2 見出しだけを、この順番で使う。
- 前置き、body 内の version 見出し、空 section、追加見出しを置かない。
- 各 section に `- ` で始まる空ではない list item を 1 つ以上置く。
- `What changes for you` には、利用者が見える・できることの変化、利用条件、安全性、互換性、または制限の意味を書く。
- `Install or update` には、その Release を取得、install、update、移行、または安全に利用するために利用者が行うことを書く。
- 利用者の理解、判断、操作を変えない CI、検証、workflow、公開経路の内部状態、保守用 file、将来検討は掲載せず、この文書などの maintainer 向け surface で管理する。

`scripts/release-manifest.mjs validate` と同 script の `body` / `outputs` 経路は、future release body の見出し、順序、前置き、list、Correction 表記を検証します。`npm run check:release` はこの契約の正常系、拒否系、legacy 境界、回復を Node.js 標準 test で確認し、`npm run lint` の一部として実行します。意味上の掲載可否は keyword や classifier では判定せず、release owner / maintainer が上記の 2 つの利用者タスクに照らして判断します。

次の 6 file だけを、固定書式導入前に公開済みの closed legacy set とします。

- `.github/release-changelog/v0.1.0.md`
- `.github/release-changelog/v0.1.1.md`
- `.github/release-changelog/v0.1.2.md`
- `.github/release-changelog/v0.1.3.md`
- `.github/release-changelog/v0.1.4.md`
- `.github/release-changelog/v0.2.0.md`

この set に新しい path を追加しません。上記以外の release body file は version 番号にかかわらず固定書式を通します。既存 tag の release body file と公開済み GitHub Release は、固定書式へ合わせるだけの一括編集を行わず、履歴として残します。

公開済み body に、誤った install、update、移行、安全、互換性、または利用判断を招く重大な虚偽、誤解、欠落が見つかった場合だけ訂正します。

- future 固定書式では、該当 section の先頭へ `- **Correction (YYYY-MM-DD):** <訂正内容>` を追加する。
- legacy body では、既存の version 見出しまたは前置きの後にある body list の先頭へ同じ表記を追加する。
- Correction item は通常 item より前に置き、実在する日付を `YYYY-MM-DD` で記録する。
- current branch の release body file と公開済み GitHub Release notes を同じ内容へ更新し、tag は移動しない。
- GitHub Release notes の外部更新は、実施前に別途承認を取る。

## 6. Release 作成手順

GitHub Release を作成する場合は、次を行います。

1. 最後に作成済みの GitHub Release tag を確認する。
2. 今回作成する GitHub Release tag を決める。
3. [GitHub Release 用 changelog](#5-github-release-用-changelog) の固定書式で `.github/release-changelog/vX.Y.Z.md` を作成または更新する。
4. `.github/release-manifest.json` を更新する。
5. `npm run lint` を実行する。
6. 必要に応じて `npm run lint:raycast` を実行する。
7. 必要に応じて `npm run build` を実行する。
8. README や GitHub Release で current UI evidence を扱う場合は、`docs/screenshot-media.md` に従って画像を作成し、user review を完了する。
9. 変更を commit / push する。
10. GitHub Actions の `Release` workflow を手動実行する。

`Release` workflow は、push 済みの `.github/release-manifest.json` を読み、manifest の `tag` で Git tag と GitHub Release を作成します。

GitHub Release body は、manifest の `githubReleaseChangelogFile` から作成します。

## 7. Workflows

### 7.1 Build

`Build` workflow は、source、build、local verification、Raycast CLI lint を確認します。

現在の `Build` workflow は次を実行します。

1. `.node-version` の Node.js をsetupする。
2. `package.json#packageManager` のnpmをsetupする。
3. `npm run check:dependencies`
4. `npm ci`
5. `npm run build`
6. `npm run lint`
7. `npm run lint:raycast`

すべてのexternal actionはfull commit SHAへ固定し、DependabotのGitHub Actions updateで新しいreleaseを検知します。`setup-node`のnpm cacheはbootstrap前にnpmを実行するため無効化し、selected npmのsetup後にproject commandを開始します。

### 7.2 Release

`Release` workflow は、GitHub tag と GitHub Release を作成する workflow です。

`Release` workflow は Raycast Store publish を呼び出しません。`publish_to_raycast` input も持ちません。

dependency installと検証はreusable `Build` jobだけが担当します。`prepare-tag`と`github-release`はNode.js standard libraryだけを使うrelease manifest処理なので、npm setupと`npm ci`を重複実行しません。

### 7.3 Store publish re-approval workflow

`.github/workflows/publish-release-to-raycast.yml` と `scripts/publish-raycast-pr.mjs` は、Store publish re-approval path に属します。

Repository variable `MDCLIP_RAYCAST_STORE_PUBLISH_REAPPROVED` が `true` の場合だけ、Store publish path として扱います。

再承認後のpublish jobは、default branchではなく指定された`release-source/.node-version`とrelease sourceの`packageManager`をsetupします。publish script内部の`npm ci`と`npx`は、そのrelease artifactに記録されたtoolchainで実行します。

Store publish が re-approved された場合、script は `raycast-publish/README.md` と `raycast-publish/CHANGELOG.md` を publish source の root `README.md` / `CHANGELOG.md` として使います。source-use root の `README.md`、`README.ja.md`、`docs/`、root `CHANGELOG.md`、`.github/`、`_local/`、`raycast-publish/` は publish source から除外します。

開いている Raycast Pull Request がない場合、script は prepared publish source 上で Raycast の公式 publish command を実行します。開いている Pull Request がある場合は、prepared publish source を `raycast/extensions` fork branch に配置して既存 Pull Request を更新します。

外部 GitHub state を変える作業は、各作業の実施前に別途承認を取ります。

### 7.4 Toolchain freshness

`Toolchain Freshness` workflow は、毎週火曜日09:17（Asia/Tokyo）と手動実行時に、`.node-version` のNode.jsと `package.json#packageManager` のnpmを現在のlatestと比較します。このworkflowは`contents: read`だけを使い、branch、commit、Pull Request、Issueを作成しません。

npm latestのmajorがDependabot Coreの対応majorを超える場合は、互換性保留として理由とupstream sourceを表示します。ただし対応済みmajor内のlatestも別に取得するため、互換性保留中でもminor/patch updateを見逃しません。Dependabot Core main sourceはGitHub hosted serviceへの配備証明ではありません。採用するmajorの変更にはclean CIとGitHub hosted Dependabotの実行証拠が必要です。更新可能なstale toolchainは`npm run update:toolchain`による更新を要求します。

## 8. Store publish re-approval path

Raycast Store publish を再開する場合は、Store-facing resource と GitHub/Raycast 外部 state を一括で再承認します。

Raycast Store publish に関係する公式情報は次です。

- Raycast の public extension publish は `npm run publish` から `raycast/extensions` repository への Pull Request 作成または更新に接続されます。
  - https://developers.raycast.com/basics/publish-an-extension
- Raycast Store の準備では、README、metadata screenshots、Version History 用 changelog などの Store-facing resource が必要です。
  - https://developers.raycast.com/basics/prepare-an-extension-for-store

再承認対象は少なくとも次です。

- product direction と distribution model
- Store 公開用 publish source
- `.github/workflows/publish-release-to-raycast.yml`
- `scripts/publish-raycast-pr.mjs`
- `raycast-publish/publish.md`
- `raycast-publish/README.md`
- `raycast-publish/CHANGELOG.md`
- `raycast-publish/screenshots.md`
- Store screenshot / metadata workflow
- current screenshot/media procedure
- `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC`
- README / docs / GitHub About metadata

Store publish source では `raycast-publish/README.md` と `raycast-publish/CHANGELOG.md` を root 相当として使います。source-use root に root `CHANGELOG.md` を復帰する場合は、root surface の意味と README / GitHub Release / Store Version History の整合性を別途判断します。

GitHub Actions UI の workflow disable、repository secret の削除、GitHub Release publishing、Raycast Store publish、`raycast/extensions` Pull Request 作成または更新は、外部 state を変える作業として個別承認を取ります。
