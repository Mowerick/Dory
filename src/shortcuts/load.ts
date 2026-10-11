import type Gio from "gi://Gio";

import type { Section } from "./types.js";
import { parseSections } from "./validate.js";

export function loadDefaultSections(extensionDir: Gio.File): Section[] {
  let json: string;
  try {
    const [, bytes] = extensionDir
      .get_child("shortcuts.json")
      .load_contents(null);
    json = new TextDecoder().decode(bytes);
  } catch (error) {
    console.warn(
      `Dory: cannot read shortcuts.json: ${(error as Error).message}`,
    );
    return [];
  }

  const { sections, problems } = parseSections(json);
  for (const problem of problems)
    console.warn(`Dory: shortcuts.json: ${problem}`);
  return sections;
}
