import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import type Adw from "gi://Adw";

import { CustomShortcuts } from "./prefs/CustomShortcuts.js";
import { ShortcutsPage } from "./prefs/ShortcutsPage.js";
import { loadDefaultSections } from "./shortcuts/load.js";

export default class DoryPreferences extends ExtensionPreferences {
  // GNOME Shell 49 and 50 still pass an Adw.PreferencesWindow.
  override fillPreferencesWindow(
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    window: Adw.PreferencesWindow,
  ): Promise<void> {
    const settings = this.getSettings();
    const custom = new CustomShortcuts(settings);
    const page = new ShortcutsPage(
      window,
      settings,
      custom,
      loadDefaultSections(this.dir),
    );
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    window.add(page.page);
    window.set_default_size(640, 760);

    const watchId = custom.watch(() => page.redraw());
    window.connect("close-request", () => {
      settings.disconnect(watchId);
      page.destroy();
      return false;
    });
    return Promise.resolve();
  }
}
