import { PopupAnimation } from "resource:///org/gnome/shell/ui/boxpointer.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import type { Section } from "../shortcuts/types.js";
import type { Tooltip } from "../ui/Tooltip.js";
import { SectionAccordion } from "./SectionAccordion.js";

export class ShortcutMenu {
  private accordion: SectionAccordion | null = null;

  constructor(
    private readonly menu: PopupMenu.PopupMenu,
    private readonly tooltip: Tooltip,
    private readonly openSettings: () => void,
  ) {}

  setSections(sections: Section[]): void {
    // The rows are about to be destroyed.
    if (this.menu.isOpen) this.menu.close(PopupAnimation.NONE);
    this.tooltip.hide();
    this.menu.removeAll();

    const shown = sections.filter((section) => section.items.length > 0);
    if (shown.length > 0) {
      this.accordion = new SectionAccordion(shown, this.tooltip);
      for (const item of this.accordion.items) this.menu.addMenuItem(item);
    } else {
      this.accordion = null;
      const empty = new PopupMenu.PopupMenuItem("No shortcuts to show");
      empty.setSensitive(false);
      this.menu.addMenuItem(empty);
    }

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    const settings = new PopupMenu.PopupMenuItem("Edit shortcuts…");
    settings.connect("activate", () => this.openSettings());
    this.menu.addMenuItem(settings);
  }

  restore(): void {
    this.accordion?.restore();
  }
}
