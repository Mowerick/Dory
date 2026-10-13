import Gio from "gi://Gio";
import GLib from "gi://GLib";

import type { Section } from "./types.js";
import { parseSections } from "./validate.js";

// Never rejects: an unreadable file gives no sections.
export function loadDefaultSections(
  extensionDir: Gio.File,
  cancellable: Gio.Cancellable | null = null,
): Promise<Section[]> {
  const file = extensionDir.get_child("shortcuts.json");
  return new Promise((resolve) => {
    file.load_contents_async(cancellable, (_file, result) => {
      let json: string;
      try {
        const [, bytes] = file.load_contents_finish(result);
        json = new TextDecoder().decode(bytes);
      } catch (error) {
        const cancelled =
          error instanceof GLib.Error &&
          error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED);
        if (!cancelled)
          console.warn(
            `Dory: cannot read shortcuts.json: ${(error as Error).message}`,
          );
        resolve([]);
        return;
      }

      const { sections, problems } = parseSections(json);
      for (const problem of problems)
        console.warn(`Dory: shortcuts.json: ${problem}`);
      resolve(sections);
    });
  });
}
