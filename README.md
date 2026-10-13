# Dory

```
               __.--~~~~~--.__
   |\      _.-'   __.....__   '-._
   | \  .-'     .'  ~~~~~  '.     '.
   |  \/       (  ~~~~~~~~~  )   (o) \
   |  /\        '.__~~~~~__.'     ~  /
   | /  '-._                     _.-'
   |/       '--..___     ___..--'
                    '~~~'
```

Like the fish from _Finding Nemo_, you keep forgetting
things: here, the desktop, text and shell shortcuts that would make you faster. Dory is a GNOME
Shell extension that keeps them one click away in the top bar.

- A keyboard icon in the top bar opens a menu grouped by topic: the GNOME desktop, screenshots,
  text in any app, and the shell (bash and zsh).
- Add your own shortcuts in its settings window, or with `gsettings` and Home Manager, and
  turn the built-in ones off if you only want yours.
- **Ctrl+Alt+Super+S** opens it from anywhere, also while an auto-hiding top bar is hidden.
- Hovering a row (or reaching it with the keyboard) shows its details: a short explanation of
  what the shortcut does, under the full label when that is too long for the menu.
- At most one section is open at a time and the menu keeps a fixed width; click a header to open
  or close its section.
- It is a native GNOME popup menu and follows the light and dark styles.

Requires GNOME Shell 49 or 50.

## Install

### Nix flake

```nix
{
  inputs.dory.url = "github:Mowerick/Dory";

  # Home Manager
  home.packages = [ inputs.dory.packages.${pkgs.stdenv.hostPlatform.system}.default ];
  dconf.settings."org/gnome/shell".enabled-extensions = [ "dory@mowerick.github.io" ];
}
```

`overlays.default` adds it as `pkgs.gnomeExtensions.dory` instead.

### Manually

Needs Node.js and `glib-compile-schemas` (`nix develop` provides both):

```sh
npm ci
npm run install-local
```

Log out and back in (GNOME on Wayland only picks up new extensions at login), then:

```sh
gnome-extensions enable dory@mowerick.github.io
```

## Your own shortcuts

Open the settings window from the menu's **Edit shortcuts…**, the Extensions app or
`gnome-extensions prefs dory@mowerick.github.io`. There you can:

- turn the built-in shortcuts off, or copy them into yours to change or remove some of them,
- add, edit, reorder and remove your own sections and shortcuts, each with optional details
  shown on hover,
- import sections from a JSON file and export yours to one.

The menu updates as soon as anything changes; there is nothing to restart.

### With gsettings

The settings window stores everything in two keys, which you can also set directly:

| Key                      | Type    | Default | Meaning                                               |
| ------------------------ | ------- | ------- | ----------------------------------------------------- |
| `show-default-shortcuts` | boolean | `true`  | List the built-in sections                            |
| `custom-shortcuts`       | string  | `'[]'`  | Your sections as JSON, listed after the built-in ones |

```sh
gsettings --schemadir ~/.local/share/gnome-shell/extensions/dory@mowerick.github.io/schemas \
  set org.gnome.shell.extensions.dory custom-shortcuts \
  '[{"title": "Git", "icon": "utilities-terminal-symbolic", "items": [{"keys": ["Ctrl", "G"], "label": "Open lazygit"}]}]'
```

Entries that cannot be read are skipped and logged (`journalctl --user -g Dory`) instead of
breaking the menu; the settings window shows how many were left out.

### With Home Manager

```nix
dconf.settings."org/gnome/shell/extensions/dory" = {
  show-default-shortcuts = true;
  custom-shortcuts = builtins.toJSON [
    {
      title = "Git";
      icon = "utilities-terminal-symbolic";
      items = [
        {
          keys = [ "Ctrl" "G" ];
          label = "Open lazygit";
          details = "Opens lazygit in the current repository."; # shown on hover
        }
        { keys = [ [ "Alt" "larrow" ] [ "Alt" "rarrow" ] ]; label = "Previous / next hunk"; }
      ];
    }
  ];
};
```

Home Manager writes these keys on every switch, so changes made in the settings window last only
until the next one.

### Icons

Each section's `icon` is the name of an icon from your icon theme, drawn beside the section
title. Use a symbolic one (its name ends in `-symbolic`) so it is drawn in the menu's text colour
and follows the light and dark styles. Any symbolic icon in your theme works; some from GNOME's
default theme, Adwaita:

| Icon name                          | For example                |
| ---------------------------------- | -------------------------- |
| `input-keyboard-symbolic`          | General keyboard shortcuts |
| `utilities-terminal-symbolic`      | Shell and terminal         |
| `accessories-text-editor-symbolic` | Editors                    |
| `document-edit-symbolic`           | Text editing               |
| `web-browser-symbolic`             | Browser                    |
| `folder-symbolic`                  | Files                      |
| `edit-find-symbolic`               | Searching                  |
| `camera-photo-symbolic`            | Screenshots                |
| `video-display-symbolic`           | Windows and displays       |
| `media-playback-start-symbolic`    | Media players              |
| `applications-games-symbolic`      | Games                      |
| `preferences-system-symbolic`      | System and settings        |

To find more:

