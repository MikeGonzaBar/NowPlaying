import type { SectionKey } from "./types";

/**
 * Keep only the items whose section is visible. Items without a section are
 * always kept so aggregate content is never filtered away by accident.
 */
export function filterBySections<T extends { section?: SectionKey }>(
  items: readonly T[],
  isVisible: (section: SectionKey) => boolean,
): T[] {
  return items.filter((item) => !item.section || isVisible(item.section));
}
