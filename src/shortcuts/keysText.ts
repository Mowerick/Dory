// "Ctrl+A / Ctrl+E": "+" joins keys, " / " separates combinations, "++" is the + key.

export const ALTERNATIVE_SEPARATOR = " / ";

export function parseKeysText(text: string): string[][] {
  return text
    .split(ALTERNATIVE_SEPARATOR)
    .map(parseCombo)
    .filter((combo) => combo.length > 0);
}

export function keysToText(combos: string[][]): string {
  return combos.map((combo) => combo.join("+")).join(ALTERNATIVE_SEPARATOR);
}

function parseCombo(text: string): string[] {
  const keys: string[] = [];
  let emptyBefore = false;
  for (const piece of text.split("+").map((part) => part.trim())) {
    if (piece) {
      keys.push(piece);
      emptyBefore = false;
    } else if (emptyBefore) {
      keys.push("+");
      emptyBefore = false;
    } else {
      emptyBefore = true;
    }
  }
  return keys;
}
