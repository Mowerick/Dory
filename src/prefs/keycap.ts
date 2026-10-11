import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";

import { formatKeys } from "../shortcuts/formatKeys.js";
import type { Keys } from "../shortcuts/types.js";

const CSS = `
.dory-keycap {
  background-color: alpha(currentColor, 0.12);
  border-radius: 6px;
  padding: 2px 8px;
  font-weight: bold;
}
`;

let styled = false;

export function buildKeycap(keys: Keys, sequence: boolean): Gtk.Box {
  addStyle();
  const box = new Gtk.Box({
    spacing: 2,
    valign: Gtk.Align.CENTER,
    css_classes: ["dory-keycap"],
  });
  const parts = formatKeys(keys, sequence);
  for (const part of parts) {
    box.append(
      "icon" in part
        ? new Gtk.Image({ icon_name: part.icon })
        : new Gtk.Label({ label: part.text }),
    );
  }
  box.visible = parts.length > 0;
  return box;
}

function addStyle(): void {
  const display = Gdk.Display.get_default();
  if (styled || !display) return;

  const provider = new Gtk.CssProvider();
  provider.load_from_string(CSS);
  // GTK 4 has no replacement for display-wide CSS.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  Gtk.StyleContext.add_provider_for_display(
    display,
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );
  styled = true;
}
