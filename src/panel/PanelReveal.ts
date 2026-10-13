import Clutter from "gi://Clutter";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

const SLIDE_MS = 200;

// A menu opened from a hidden top bar (hide-top-bar) lands in the screen's corner, so show the
// bar first and hide it again afterwards.
export class PanelReveal {
  private hidden: { y: number; visible: boolean } | null = null;

  show(button: Clutter.Actor): void {
    const panelBox = Main.layoutManager.panelBox;
    const monitor = Main.layoutManager.primaryMonitor;
    if (!monitor) return;
    const shownY = monitor.y;
    if (button.is_mapped() && panelBox.y === shownY) return;

    this.hidden = { y: panelBox.y, visible: panelBox.visible };
    panelBox.remove_all_transitions();
    panelBox.show();
    panelBox.y = shownY;
  }

  restore(): void {
    if (!this.hidden) return;

    const { y, visible } = this.hidden;
    this.hidden = null;
    const panelBox = Main.layoutManager.panelBox;
    // Leave it up under the pointer; the hiding extension takes over.
    const [, pointerY] = global.get_pointer();
    if (pointerY < panelBox.y + panelBox.height) return;

    panelBox.ease({
      y,
      duration: SLIDE_MS,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        if (!visible) panelBox.hide();
      },
    });
  }

  // On disable, put the bar back at once, even under the pointer.
  reset(): void {
    if (!this.hidden) return;

    const { y, visible } = this.hidden;
    this.hidden = null;
    const panelBox = Main.layoutManager.panelBox;
    panelBox.remove_all_transitions();
    panelBox.y = y;
    panelBox.visible = visible;
  }
}