- [Icon Library](https://flathub.org/apps/org.gnome.design.IconLibrary) is a GNOME app that
  shows every symbolic icon with a search box and copies its name for you.
- The [Adwaita symbolic icons](https://gitlab.gnome.org/GNOME/adwaita-icon-theme/-/tree/master/Adwaita/symbolic)
  can be browsed online, sorted into folders such as `actions`, `apps` and `devices`.
- The [Icon Naming Specification](https://specifications.freedesktop.org/icon-naming-spec/latest/)
  lists the standard names every icon theme provides.

Leaving `icon` out or empty gives `input-keyboard-symbolic`. A name your theme does not have is
drawn as GNOME's "missing image" icon; the settings window marks such names while you type them.

The icons inside keycaps are separate: only arrow, plus and minus keys get one, as listed under
[Format](#format).

### Format

Your sections use the same format as the built-in [`shortcuts.json`](shortcuts.json):

```json
[
  {
    "title": "Shell (bash and zsh)",
    "icon": "utilities-terminal-symbolic",
    "items": [
      {
        "keys": ["Ctrl", "W"],
        "label": "Delete the previous word",
        "details": "Deletes the word left of the cursor; Ctrl+Y pastes it back."
      }
    ]
  }
]
```

Each section has these fields:

| Field   | Meaning                                                     |
| ------- | ----------------------------------------------------------- |
| `title` | The section header                                          |
| `icon`  | A symbolic icon name, such as `utilities-terminal-symbolic` |
| `items` | The rows, in menu order                                     |

Each row has these fields:

| Field      | Required | Meaning                                                              |
| ---------- | -------- | -------------------------------------------------------------------- |
| `keys`     | no       | The keycap on the right of the row (syntax below); none without it   |
| `label`    | yes      | The row text                                                         |
| `details`  | no       | A longer explanation, shown when hovering the row                    |
| `sequence` | no       | `true` when the combinations in `keys` are pressed one after another |

`keys` takes one of these forms:

| Write                                                    | Means                                     | Shown as                      |
| -------------------------------------------------------- | ----------------------------------------- | ----------------------------- |
| `["Ctrl", "R"]`                                          | One combination, keys joined with `+`     | `Ctrl + R`                    |
| `[["Ctrl", "A"], ["Ctrl", "E"]]`                         | Alternatives                              | `Ctrl + A / E`                |
| `[["Ctrl", "Z"], ["Ctrl", "Shift", "Z"]]`                | Alternatives, other modifiers             | `Ctrl + Z / Ctrl + Shift + Z` |
| `[["Ctrl", "X"], ["Ctrl", "E"]]` with `"sequence": true` | Pressed one after another                 | `Ctrl + X Ctrl + E`           |
| `"Ctrl+A / Ctrl+E"`                                      | The text form used in the settings window | `Ctrl + A / E`                |

Alternatives that share their modifiers are shortened in the keycap. Any other key name is shown
as written, except these, which are drawn with GNOME's symbolic icons:

| Write          | Icon                   |
| -------------- | ---------------------- |
| `larrow`       | `go-previous-symbolic` |
| `rarrow`       | `go-next-symbolic`     |
| `uarrow`       | `go-up-symbolic`       |
| `darrow`       | `go-down-symbolic`     |
| `+` or `plus`  | `list-add-symbolic`    |
| `-` or `minus` | `list-remove-symbolic` |

The built-in list holds GNOME's default bindings and the standard Emacs-style line editing of bash
and zsh.

## Changing the key combination

```sh
gsettings --schemadir ~/.local/share/gnome-shell/extensions/dory@mowerick.github.io/schemas \
  set org.gnome.shell.extensions.dory toggle-menu "['<Control><Alt><Super>s']"
```

With Home Manager, set `dconf.settings."org/gnome/shell/extensions/dory".toggle-menu` instead.

## Development

GNOME Shell on Wayland only loads new extension code at login. Instead of logging out after every
change, run a second GNOME Shell in a window and restart that.

Once, enable the extension (this works before GNOME Shell has seen it):

```sh
gsettings set org.gnome.shell enabled-extensions \
  "$(gsettings get org.gnome.shell enabled-extensions | sed "s/]$/, 'dory@mowerick.github.io']/")"
```

After each change, build, install and start a nested shell:

```sh
npm run dev
```

The shell opens in a 1600×900 window and prints the extension's errors and `console.log` output to
the terminal. Close the window to stop it. `npm run check` type-checks without building, `npm run lint` runs ESLint and Prettier, and
`npm run pack` builds the zip for extensions.gnome.org (it needs `zip`, which `nix develop` provides).

The extension is written in TypeScript under `src/` and compiled to `dist/`, which is what gets
installed:

| Path               | Contents                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| `src/extension.ts` | Entry point; GNOME Shell loads it as `extension.js`                       |
| `src/prefs.ts`     | Settings window entry point, loaded as `prefs.js`                         |
| `src/prefs/`       | The settings window: shortcut editing, import and export                  |
| `src/menu/`        | The menu contents, the sections accordion and its rows                    |
| `src/shortcuts/`   | The shortcut format: types, validation, keycap formatting; shared by both |
| `src/ui/`          | The tooltip for cut-off labels                                            |
| `src/panel/`       | Bringing in an auto-hidden top bar while the menu is open                 |

### Releasing

1. Raise `version-name` in `metadata.json` to the next number, then commit and push to `main`.
2. Tag that commit with the same number and push the tag:

   ```sh
   git tag v2 && git push origin v2
   ```

   GitHub Actions checks and builds it, then publishes a release with the zip attached. The
   release fails if the tag does not match `version-name` or is not on `main`.

3. Download the zip from the release and upload it at
   [extensions.gnome.org/upload](https://extensions.gnome.org/upload/), where it waits for review.
