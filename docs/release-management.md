# リリース管理手順

## 1. 目的

この文書は、`Prompt Launcher` の GitHub Release と Raycast Store publish を GitHub Actions で扱うための手順を定義する。

ローカルではリリースタグ作成、GitHub Release 作成、`ray publish` を実行しない。

## 2. 管理対象

リリース管理は、次の 3 つを分けて扱う。

| 対象 | 管理場所 | 役割 |
| --- | --- | --- |
| GitHub のリリース識別子 | Git tag / GitHub Release | `v0.1.0` などの内部管理バージョン |
| Raycast Store の Version History | `CHANGELOG.md` | Raycast 利用者向けの変更履歴 |
| GitHub Release の生成情報 | `.github/release-manifest.json` | tag、release title、release body の参照元 |

`package.json` に `version` は定義しない。

`VERSION` や `release.json` のような別のバージョン管理ファイルは作成しない。

## 3. `CHANGELOG.md`

`CHANGELOG.md` は Raycast Store の Version History に表示される利用者向け変更履歴として扱う。

Raycast Store に publish する変更では、次の形式の entry を追加する。

```markdown
## [Initial Release] - {PR_MERGE_DATE}
```

`{PR_MERGE_DATE}` は Raycast の公開 Pull Request が merge された日付として扱われるため、ローカルや GitHub Release 作成時には日付へ置換しない。

GitHub Release 用の `v0.1.0` は `CHANGELOG.md` の見出しに含めない。

## 4. `.github/release-manifest.json`

`.github/release-manifest.json` は、次回 GitHub Release の tag、title、GitHub Release body の参照元を管理する。

初期リリースでは以下の内容とする。

```json
{
  "tag": "v0.1.0",
  "title": "v0.1.0",
  "repository": "uchimanajet7/raycast-prompt-launcher",
  "githubRelease": {
    "bodySource": "changelog-entry"
  },
  "changelog": {
    "file": "CHANGELOG.md",
    "entryTitle": "Initial Release"
  }
}
```

`githubRelease.bodySource` が `changelog-entry` の場合、GitHub Release body は `CHANGELOG.md` の該当 entry から生成する。

生成される GitHub Release body の先頭には、tag 固定の `CHANGELOG.md` entry へのリンクを含める。

例:

```markdown
See [CHANGELOG.md / Initial Release](https://github.com/uchimanajet7/raycast-prompt-launcher/blob/v0.1.0/CHANGELOG.md#initial-release---pr_merge_date).
```

リンク先は `main` ではなく tag を使う。これにより、後続リリースで `CHANGELOG.md` が変わっても、GitHub Release は作成時点の変更履歴を参照する。

## 5. GitHub-only release

Raycast Store へ publish しない GitHub-only release では、Workflow 実行時に `publish_to_raycast` を `false` にする。

この場合、`ray publish` は実行しない。

Raycast Store 利用者に影響しない変更だけを GitHub Release として区切る場合は、`CHANGELOG.md` に Raycast Store 向け entry を追加しない。

GitHub-only release で GitHub Release body を `CHANGELOG.md` 以外から作る場合は、`.github/release-manifest.json` の `githubRelease.bodySource` を `manifest-notes` とし、`githubRelease.notes` に本文を記載する。

例:

```json
{
  "tag": "v0.1.1",
  "title": "v0.1.1",
  "repository": "uchimanajet7/raycast-prompt-launcher",
  "githubRelease": {
    "bodySource": "manifest-notes",
    "notes": [
      "Update repository maintenance files without changing Raycast user-facing behavior."
    ]
  }
}
```

`publish_to_raycast` が `true` の場合、`manifest-notes` は使用しない。

## 6. GitHub Actions

リリースは、`.github/workflows/release.yml` を GitHub Actions 画面から手動実行する。

Workflow input は以下とする。

| Input | 型 | 説明 |
| --- | --- | --- |
| `publish_to_raycast` | boolean | `true` の場合は Raycast Store publish を実行する。`false` の場合は GitHub Release だけを作成する |

