import St from "gi://St";

import { PopupAnimation } from "resource:///org/gnome/shell/ui/boxpointer.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import type { Section } from "../shortcuts/types.js";
import type { Tooltip } from "../ui/Tooltip.js";
import { buildRow } from "./row.js";

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

    for (const shortcut of section.items)
      submenu.menu.addMenuItem(buildRow(shortcut, tooltip));
    return submenu;
  }

  private show(submenu: PopupMenu.PopupSubMenuMenuItem): void {
    if (submenu.menu.isOpen) return;

    for (const other of this.items) {
      if (other !== submenu) other.menu.close(PopupAnimation.NONE);
    }
    submenu.menu.open(PopupAnimation.NONE);
    // open() disables scrolling when the whole menu fits, which would clip at max-height.
    submenu.menu.actor.vscrollbar_policy = St.PolicyType.AUTOMATIC;
    this.open = submenu;
  }

  private hide(submenu: PopupMenu.PopupSubMenuMenuItem): void {
    submenu.menu.close(PopupAnimation.NONE);
    if (this.open === submenu) this.open = null;
  }
}
