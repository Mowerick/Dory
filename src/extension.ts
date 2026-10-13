import Gio from "gi://Gio";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import St from "gi://St";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import type * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { ShortcutMenu } from "./menu/ShortcutMenu.js";
import { PanelReveal } from "./panel/PanelReveal.js";
import { loadDefaultSections } from "./shortcuts/load.js";
import type { Section } from "./shortcuts/types.js";
import { parseSections } from "./shortcuts/validate.js";
import { Tooltip } from "./ui/Tooltip.js";

export default class DoryExtension extends Extension {
  private settings: Gio.Settings | null = null;
  private settingsChangedIds: number[] = [];
  private loading: Gio.Cancellable | null = null;
  private button: PanelMenu.Button | null = null;
  private menuOpenStateId = 0;
  private tooltip: Tooltip | null = null;
  private panelReveal: PanelReveal | null = null;

  override enable(): void {
    const settings = this.getSettings();
    const tooltip = new Tooltip();
    const panelReveal = new PanelReveal();

    const button = new PanelMenu.Button(0.0, this.metadata.name, false);
    button.add_child(
      new St.Icon({
        icon_name: "input-keyboard-symbolic",
        style_class: "system-status-icon",
      }),
    );
    const menu = button.menu as PopupMenu.PopupMenu;
    menu.box.add_style_class_name("dory-menu");

    const shortcutMenu = new ShortcutMenu(menu, tooltip, () =>
      this.openPreferences(),
    );
    let defaults: Section[] = [];
    const update = () =>
      shortcutMenu.setSections(activeSections(settings, defaults));
    update();
    const loading = new Gio.Cancellable();
    void loadDefaultSections(this.dir, loading).then((sections) => {
      if (loading.is_cancelled()) return;
      defaults = sections;
      update();
    });
    this.settingsChangedIds = [
      settings.connect("changed::show-default-shortcuts", update),
      settings.connect("changed::custom-shortcuts", update),
    ];

    this.menuOpenStateId = menu.connect("open-state-changed", (_menu, open) => {
      if (open) {
        shortcutMenu.restore();
      } else {
        tooltip.hide();
        panelReveal.restore();
      }
    });

    Main.panel.addToStatusArea(this.uuid, button);
    Main.wm.addKeybinding(
      "toggle-menu",
      settings,
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => {
        if (menu.isOpen) {
          menu.close();
        } else {
          panelReveal.show(button);
          menu.open();
        }
      },
    );

    this.settings = settings;
    this.loading = loading;
    this.button = button;
    this.tooltip = tooltip;
    this.panelReveal = panelReveal;
  }

  override disable(): void {
    Main.wm.removeKeybinding("toggle-menu");
    for (const id of this.settingsChangedIds) this.settings?.disconnect(id);
    this.settingsChangedIds = [];
    this.settings = null;
    this.loading?.cancel();
    this.loading = null;
    this.panelReveal?.reset();
    this.panelReveal = null;
    if (this.menuOpenStateId)
      this.button?.menu.disconnect(this.menuOpenStateId);
    this.menuOpenStateId = 0;
    // Destroying the button closes the menu, which still uses the tooltip.
    this.button?.destroy();
    this.button = null;
    this.tooltip?.destroy();
    this.tooltip = null;
  }
}

function activeSections(
  settings: Gio.Settings,
  defaults: Section[],
): Section[] {
  const { sections: custom, problems } = parseSections(
    settings.get_string("custom-shortcuts"),
  );
  for (const problem of problems)
    console.warn(`Dory: custom-shortcuts: ${problem}`);
  return [
    ...(settings.get_boolean("show-default-shortcuts") ? defaults : []),
    ...custom,
  ];
}
