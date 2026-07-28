# MdClip Store Screenshot Checklist

## 1. Purpose

This document contains only the additional screenshot checks required when preparing MdClip for Raycast Store publication.

It does not define another capture procedure. Create, synchronize, and verify the shared MdClip screenshots by following the canonical [Screenshot and UI Evidence Procedure](../docs/screenshot-media.md), then apply this checklist.

Store publication is currently inactive. Do not use this checklist to start publication, enable a workflow, add a secret, change a repository variable, or create or update a `raycast/extensions` Pull Request. Those actions remain behind the coordinated prerequisites and re-approval guard in [Store Publication Resources](publish.md).

## 2. Current official requirements

Re-check the current Raycast documentation immediately before Store preparation:

- Raycast Prepare an Extension for Store:
  https://developers.raycast.com/basics/prepare-an-extension-for-store
- Raycast Publish an Extension:
  https://developers.raycast.com/basics/publish-an-extension

The current Raycast guidance states that:

- Store screenshots are extension metadata that users browse before installing.
- An extension can include at most six screenshots.
- Raycast recommends at least three screenshots.
- Screenshots should be created through Window Capture with the extension open in development mode and `Save to Metadata` selected.
- The background must provide enough contrast to understand the extension.
- Screenshots must not expose sensitive data.

Current official requirements take precedence if they change.

## 3. Shared MdClip screenshot set

MdClip uses the three screenshots already governed by `docs/screenshot-media.md`:

| Path                    | Store role                                              |
| ----------------------- | ------------------------------------------------------- |
| `metadata/mdclip-1.png` | Browsing and previewing a Markdown file from one source |
| `metadata/mdclip-2.png` | Explicit placeholder expansion through the Action Panel |
| `metadata/mdclip-3.png` | Searching across multiple configured Markdown Sources   |

Three screenshots satisfy Raycast's current recommendation of at least three and remain below the maximum of six. Do not add screenshots only to increase the count. Add or replace a screenshot only after a separately approved product-use-case decision.

`media/mdclip-1.png` is README/GitHub media synchronized from the first metadata screenshot. It is not an additional Store screenshot.

## 4. Store-specific checks

After the common procedure passes, confirm:

- all three accepted `metadata/mdclip-*.png` files are present in the exact source state selected for Store publication
- the Store-facing README and Store Version History describe the same current product and commands shown in the screenshots
- the screenshots help a prospective Store user understand the three distinct MdClip use cases before installation
- the screenshots still satisfy the latest Raycast count, capture, contrast, and sensitive-data requirements
- the prepared publish source preserves the accepted metadata images without generating, converting, cropping, resizing, compositing, or retouching replacements
- the Store publication prerequisites in `raycast-publish/publish.md` are complete before any external action

Do not repeat the common demo setup, Preferences, Window Capture settings, target states, capture steps, README synchronization, dimension checks, or general visual checks here. Their sole owner is `docs/screenshot-media.md`.

## 5. Pull Request review evidence

The Raycast publication process creates or updates a Pull Request in `raycast/extensions`.

For the selected publication:

1. Confirm that the Pull Request corresponds to the same source state and metadata screenshots reviewed above.
2. Provide the reviewer-facing `Screencast` evidence required by the Pull Request process.
3. Reference the current `metadata/mdclip-*.png` files in the review context when needed.
4. Treat reviewer feedback as Store-publication input; do not silently convert it into a general MdClip product requirement.

External GitHub or Raycast actions require their own explicit authorization at the time of execution.
