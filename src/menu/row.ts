import Clutter from "gi://Clutter";
import Pango from "gi://Pango";
import St from "gi://St";

import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { formatKeys, type KeycapPart } from "../shortcuts/formatKeys.js";
import type { Shortcut } from "../shortcuts/types.js";
import type { Tooltip } from "../ui/Tooltip.js";

export function buildRow(
  { keys, sequence, label, details }: Shortcut,
  tooltip: Tooltip,
): PopupMenu.PopupBaseMenuItem {
  const item = new PopupMenu.PopupBaseMenuItem();

  const labelActor = new St.Label({
    text: label,
    x_expand: true,
    y_align: Clutter.ActorAlign.CENTER,
  });
  labelActor.clutter_text.ellipsize = Pango.EllipsizeMode.END;
  item.add_child(labelActor);

  const parts = formatKeys(keys, sequence);
  if (parts.length > 0) item.add_child(buildKeycap(parts));

  item.connect("notify::active", () => {
    const cutOff = labelActor.clutter_text.get_layout().is_ellipsized();
    if (item.active && (cutOff || details))
      tooltip.show(item, { title: cutOff ? label : undefined, body: details });
    else tooltip.hideSoon(item);
  });
  return item;
}

function buildKeycap(parts: KeycapPart[]): St.BoxLayout {
  const keycap = new St.BoxLayout({
    style_class: "dory-keys",
    y_align: Clutter.ActorAlign.CENTER,
  });
  for (const part of parts) {
    keycap.add_child(
      "icon" in part
        ? new St.Icon({
            icon_name: part.icon,
            style_class: "dory-key-icon",
            y_align: Clutter.ActorAlign.CENTER,
          })
        : new St.Label({
            text: part.text,
            y_align: Clutter.ActorAlign.CENTER,
          }),
    );
  }
  return keycap;
}
