import { Toast, showHUD, showToast } from "@raycast/api";

type FailureToastOptions = {
  title: string;
  message: string;
};

export async function showFailureToast({ title, message }: FailureToastOptions): Promise<void> {
  try {
    await showToast({ style: Toast.Style.Failure, title, message });
  } catch (error) {
    console.error("[MdClip] Could not show a failure notification.", error);
  }
}

export async function showCopySuccessHUD(title: string): Promise<void> {
  try {
    await showHUD(title);
  } catch (error) {
    console.error("[MdClip] Could not show the copy confirmation.", error);
  }
}
