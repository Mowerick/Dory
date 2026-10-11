import { parseKeysText } from "./keysText.js";
import type { Keys, Section, Shortcut } from "./types.js";

export const DEFAULT_SECTION_ICON = "input-keyboard-symbolic";

export interface Validated {
  sections: Section[];
  problems: string[];
}

// Never throws: unusable entries are dropped and listed in `problems`.
export function parseSections(json: string): Validated {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    return {
      sections: [],
      problems: [`Not valid JSON: ${(error as Error).message}`],
    };
  }
  return validateSections(value);
}

export function validateSections(value: unknown): Validated {
  const problems: string[] = [];
  if (!Array.isArray(value))
    return { sections: [], problems: ["Expected a list of sections"] };

  const sections: Section[] = [];
  value.forEach((raw, i) => {
    const where = `Section ${i + 1}`;
    if (!isObject(raw)) {
      problems.push(`${where} is not an object; skipped`);
      return;
    }

    let title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) {
      problems.push(`${where} has no title; named "Untitled"`);
      title = "Untitled";
    }
    const icon =
      typeof raw.icon === "string" && raw.icon.trim()
        ? raw.icon.trim()
        : DEFAULT_SECTION_ICON;

    const items: Shortcut[] = [];
    if (raw.items !== undefined && !Array.isArray(raw.items))
      problems.push(`${where} ("${title}"): items is not a list; ignored`);
    if (Array.isArray(raw.items)) {
      raw.items.forEach((item, j) => {
        const shortcut = validateShortcut(item);
        if (shortcut) items.push(shortcut);
        else
          problems.push(
            `${where} ("${title}"), shortcut ${j + 1} has no label; skipped`,
          );
      });
    }
    sections.push({ title, icon, items });
  });
  return { sections, problems };
}

function validateShortcut(raw: unknown): Shortcut | null {
  if (!isObject(raw) || typeof raw.label !== "string" || !raw.label.trim())
    return null;

  const shortcut: Shortcut = {
    keys: normalizeKeys(raw.keys),
    label: raw.label.trim(),
  };
  if (raw.sequence === true) shortcut.sequence = true;
  if (typeof raw.details === "string" && raw.details.trim())
    shortcut.details = raw.details;
  return shortcut;
}

export function normalizeKeys(raw: unknown): Keys {
  let combos: unknown[][];
  if (typeof raw === "string") combos = parseKeysText(raw);
  else if (!Array.isArray(raw)) combos = [];
  else if (raw.some(Array.isArray))
    combos = raw.map((combo: unknown) =>
      Array.isArray(combo) ? (combo as unknown[]) : [combo],
    );
  else combos = [raw];

  const clean = combos
    .map((combo) =>
      combo
        .filter((key): key is string => typeof key === "string")
        .map((key) => key.trim())
        .filter(Boolean),
    )
    .filter((combo) => combo.length > 0);
  return clean.length === 1 ? clean[0] : clean;
}

export function combosOf(keys: Keys): string[][] {
  if (keys.length === 0) return [];
  return Array.isArray(keys[0]) ? (keys as string[][]) : [keys as string[]];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
