# MdClip Store Publish Re-Approval Resources

## Purpose

This directory is the Store publish re-approval resource set for MdClip.

| Item             | Current role                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| Audience         | Maintainers reviewing a future Raycast Store publish path                    |
| Current status   | Store publication requires explicit re-approval before use                   |
| Active user path | GitHub Release `Source code (zip)` and local Raycast development mode        |
| Entry point      | Start here, then use the Store-facing files in this directory after approval |

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

The Store publication path is preserved here as a reusable resource set for future coordinated re-approval.

## Files In This Directory

| File             | Role                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `publish.md`     | Entry point, background, re-approval checklist, and Store publication procedure                  |
| `README.md`      | Store-facing README source to use as root `README.md` in a prepared publish source               |
| `CHANGELOG.md`   | Store Version History source to use as root `CHANGELOG.md` in a prepared publish source          |
| `screenshots.md` | Store screenshot and metadata procedure to use after Store publication is explicitly re-approved |

## Active Root Versus Publish Source

The repository root is source-use oriented. Keep Store-only content in `raycast-publish/` during normal development.

| Surface                          | Normal repository role            | Store publish-source role                                                                    |
| -------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| Root `README.md`                 | GitHub/source-use README          | Replace with `raycast-publish/README.md` only inside a prepared publish source               |
| Root `README.ja.md`              | GitHub/source-use Japanese README | Exclude from the prepared publish source unless Store publication is re-approved in Japanese |
| Root `CHANGELOG.md`              | Not active in the source-use root | Restore from `raycast-publish/CHANGELOG.md` only inside a prepared publish source            |
| `docs/`                          | Source-use and maintainer docs    | Exclude from the prepared publish source                                                     |
| `metadata/mdclip-*.png`          | Current MdClip UI evidence        | Store screenshots when Store publication is re-approved                                      |
| `media/mdclip-1.png`             | GitHub README media               | README media for the publish source                                                          |
| `.github/release-changelog/*.md` | GitHub Release bodies             | Not Raycast Store Version History                                                            |

## Store Re-Approval Checklist

Before Store publication is resumed, explicitly re-approve all of the following as one coordinated Store path:

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

Do not enable the workflow, add secrets, publish a GitHub Release to Raycast, or create/update a `raycast/extensions` pull request without explicit approval.

## Store Publish Procedure After Re-Approval

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
9. Set repository secret `RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC` with the approved token.
10. Run the guarded Raycast publish workflow for the approved release tag.
11. Review the created or updated `raycast/extensions` pull request.
12. After publication work is complete or stopped, set `MDCLIP_RAYCAST_STORE_PUBLISH_REAPPROVED` back to `false` or remove it.

## Human-Owned External Steps

The following steps are external GitHub/Raycast actions and must be performed by the user or separately approved for automation:

- enabling or disabling GitHub Actions workflows
- adding, changing, or deleting GitHub Actions secrets
- changing GitHub Actions repository variables
- running the publish workflow
- creating or updating GitHub Releases
- responding to Raycast review comments

Human-facing instructions for these steps must include what to do, why it is needed, where to do it, how completion is confirmed, and what result to return.
