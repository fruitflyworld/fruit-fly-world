import type { ReactNode } from "react";

/**
 * English-only build. The site used to render both languages inline and let
 * `html[data-lang]` pick one; it now ships a single language, so only `en` is
 * rendered. The `zh` prop is still accepted (and ignored) so the document pages
 * can migrate their data shape at their own pace.
 * Must stay inline (inside the paragraph/heading, never wrapping a block).
 */
export function Bi({ en }: { en: ReactNode; zh?: ReactNode }) {
  return <>{en}</>;
}
