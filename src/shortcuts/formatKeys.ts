import type { Keys } from "./types.js";
import { combosOf } from "./validate.js";

const KEY_ICONS: Record<string, string> = {
  larrow: "go-previous-symbolic",
  rarrow: "go-next-symbolic",
  uarrow: "go-up-symbolic",
  darrow: "go-down-symbolic",
  "+": "list-add-symbolic",
  plus: "list-add-symbolic",
  "-": "list-remove-symbolic",
  minus: "list-remove-symbolic",
};

export type KeycapPart = { text: string } | { icon: string };

// Alternatives differing only in their last key are shortened to "Ctrl + A / E".
export function formatKeys(keys: Keys, sequence = false): KeycapPart[] {
  const combos = combosOf(keys);
  if (combos.length === 0) return [];
  if (sequence)
    return toParts(
      joinWith(
        combos.map((combo) => joinWith(combo, " + ")),
        " ",
      ),
    );

  const [first] = combos;
  const sameModifiers =
    first.length > 1 &&
    combos.every(
      (combo) =>
        combo.length === first.length &&
        combo.slice(0, -1).every((key, i) => key === first[i]),
    );
  const written = sameModifiers
    ? [
        joinWith(first, " + "),
        ...combos.slice(1).map((combo) => [combo[combo.length - 1]]),
      ]
    : combos.map((combo) => joinWith(combo, " + "));
  return toParts(joinWith(written, " / "));
}

function joinWith<T>(groups: (T | T[])[], separator: T): T[] {
  return groups.flatMap((group, i) => [
    ...(i > 0 ? [separator] : []),
    ...(Array.isArray(group) ? group : [group]),
  ]);
}

function toParts(tokens: string[]): KeycapPart[] {
  const parts: KeycapPart[] = [];
  for (const token of tokens) {
    const icon = KEY_ICONS[token.toLowerCase()];
    const last = parts.at(-1);
    if (icon) parts.push({ icon });
    else if (last && "text" in last) last.text += token;
    else parts.push({ text: token });
  }
  return parts;
}
