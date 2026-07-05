# MdClip リリース管理

## 1. 目的

この文書は、MdClip の release 管理方針を定義します。

現在の active release unit は GitHub Release です。Raycast Store publish は active path ではありません。

## 2. 現在の分類

| 対象                                             | 状態                  | 理由                                                                              |
| ------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------- |
| GitHub Release                                   | Active                | public GitHub repository から source を取得する利用者に向けた release unit        |
| `Release` workflow                               | Active                | GitHub tag と GitHub Release を作成する                                           |
| `Build` workflow                                 | Active                | build、local verification、Raycast CLI lint を確認する                            |
| Raycast Store publish                            | Inactive              | 現在の active distribution path ではない                                          |
| `Inactive - Publish Release to Raycast` workflow | Inactive guarded path | Store publish 再開時だけ使う。通常経路では実行しない                              |
| `raycast-publish/`                               | Inactive publish set  | Store 公開用 README、Version History、screenshot 手順、背景説明をまとめて保持する |
| root `CHANGELOG.md`                              | Not active            | root は source-use 入口のため、Store Version History を active-looking に置かない |
| Current screenshot/media procedure               | Active manual path    | README/GitHub media や release 前の UI evidence を current MdClip として確認する  |
| `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC`           | Cleanup candidate     | Store publish workflow を使わない限り不要                                         |

Raycast Store publish を再開する場合は、workflow、script、secret、Store Version History、screenshot、README、docs、GitHub About metadata をまとめて再承認します。Store publish source では `raycast-publish/README.md` と `raycast-publish/CHANGELOG.md` を root 相当として使いますが、通常の source-use root に root `CHANGELOG.md` を復帰しません。

## 3. 公式情報の位置づけ

- GitHub Releases は tag に基づき、release notes と source archive を公開できる repository-native release unit です。
  - https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- Raycast の public extension publish は `npm run publish` から `raycast/extensions` repository への Pull Request 作成または更新に接続されます。
  - https://developers.raycast.com/basics/publish-an-extension
- Raycast Store の準備では、README、metadata screenshots、Version History 用 changelog などの Store-facing resource が必要です。
  - https://developers.raycast.com/basics/prepare-an-extension-for-store
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

`previousRaycastStorePublishTag` は active manifest に含めません。Store publish state は現在の GitHub Release 作成に必要ありません。

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

既存 tag の release body file は履歴として残します。たとえば `.github/release-changelog/v0.1.4.md` は Local Copy Blocks history であり、MdClip transition release body ではありません。

## 6. Release 作成手順

GitHub Release を作成する場合は、次を行います。

1. 最後に作成済みの GitHub Release tag を確認する。
2. 今回作成する GitHub Release tag を決める。
3. `.github/release-changelog/vX.Y.Z.md` を作成または更新する。
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

1. `npm ci`
2. `npm run build`
3. `npm run lint`
4. `npm run lint:raycast`

### 7.2 Release

`Release` workflow は、GitHub tag と GitHub Release を作成する workflow です。

`Release` workflow は Raycast Store publish を呼び出しません。`publish_to_raycast` input も持ちません。

### 7.3 Inactive - Publish Release to Raycast

`Inactive - Publish Release to Raycast` workflow は、現在の active path ではありません。

この workflow は inactive guarded path として repository に残します。Repository variable `MDCLIP_RAYCAST_STORE_PUBLISH_REAPPROVED` が `true` でない場合、workflow は publish を実行しません。

`scripts/publish-raycast-pr.mjs` も `MDCLIP_RAYCAST_STORE_PUBLISH_REAPPROVED=true` がない場合は停止します。Store publish が re-approved された場合、script は `raycast-publish/README.md` と `raycast-publish/CHANGELOG.md` を publish source の root `README.md` / `CHANGELOG.md` として使います。通常 root の `README.md`、`README.ja.md`、`docs/`、root `CHANGELOG.md`、`.github/`、`_local/`、`raycast-publish/` は publish source から除外します。

開いている Raycast Pull Request がない場合、script は prepared publish source 上で Raycast の公式 publish command を実行します。開いている Pull Request がある場合は、prepared publish source を `raycast/extensions` fork branch に配置して既存 Pull Request を更新します。

GitHub Actions UI で workflow を disable する外部操作、repository secret の削除、GitHub Release publishing は、別途承認が必要です。

## 8. Store publish を再開する場合

Store publish を再開する場合は、少なくとも次を一括で再承認します。

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

再承認前に、Store publish 手順を通常利用者向けの active path として扱いません。