`release.yml` は以下を実行する。

1. `.github/release-manifest.json` を検証する
2. `npm run check` を実行する
3. manifest の `tag` を release tag として作成する
4. `publish_to_raycast` が `true` の場合だけ `.github/workflows/raycast-publish.yml` を呼び出す
5. GitHub Release body を生成する
6. GitHub Release を作成する

`publish_to_raycast` が `true` で Raycast publish が失敗した場合、GitHub Release は作成しない。release tag は作成済みの状態で残る。

`raycast-publish.yml` は以下を実行する。

1. release tag を checkout する
2. `.github/release-manifest.json` を Raycast publish 用として検証する
3. `npm run check` を実行する
4. `npm run build` を実行する
5. `npm run lint` を実行する
6. `npm run publish` を実行する

## 7. Dependabot

依存 package と GitHub Actions の更新検知は `.github/dependabot.yml` で管理する。

Dependabot は、更新候補の Pull Request を作成する。Dependabot の Pull Request は GitHub Release や Raycast Store publish ではない。

Dependabot の Pull Request を反映する場合は、人間がローカルで変更箇所を確認してから判断する。自動 merge、自動 publish、自動 release は行わない。

## 8. Secret

Raycast Store publish を GitHub Actions から実行する場合、Repository secret に `RAYCAST_PUBLISH_GITHUB_TOKEN` を設定する。

`RAYCAST_PUBLISH_GITHUB_TOKEN` は、Raycast の token ではなく GitHub の Personal Access Token である。

この token は、`npm run publish` が `raycast/extensions` へ公開 Pull Request を作成するための GitHub 認証に使う。

GitHub Actions 標準の `GITHUB_TOKEN` は、このリポジトリ内の workflow 実行用 token であり、権限は workflow を含むリポジトリに限定される。そのため、`raycast/extensions` へ公開 Pull Request を作成する `npm run publish` には使用しない。

`RAYCAST_PUBLISH_GITHUB_TOKEN` には、Public Store へ公開 Pull Request を作成する GitHub アカウントで作成した Personal Access Token を設定する。

GitHub は、可能な場合は Personal Access Token classic ではなく fine-grained personal access token を使うことを推奨している。そのため、初回の Raycast Store publish 前に fine-grained personal access token で publish workflow を検証する。

ただし、fine-grained personal access token には「自分または所属 organization が所有していない public repository への contribution」に関する制限がある。Raycast Store publish は `raycast/extensions` への公開 Pull Request 作成を含むため、fine-grained personal access token がこの用途で動作するかは実際の publish workflow で確認する。

fine-grained personal access token で publish workflow が成功した場合は、`RAYCAST_PUBLISH_GITHUB_TOKEN` の標準 token 種別を fine-grained personal access token として、この文書を再整理する。

fine-grained personal access token で publish workflow が失敗し、原因が fine-grained personal access token の repository access または contribution 制限である場合は、Personal Access Token classic に切り替える。この場合の scope は、Public Store への Pull Request 作成に必要な public repository 操作として `public_repo` を設定する。`repo` は private repository も含むため、この用途では選択しない。

### 7.1 fine-grained personal access token の検証手順

fine-grained personal access token で検証する手順は以下とする。

1. GitHub の `Settings` を開く
2. `Developer settings` を開く
3. `Personal access tokens` を開く
4. `Fine-grained tokens` を開く
5. `Generate new token` を選ぶ
6. `Token name` に `raycast-prompt-launcher publish verification` など用途が分かる名前を入力する
7. `Expiration` を設定する
8. `Resource owner` に Public Store へ公開 Pull Request を作成する GitHub アカウントを選ぶ
9. `Repository access` は、`raycast/extensions` の fork が存在する場合はその fork を選ぶ
10. `raycast/extensions` の fork が存在しない、または Raycast CLI が publish 時に fork 作成を必要とする場合は、fine-grained personal access token で publish workflow が成立するかを検証する
11. `Repository permissions` で `Contents` を `Read and write` にする
12. `Repository permissions` で `Pull requests` を `Read and write` にする
13. token を生成し、値をコピーする
14. 生成した token を Repository Secret `RAYCAST_PUBLISH_GITHUB_TOKEN` に設定する
15. `.github/workflows/release.yml` を `publish_to_raycast: true` で実行する
16. publish workflow が成功するか確認する

