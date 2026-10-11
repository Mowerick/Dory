import type Gio from "gi://Gio";

import type { Section } from "../shortcuts/types.js";
import { parseSections } from "../shortcuts/validate.js";

const KEY = "custom-shortcuts";

export class CustomShortcuts {
  sections: Section[] = [];
  problems: string[] = [];
  private lastWritten: string | null = null;

  constructor(private readonly settings: Gio.Settings) {
    this.reload();
  }

  get writable(): boolean {
    return this.settings.is_writable(KEY);
  }

  reload(): void {
    ({ sections: this.sections, problems: this.problems } = parseSections(
      this.settings.get_string(KEY),
    ));
  }

  save(): void {
    this.lastWritten = JSON.stringify(this.sections);
    this.settings.set_string(KEY, this.lastWritten);
    this.problems = [];
  }

  // Skips the change save() itself made.
  watch(onChange: () => void): number {
    return this.settings.connect(`changed::${KEY}`, () => {
      if (this.settings.get_string(KEY) === this.lastWritten) return;
      this.reload();
      onChange();
    });
  }
}
