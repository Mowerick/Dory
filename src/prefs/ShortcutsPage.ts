import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import { keysToText } from "../shortcuts/keysText.js";
import type { Section, Shortcut } from "../shortcuts/types.js";
import {
  combosOf,
  DEFAULT_SECTION_ICON,
  parseSections,
} from "../shortcuts/validate.js";
import type { CustomShortcuts } from "./CustomShortcuts.js";
import { openShortcutDialog } from "./ShortcutDialog.js";

export class ShortcutsPage {
  readonly page: Adw.PreferencesPage;
  private readonly banner = new Adw.Banner();
  private readonly sectionsGroup: Adw.PreferencesGroup;
  private sectionRows: Gtk.Widget[] = [];
  private readonly expanded = new Set<Section>();
  private readonly editingRows: Gtk.Widget[] = [];
  private writableChangedId = 0;

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    private readonly window: Adw.PreferencesWindow,
    private readonly settings: Gio.Settings,
    private readonly custom: CustomShortcuts,
    private readonly defaults: Section[],
  ) {
    this.page = new Adw.PreferencesPage({
      title: "Shortcuts",
      icon_name: "input-keyboard-symbolic",
      banner: this.banner,
    });

    this.page.add(this.buildDefaultsGroup());

    this.sectionsGroup = new Adw.PreferencesGroup({
      title: "Your Shortcuts",
      description:
        "Listed in the menu after the built-in ones. Changes apply at once.",
    });
    const addSection = new Gtk.Button({
      icon_name: "list-add-symbolic",
      tooltip_text: "Add Section",
      valign: Gtk.Align.CENTER,
    });
    addSection.add_css_class("flat");
    addSection.connect("clicked", () => this.addSection());
    this.sectionsGroup.header_suffix = addSection;
    this.page.add(this.sectionsGroup);

    this.page.add(this.buildFilesGroup());
    this.page.add(this.buildClearGroup());
    this.writableChangedId = this.settings.connect(
      "writable-changed::custom-shortcuts",
      () => this.redraw(),
    );
    this.redraw();
  }

  destroy(): void {
    this.settings.disconnect(this.writableChangedId);
  }

  redraw(): void {
    for (const row of this.sectionRows) this.sectionsGroup.remove(row);
    this.sectionRows = this.custom.sections.map((section, i) =>
      this.buildSectionRow(section, i),
    );
    if (this.sectionRows.length === 0) {
      const placeholder = new Adw.ActionRow({
        title: "No sections yet",
        subtitle: "Add one with the + button, or import a file below",
      });
      placeholder.add_css_class("dim-label");
      this.sectionRows.push(placeholder);
    }
    for (const row of this.sectionRows) this.sectionsGroup.add(row);

    for (const section of this.expanded) {
      if (!this.custom.sections.includes(section))
        this.expanded.delete(section);
    }
    this.updateBanner();
  }

  private updateBanner(): void {
    const writable = this.custom.writable;
    this.sectionsGroup.sensitive = writable;
    for (const row of this.editingRows) row.sensitive = writable;
    if (!writable) {
      this.banner.title =
        "Your shortcuts are locked by the system and cannot be changed here";
    } else if (this.custom.problems.length > 0) {
      const count = this.custom.problems.length;
      this.banner.title =
        `${count} saved ${count === 1 ? "entry" : "entries"} could not be read and ` +
        `${count === 1 ? "is" : "are"} left out; the next change here removes ` +
        `${count === 1 ? "it" : "them"} for good`;
    }
    this.banner.revealed = !writable || this.custom.problems.length > 0;
  }

  private buildDefaultsGroup(): Adw.PreferencesGroup {
    const group = new Adw.PreferencesGroup({ title: "Built-in Shortcuts" });

    const show = new Adw.SwitchRow({
      title: "Show Built-in Shortcuts",
      subtitle: `${this.defaults.length} sections that come with Dory`,
    });
    this.settings.bind(
      "show-default-shortcuts",
      show,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );
    group.add(show);

    const copy = new Adw.ActionRow({
      title: "Copy Into Your Shortcuts",
      subtitle: "To change or remove some of them; turns the built-in ones off",
      activatable: true,
    });
    copy.add_suffix(new Gtk.Image({ icon_name: "edit-copy-symbolic" }));
    copy.connect("activated", () => this.copyDefaults());
    group.add(copy);
    this.editingRows.push(copy);
    return group;
  }

  private buildFilesGroup(): Adw.PreferencesGroup {
    const group = new Adw.PreferencesGroup({
      title: "Files",
      description: "JSON in the same format as Dory's shortcuts.json.",
    });

    const importRow = new Adw.ActionRow({
      title: "Import",
      subtitle: "Add sections from a file, or replace yours with them",
      activatable: true,
    });
    importRow.add_suffix(
      new Gtk.Image({ icon_name: "document-open-symbolic" }),
    );
    importRow.connect("activated", () => this.importFile());
    group.add(importRow);

    const exportRow = new Adw.ActionRow({
      title: "Export",
      subtitle: "Save your sections to a file",
      activatable: true,
    });
    exportRow.add_suffix(
      new Gtk.Image({ icon_name: "document-save-symbolic" }),
    );
    exportRow.connect("activated", () => this.exportFile());
    group.add(exportRow);

    this.editingRows.push(importRow);
    return group;
  }

  private buildClearGroup(): Adw.PreferencesGroup {
    const group = new Adw.PreferencesGroup();
    const clear = new Adw.ButtonRow({ title: "Remove All Your Shortcuts" });
    clear.add_css_class("destructive-action");
    clear.connect("activated", () => this.clear());
    group.add(clear);
    this.editingRows.push(clear);
    return group;
  }

  private buildSectionRow(section: Section, index: number): Adw.ExpanderRow {
    const count = section.items.length;
    const row = new Adw.ExpanderRow({
      title: section.title,
      subtitle:
        count === 0
          ? "No shortcuts yet"
          : `${count} shortcut${count === 1 ? "" : "s"}`,
      use_markup: false,
      expanded: this.expanded.has(section),
    });
    row.add_prefix(new Gtk.Image({ icon_name: section.icon }));
    row.connect("notify::expanded", () => {
      if (row.expanded) this.expanded.add(section);
      else this.expanded.delete(section);
    });
    for (const button of this.moveButtons(
      this.custom.sections,
      index,
      "Section",
    ))
      row.add_suffix(button);

    const title = new Adw.EntryRow({
      title: "Title",
      text: section.title,
      show_apply_button: true,
    });
    title.connect("apply", () => {
      const text = title.text.trim();
      if (!text) {
        title.text = section.title;
        this.toast("A section needs a title");
        return;
      }
      section.title = text;
      this.save();
    });
    row.add_row(title);

    row.add_row(this.buildIconRow(section));

    section.items.forEach((shortcut, i) =>
      row.add_row(this.buildShortcutRow(section, shortcut, i)),
    );

    const add = new Adw.ButtonRow({
      title: "Add Shortcut",
      start_icon_name: "list-add-symbolic",
    });
    add.connect("activated", () =>
      openShortcutDialog(this.window, null, (shortcut) => {
        section.items.push(shortcut);
        this.save();
      }),
    );
    row.add_row(add);

    const remove = new Adw.ButtonRow({ title: "Remove Section" });
    remove.add_css_class("destructive-action");
    remove.connect("activated", () =>
      this.confirm(
        `Remove “${section.title}”?`,
        count === 0
          ? ""
          : `Its ${count} shortcut${count === 1 ? "" : "s"} will be removed too.`,
        "Remove",
        () => {
          this.custom.sections.splice(this.custom.sections.indexOf(section), 1);
          this.save();
        },
      ),
    );
    row.add_row(remove);
    return row;
  }

  private buildIconRow(section: Section): Adw.EntryRow {
    const row = new Adw.EntryRow({
      title: "Icon Name",
      text: section.icon,
      show_apply_button: true,
    });
    const preview = new Gtk.Image({ icon_name: section.icon });
    row.add_suffix(preview);

    const display = Gdk.Display.get_default();
    const theme = display ? Gtk.IconTheme.get_for_display(display) : null;
    const check = () => {
      const name = row.text.trim();
      preview.icon_name = name || DEFAULT_SECTION_ICON;
      const missing = name !== "" && theme !== null && !theme.has_icon(name);
      if (missing) row.add_css_class("warning");
      else row.remove_css_class("warning");
      row.tooltip_text = missing
        ? "No icon with this name in the current icon theme"
        : "";
    };
    row.connect("changed", check);
    check();

    row.connect("apply", () => {
      section.icon = row.text.trim() || DEFAULT_SECTION_ICON;
      this.save();
    });
    return row;
  }

  private buildShortcutRow(
    section: Section,
    shortcut: Shortcut,
    index: number,
  ): Adw.ActionRow {
    const row = new Adw.ActionRow({
      title: shortcut.label,
      subtitle:
        keysToText(combosOf(shortcut.keys)) +
        (shortcut.sequence ? " (one after another)" : ""),
      use_markup: false,
      activatable: true,
    });
    row.connect("activated", () =>
      openShortcutDialog(this.window, shortcut, (edited) => {
        section.items[section.items.indexOf(shortcut)] = edited;
        this.save();
      }),
    );
    for (const button of this.moveButtons(section.items, index, "Shortcut"))
      row.add_suffix(button);

    const remove = new Gtk.Button({
      icon_name: "user-trash-symbolic",
      tooltip_text: "Remove Shortcut",
      valign: Gtk.Align.CENTER,
    });
    remove.add_css_class("flat");
    remove.connect("clicked", () => {
      section.items.splice(section.items.indexOf(shortcut), 1);
      this.save();
    });
    row.add_suffix(remove);
    return row;
  }

  private moveButtons<T>(list: T[], index: number, what: string): Gtk.Button[] {
    const move = (offset: number) => {
      const [item] = list.splice(index, 1);
      list.splice(index + offset, 0, item);
      this.save();
    };
    const up = new Gtk.Button({
      icon_name: "go-up-symbolic",
      tooltip_text: `Move ${what} Up`,
      valign: Gtk.Align.CENTER,
      sensitive: index > 0,
    });
    up.add_css_class("flat");
    up.connect("clicked", () => move(-1));
    const down = new Gtk.Button({
      icon_name: "go-down-symbolic",
      tooltip_text: `Move ${what} Down`,
      valign: Gtk.Align.CENTER,
      sensitive: index < list.length - 1,
    });
    down.add_css_class("flat");
    down.connect("clicked", () => move(1));
    return [up, down];
  }

  private addSection(): void {
    const section: Section = {
      title: "New Section",
      icon: DEFAULT_SECTION_ICON,
      items: [],
    };
    this.custom.sections.push(section);
    this.expanded.add(section);
    this.save();
  }

  private copyDefaults(): void {
    const copy = () => {
      this.custom.sections.push(
        ...(JSON.parse(JSON.stringify(this.defaults)) as Section[]),
      );
      this.save();
      this.settings.set_boolean("show-default-shortcuts", false);
      this.toast("Copied the built-in shortcuts into yours");
    };
    // Copying twice would list everything twice.
    if (this.custom.sections.length > 0)
      this.confirm(
        "Copy the built-in shortcuts?",
        "They are added after the sections you already have.",
        "Copy",
        copy,
        false,
      );
    else copy();
  }

  private importFile(): void {
    const dialog = new Gtk.FileDialog({
      title: "Import Shortcuts",
      default_filter: jsonFilter(),
    });
    dialog.open(this.window, null, (_dialog, result) => {
      let file: Gio.File;
      try {
        file = dialog.open_finish(result);
      } catch {
        return; // Dismissed.
      }

      let json: string;
      try {
        const [, bytes] = file.load_contents(null);
        json = new TextDecoder().decode(bytes);
      } catch (error) {
        this.toast(`Cannot read the file: ${(error as Error).message}`);
        return;
      }

      const { sections, problems } = parseSections(json);
      if (sections.length === 0) {
        this.toast(
          problems[0]
            ? `Nothing to import: ${problems[0]}`
            : "The file has no sections",
        );
        return;
      }
      const skipped =
        problems.length > 0 ? ` (${problems.length} entries skipped)` : "";
      const finish = (replace: boolean) => {
        if (replace) this.custom.sections = sections;
        else this.custom.sections.push(...sections);
        this.save();
        this.toast(
          `Imported ${sections.length} section${sections.length === 1 ? "" : "s"}${skipped}`,
        );
      };
      if (this.custom.sections.length === 0) {
        finish(true);
        return;
      }

      const choice = new Adw.AlertDialog({
        heading: "Import Shortcuts",
        body: `The file has ${sections.length} section${sections.length === 1 ? "" : "s"}. Add ${sections.length === 1 ? "it" : "them"} after yours, or replace yours?`,
      });
      choice.add_response("cancel", "Cancel");
      choice.add_response("replace", "Replace");
      choice.add_response("add", "Add");
      choice.set_response_appearance(
        "replace",
        Adw.ResponseAppearance.DESTRUCTIVE,
      );
      choice.set_response_appearance("add", Adw.ResponseAppearance.SUGGESTED);
      choice.default_response = "add";
      choice.close_response = "cancel";
      choice.connect("response", (_choice, response) => {
        if (response !== "cancel") finish(response === "replace");
      });
      choice.present(this.window);
    });
  }

  private exportFile(): void {
    const dialog = new Gtk.FileDialog({
      title: "Export Shortcuts",
      initial_name: "dory-shortcuts.json",
      default_filter: jsonFilter(),
    });
    dialog.save(this.window, null, (_dialog, result) => {
      let file: Gio.File;
      try {
        file = dialog.save_finish(result);
      } catch {
        return; // Dismissed.
      }

      try {
        const json = `${JSON.stringify(this.custom.sections, null, 2)}\n`;
        file.replace_contents(
          new TextEncoder().encode(json),
          null,
          false,
          Gio.FileCreateFlags.REPLACE_DESTINATION,
          null,
        );
        this.toast(`Saved to ${file.get_basename() ?? file.get_uri()}`);
      } catch (error) {
        this.toast(`Cannot save the file: ${(error as Error).message}`);
      }
    });
  }

  private clear(): void {
    if (this.custom.sections.length === 0) return;
    this.confirm(
      "Remove all your shortcuts?",
      "Export them first if you might want them back.",
      "Remove All",
      () => {
        this.custom.sections = [];
        this.save();
      },
    );
  }

  private save(): void {
    this.custom.save();
    this.redraw();
  }

  private confirm(
    heading: string,
    body: string,
    action: string,
    onConfirm: () => void,
    destructive = true,
  ): void {
    const dialog = new Adw.AlertDialog({ heading, body });
    dialog.add_response("cancel", "Cancel");
    dialog.add_response("confirm", action);
    dialog.set_response_appearance(
      "confirm",
      destructive
        ? Adw.ResponseAppearance.DESTRUCTIVE
        : Adw.ResponseAppearance.SUGGESTED,
    );
    dialog.default_response = "cancel";
    dialog.close_response = "cancel";
    dialog.connect("response", (_dialog, response) => {
      if (response === "confirm") onConfirm();
    });
    dialog.present(this.window);
  }

  private toast(title: string): void {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    this.window.add_toast(new Adw.Toast({ title, use_markup: false }));
  }
}

function jsonFilter(): Gtk.FileFilter {
  const filter = new Gtk.FileFilter({ name: "JSON files" });
  filter.add_mime_type("application/json");
  filter.add_suffix("json");
  return filter;
}
