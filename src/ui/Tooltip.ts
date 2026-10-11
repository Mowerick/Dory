import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Pango from "gi://Pango";
import St from "gi://St";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

const DELAY_MS = 350;
const HIDE_GRACE_MS = 80;
const GAP = 12;

export interface TooltipContent {
  title?: string;
  body?: string;
}

export class Tooltip {
  private label: St.Label;
  private owner: Clutter.Actor | null = null;
  private showTimeoutId = 0;
  private hideTimeoutId = 0;

  constructor() {
    this.label = new St.Label({
      style_class: "dash-label dory-tooltip",
      visible: false,
    });
    this.label.clutter_text.line_wrap = true;
    this.label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
    Main.layoutManager.uiGroup.add_child(this.label);
  }

  show(owner: Clutter.Actor, content: TooltipContent): void {
    this.cancelTimeouts();
    this.owner = owner;

    if (this.label.visible) {
      this.place(owner, content);
      return;
    }
    this.showTimeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      DELAY_MS,
      () => {
        this.showTimeoutId = 0;
        this.place(owner, content);
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  // The next row gains hover just after this one loses it; wait so the tooltip moves instead.
  hideSoon(owner: Clutter.Actor): void {
    if (this.owner !== owner) return;

    this.cancelTimeouts();
    this.hideTimeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      HIDE_GRACE_MS,
      () => {
        this.hideTimeoutId = 0;
        this.hide();
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  hide(): void {
    this.cancelTimeouts();
    this.owner = null;
    this.label.remove_all_transitions();
    this.label.hide();
  }

  destroy(): void {
    this.hide();
    this.label.destroy();
  }

  private place(owner: Clutter.Actor, { title, body }: TooltipContent): void {
    const escape = (text: string) => GLib.markup_escape_text(text, -1);
    const markup =
      title && body
        ? `<b>${escape(title)}</b>\n${escape(body)}`
        : escape(title ?? body ?? "");
    this.label.clutter_text.set_markup(markup);
    this.label.opacity = 0;
    this.label.show();
    Main.layoutManager.uiGroup.set_child_above_sibling(this.label, null);

    const [ownerX, ownerY] = owner.get_transformed_position();
    const [ownerWidth, ownerHeight] = owner.get_transformed_size();
    const [width, height] = this.label.get_size();
    const monitor =
      Main.layoutManager.findMonitorForActor(owner) ??
      Main.layoutManager.primaryMonitor;
    if (!monitor) return;

    let x = ownerX - width - GAP;
    if (x < monitor.x) x = ownerX + ownerWidth + GAP;
    let y = ownerY + (ownerHeight - height) / 2;
    y = Math.max(monitor.y, Math.min(y, monitor.y + monitor.height - height));

    this.label.set_position(Math.floor(x), Math.floor(y));
    this.label.remove_all_transitions();
    this.label.ease({
      opacity: 255,
      duration: 150,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });
  }

  private cancelTimeouts(): void {
    if (this.showTimeoutId) {
      GLib.source_remove(this.showTimeoutId);
      this.showTimeoutId = 0;
    }
    if (this.hideTimeoutId) {
      GLib.source_remove(this.hideTimeoutId);
      this.hideTimeoutId = 0;
    }
  }
}
