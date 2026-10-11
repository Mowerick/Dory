export type Keys = string[] | string[][];

export interface Shortcut {
  keys: Keys;
  // Combinations are pressed in order rather than being alternatives.
  sequence?: boolean;
  label: string;
  details?: string;
}

export interface Section {
  title: string;
  icon: string;
  items: Shortcut[];
}
