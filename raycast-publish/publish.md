# MdClip Store Publication Resources

## Purpose

This directory is the resource set for preparing and publishing MdClip to the Raycast Store.

| Item             | Current role                                                                    |
| ---------------- | ------------------------------------------------------------------------------- |
| Audience         | Maintainers preparing a Raycast Store publication path                          |
| Current status   | Store publication is inactive                                                   |
| Active user path | GitHub Release `Source code (zip)` and local Raycast development mode           |
| Entry point      | Complete the prerequisites below before enabling the Store publication workflow |

The files in this directory keep the Store-facing README, Store Version History, screenshot procedure, and publish background together so the Store publication path can be reviewed as one coordinated path.

## Current Distribution and Store Background

The extension was originally submitted to Raycast Store as `Prompt Launcher`:

- https://github.com/raycast/extensions/pull/27846

Raycast review treated that submission as close to existing prompt-management extensions such as Prompt Stash. The extension was then renamed and repositioned as `Local Copy Blocks`, with updated metadata, README, screenshots, and review context:

- https://github.com/raycast/extensions/pull/28617

Changing the name and description did not remove the Store review concern. The rewritten `Local Copy Blocks` submission was still treated as overlapping with existing snippet/reusable-text workflows such as Raycast Snippets and SnippetSurfer.

For that reason, the active repository path is now:

- public GitHub source use
- local Raycast development mode
- GitHub Releases as the release unit

The Store publication resources are kept together so the full publication path can be evaluated and prepared as one coordinated unit.

## Files In This Directory

| File             | Role                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| `publish.md`     | Entry point, background, prerequisites, and Store publication procedure                 |
| `README.md`      | Store-facing README source to use as root `README.md` in a prepared publish source      |
| `CHANGELOG.md`   | Store Version History source to use as root `CHANGELOG.md` in a prepared publish source |
| `screenshots.md` | Store screenshot and metadata procedure to complete before Store publication            |

## Active Root Versus Publish Source

The repository root is source-use oriented. Keep Store-only content in `raycast-publish/` during normal development.

| Surface                          | Normal repository role            | Store publish-source role                                                          |
| -------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| Root `README.md`                 | GitHub/source-use README          | Replace with `raycast-publish/README.md` only inside a prepared publish source     |
| Root `README.ja.md`              | GitHub/source-use Japanese README | Exclude unless Japanese Store publication is part of the selected publication plan |
| Root `CHANGELOG.md`              | Not active in the source-use root | Restore from `raycast-publish/CHANGELOG.md` only inside a prepared publish source  |
| `docs/`                          | Source-use and maintainer docs    | Exclude from the prepared publish source                                           |
| `metadata/mdclip-*.png`          | Current MdClip UI evidence        | Store screenshots after the Store-specific checks pass                             |
| `media/mdclip-1.png`             | GitHub README media               | README media for the publish source                                                |
| `.github/release-changelog/*.md` | GitHub Release bodies             | Not Raycast Store Version History                                                  |

## Store Publication Prerequisites

Before Store publication, confirm all of the following as one coordinated Store path:

- product direction and Store publication intent
- package metadata and categories
- Store-facing README
- Store Version History changelog
- Store screenshots and screenshot review
- publish workflow and script behavior
- GitHub Actions repository variable `MDCLIP_RAYCAST_STORE_PUBLISH_REAPPROVED`
- GitHub Actions secret `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC`
- target GitHub Release tag
- whether the existing Raycast review history should be referenced in any new PR comment

Keep the workflow disabled and do not add secrets or create or update a `raycast/extensions` pull request until every prerequisite is complete and Store publication is intentionally started.

## Publish Procedure

1. Re-check current Raycast documentation.
   - Prepare an Extension for Store: https://developers.raycast.com/basics/prepare-an-extension-for-store
   - Publish an Extension: https://developers.raycast.com/basics/publish-an-extension
   - Versioning: https://developers.raycast.com/information/versioning
2. Confirm the current product should still be submitted as MdClip.
3. Confirm `package.json` metadata, command titles, categories, and keywords are Store-appropriate.
4. Refresh screenshots by following `raycast-publish/screenshots.md`.
5. Confirm `raycast-publish/README.md` is the Store-facing README source.
6. Confirm `raycast-publish/CHANGELOG.md` is the Store Version History source.
7. Confirm the GitHub Release tag exists and points to the source state to publish.
8. Set repository variable `MDCLIP_RAYCAST_STORE_PUBLISH_REAPPROVED` to `true`.
9. Set repository secret `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` with the configured token.
10. Run the guarded Raycast publish workflow for the selected release tag.
11. Review the created or updated `raycast/extensions` pull request.
12. After publication work is complete or stopped, set `MDCLIP_RAYCAST_STORE_PUBLISH_REAPPROVED` back to `false` or remove it.

## External GitHub and Raycast Steps

The following steps change external GitHub or Raycast state. Perform them deliberately after every Store publication prerequisite is complete:

- enabling or disabling GitHub Actions workflows
- adding, changing, or deleting GitHub Actions secrets
- changing GitHub Actions repository variables
- running the publish workflow
- creating or updating GitHub Releases
- responding to Raycast review comments

For each external step, record what was changed, why it was needed, where it was performed, and how completion was confirmed.
