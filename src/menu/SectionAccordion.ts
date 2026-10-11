import Clutter from "gi://Clutter";
import St from "gi://St";

import { ensureActorVisibleInScrollView } from "resource:///org/gnome/shell/misc/animationUtils.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import type { Section } from "../shortcuts/types.js";
import type { Tooltip } from "../ui/Tooltip.js";
import { buildRow } from "./row.js";
import { NO_ANIMATION } from "./noAnimation.js";

export class SectionAccordion {
  readonly items: PopupMenu.PopupSubMenuMenuItem[];
  private open: PopupMenu.PopupSubMenuMenuItem | null = null;

  constructor(sections: Section[], tooltip: Tooltip) {
    this.items = sections.map((section) => this.buildSection(section, tooltip));
  }

  restore(): void {
    if (this.open) this.show(this.open);
  }

  private buildSection(
    section: Section,
    tooltip: Tooltip,
  ): PopupMenu.PopupSubMenuMenuItem {
    const submenu = new PopupMenu.PopupSubMenuMenuItem(section.title, true);
    if (submenu.icon) submenu.icon.icon_name = section.icon;
    submenu.menu.actor.add_style_class_name("dory-section");

    // Route clicks and Left/Right through show/hide so only one section is open.
    submenu._setOpenState = (open) => {
      if (open) this.show(submenu);
      else this.hide(submenu);
    };

    for (const shortcut of section.items) {
      const row = buildRow(shortcut, tooltip);
      // Scroll arrow-key focus into view; hovering also focuses rows, but must not scroll.
      row.connect("key-focus-in", () => {
        // Null when focus moves without an event; the typings miss that.
        const event = Clutter.get_current_event() as Clutter.Event | null;
        if (event?.type() === Clutter.EventType.KEY_PRESS)
          ensureActorVisibleInScrollView(submenu.menu.actor, row);
      });
      submenu.menu.addMenuItem(row);
    }
    return submenu;
  }

  private show(submenu: PopupMenu.PopupSubMenuMenuItem): void {
    if (submenu.menu.isOpen) return;

    for (const other of this.items) {
      if (other !== submenu) other.menu.close(NO_ANIMATION);
    }
    submenu.menu.open(NO_ANIMATION);
    // open() disables scrolling when the whole menu fits, which would clip at max-height.
    submenu.menu.actor.vscrollbar_policy = St.PolicyType.AUTOMATIC;
    this.open = submenu;
  }

  private hide(submenu: PopupMenu.PopupSubMenuMenuItem): void {
    submenu.menu.close(NO_ANIMATION);
    if (this.open === submenu) this.open = null;
  }
}
