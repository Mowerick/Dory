#!/usr/bin/env bash
# Checks that an extension zip has what extensions.gnome.org needs and nothing from the build.
set -euo pipefail

zip=$1
entries=$(unzip -Z1 "$zip")
failed=0

fail() {
  echo "$zip: $1" >&2
  failed=1
}

for file in metadata.json extension.js prefs.js stylesheet.css shortcuts.json \
  schemas/org.gnome.shell.extensions.dory.gschema.xml; do
  grep -qxF "$file" <<<"$entries" || fail "missing $file"
done

for dir in menu panel prefs shortcuts ui; do
  grep -q "^$dir/.*\.js$" <<<"$entries" || fail "no .js files in $dir/"
done

# GNOME Shell 44 and later compile the schema on install, so the zip leaves it out.
if grep -qxF schemas/gschemas.compiled <<<"$entries"; then
  fail "contains schemas/gschemas.compiled"
fi
if grep -qE '\.(ts|map)$' <<<"$entries"; then
  fail "contains TypeScript or source map files"
fi

exit "$failed"