検証結果は以下のどちらかとして扱う。

| 結果 | 後続対応 |
| --- | --- |
| 成功 | `RAYCAST_PUBLISH_GITHUB_TOKEN` の標準 token 種別を fine-grained personal access token として、この文書を更新する |
| 失敗 | エラーログを確認し、fine-grained personal access token の権限不足または contribution 制限が原因であれば Personal Access Token classic に切り替える |

### 7.2 Personal Access Token classic に切り替える場合の手順

Personal Access Token classic に切り替える場合の手順は以下とする。

1. GitHub の `Settings` を開く
2. `Developer settings` を開く
3. `Personal access tokens` を開く
4. `Tokens (classic)` を開く
5. `Generate new token` から `Generate new token (classic)` を選ぶ
6. `Note` に `raycast-prompt-launcher publish` など用途が分かる名前を入力する
7. `Expiration` を設定する
8. `Select scopes` で `public_repo` を選ぶ
9. token を生成し、値をコピーする

生成した token は、このリポジトリの GitHub Repository Secret として以下の名前で保存する。

```text
RAYCAST_PUBLISH_GITHUB_TOKEN
```

Repository Secret の設定手順は以下とする。

1. GitHub で `uchimanajet7/raycast-prompt-launcher` を開く
2. `Settings` を開く
3. `Secrets and variables` を開く
4. `Actions` を開く
5. `Secrets` tab で `New repository secret` を選ぶ
6. `Name` に `RAYCAST_PUBLISH_GITHUB_TOKEN` を入力する
7. `Secret` に Personal Access Token の値を入力する
8. `Add secret` で保存する

この secret が必要になる段階は、`.github/workflows/release.yml` を `publish_to_raycast: true` で実行し、`.github/workflows/raycast-publish.yml` の `npm run publish` step に到達した時である。

この secret が未設定、空、または権限不足の場合、Raycast Store publish は失敗する。

`publish_to_raycast` が `false` の GitHub-only release では、この secret は使用しない。

## 9. 実行前確認

Raycast Store へ publish する場合は、Workflow 実行前に以下を確認する。

- `.github/release-manifest.json` の `tag` が今回の GitHub Release と一致している
- `.github/release-manifest.json` の `title` が今回の GitHub Release と一致している
- `CHANGELOG.md` に `changelog.entryTitle` と一致する entry がある
- `CHANGELOG.md` の entry は Raycast Store 利用者向けの変更内容だけを記載している
- README に掲載するスクリーンショットを更新した場合は、`npm run sync:readme-media` を実行済みである
- `publish_to_raycast` を `true` にする
- `RAYCAST_PUBLISH_GITHUB_TOKEN` が Repository secret に設定されている
- fine-grained personal access token で publish workflow を検証済みである
- fine-grained personal access token で成功した場合は、その token を `RAYCAST_PUBLISH_GITHUB_TOKEN` に設定している
- fine-grained personal access token で失敗し、Personal Access Token classic に切り替えた場合は、`public_repo` scope を持つ token を `RAYCAST_PUBLISH_GITHUB_TOKEN` に設定している

GitHub-only release の場合は、Workflow 実行前に以下を確認する。

- `.github/release-manifest.json` の `tag` が今回の GitHub Release と一致している
- `.github/release-manifest.json` の `title` が今回の GitHub Release と一致している
- Raycast Store 利用者向け変更がない
- `publish_to_raycast` を `false` にする

## 10. ローカルで実行しないこと

ローカルでは以下を実行しない。

```bash
ray publish
```

```bash
npm run publish
```

```bash
gh release create
```

```bash
git tag v0.1.0
```

リリースタグ作成、GitHub Release 作成、Raycast Store publish は GitHub Actions の手動 Workflow で扱う。
