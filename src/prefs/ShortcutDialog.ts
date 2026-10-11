import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

import { keysToText, parseKeysText } from "../shortcuts/keysText.js";
import type { Shortcut } from "../shortcuts/types.js";
import { combosOf, normalizeKeys } from "../shortcuts/validate.js";
import { buildKeycap } from "./keycap.js";

const KEYS_HELP =
  "Join keys with +, such as Ctrl+Shift+T. Separate alternatives with “ / ”, such as " +
  "Ctrl+A / Ctrl+E. Write arrow keys as larrow, rarrow, uarrow and darrow, and the + key as ++.";

export function openShortcutDialog(
  parent: Gtk.Widget,
  shortcut: Shortcut | null,
  onSave: (shortcut: Shortcut) => void,
): void {
  const dialog = new Adw.Dialog({
    title: shortcut ? "Edit Shortcut" : "Add Shortcut",
    content_width: 480,
  });

  const cancel = new Gtk.Button({ label: "Cancel" });
  const save = new Gtk.Button({ label: shortcut ? "Save" : "Add" });
  save.add_css_class("suggested-action");
  const header = new Adw.HeaderBar({
    show_start_title_buttons: false,
    show_end_title_buttons: false,
  });
  header.pack_start(cancel);
  header.pack_end(save);

  const label = new Adw.EntryRow({
    title: "Label",
    text: shortcut?.label ?? "",
  });
  const keys = new Adw.EntryRow({
    title: "Keys",
    text: shortcut ? keysToText(combosOf(shortcut.keys)) : "",
  });
  const sequence = new Adw.SwitchRow({
    title: "Pressed one after another",
    subtitle: "Instead of being alternatives",
    active: shortcut?.sequence ?? false,
  });
  const preview = new Adw.ActionRow({ title: "Shown as" });
  const details = new Adw.EntryRow({
    title: "Details (optional)",
    text: shortcut?.details ?? "",
  });

  const fields = new Adw.PreferencesGroup({ description: KEYS_HELP });
  fields.add(label);
  fields.add(keys);
  fields.add(sequence);
  fields.add(preview);

  const more = new Adw.PreferencesGroup({
    description: "Shown when hovering the shortcut in the menu.",
  });
  more.add(details);

  const page = new Adw.PreferencesPage();
  page.add(fields);
  page.add(more);
  const view = new Adw.ToolbarView({ content: page });
  view.add_top_bar(header);
  dialog.child = view;

  let keycap: Gtk.Widget | null = null;
  const read = (): Shortcut | null => {
    const parsedKeys = normalizeKeys(parseKeysText(keys.text));
    const text = label.text.trim();
    if (!text || parsedKeys.length === 0) return null;

    const result: Shortcut = { ...shortcut, keys: parsedKeys, label: text };
    if (sequence.active) result.sequence = true;
    else delete result.sequence;
    const note = details.text.trim();
    if (note) result.details = note;
    else delete result.details;
    return result;
  };
  const update = () => {
    const parsedKeys = normalizeKeys(parseKeysText(keys.text));
    if (keycap) preview.remove(keycap);
    keycap = buildKeycap(parsedKeys, sequence.active);
    preview.add_suffix(keycap);
    preview.subtitle = parsedKeys.length === 0 ? "Type at least one key" : "";
    save.sensitive = read() !== null;
  };
  label.connect("changed", update);
  keys.connect("changed", update);
  sequence.connect("notify::active", update);
  update();

  const submit = () => {
    const result = read();
    if (!result) return;
    onSave(result);
    dialog.close();
  };
  cancel.connect("clicked", () => dialog.close());
  save.connect("clicked", submit);
  label.connect("entry-activated", submit);
  keys.connect("entry-activated", submit);

  dialog.present(parent);
}
