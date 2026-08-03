import { Cache } from "@raycast/api";

const DEFAULT_PREVIEW_ENABLED = true;
const PREVIEW_ENABLED_CACHE_KEY = "mdclip.preview.enabled";
let previewVisibilityCache: Cache | undefined;

export function readPreviewVisibility(): boolean {
  try {
    const storedValue = getPreviewVisibilityCache().get(PREVIEW_ENABLED_CACHE_KEY);

    if (storedValue === "true") {
      return true;
    }

    if (storedValue === "false") {
      return false;
    }
  } catch (error) {
    console.error("[MdClip] Could not read the preview setting.", error);
  }

  return DEFAULT_PREVIEW_ENABLED;
}

export function savePreviewVisibility(isEnabled: boolean): boolean {
  try {
    getPreviewVisibilityCache().set(PREVIEW_ENABLED_CACHE_KEY, String(isEnabled));
    return true;
  } catch (error) {
    console.error("[MdClip] Could not save the preview setting.", error);
    return false;
  }
}

function getPreviewVisibilityCache(): Cache {
  previewVisibilityCache ??= new Cache();
  return previewVisibilityCache;
}
