import type { ReactNode } from "react";

/**
 * Renders both languages inline; `html[data-lang]` picks which one is visible.
 * Server-rendered on purpose — switching language costs no client JavaScript and
 * no flash of the wrong language, because both strings were already in the HTML.
 * Must stay inline (a span inside the paragraph/heading, never wrapping a block).
 */
export function Bi({ en, zh }: { en: ReactNode; zh: ReactNode }) {
  return <><span className="biEn">{en}</span><span className="biZh">{zh}</span></>;
}

/** Convenience for the `[en, zh]` tuple rows the document pages are built from. */
export type Bilingual = readonly [string, string];
