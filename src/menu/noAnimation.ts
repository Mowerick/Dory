import { PopupAnimation } from "resource:///org/gnome/shell/ui/boxpointer.js";
import { PACKAGE_VERSION } from "resource:///org/gnome/shell/misc/config.js";

// GNOME Shell 51 changed menu open() and close() from a PopupAnimation to { animate }.
export const NO_ANIMATION = (
  parseInt(PACKAGE_VERSION) >= 51 ? { animate: false } : PopupAnimation.NONE
) as PopupAnimation;
