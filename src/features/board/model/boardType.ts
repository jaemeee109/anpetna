export const BOARD_TYPES = ["NOTICE","FREE","QNA","FAQ"] as const;
export type BoardTypeNarrow = typeof BOARD_TYPES[number];

export function toBoardType(v?: string): BoardTypeNarrow | null {
  const t = (v ?? "").toUpperCase();
  return (BOARD_TYPES as readonly string[]).includes(t) ? (t as BoardTypeNarrow) : null;
}
