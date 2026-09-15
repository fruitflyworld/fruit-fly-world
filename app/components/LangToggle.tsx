"use client";

import { useEffect, useState } from "react";

const KEY = "ffw-lang";

/** The language switch for the document pages, seated at the right edge of the nav. The
 *  visible string is chosen by CSS from `<html data-lang>`, so this button only has to set
 *  that attribute — both languages are already in the HTML and neither is ever rendered by
 *  JavaScript. */
export default function LangToggle() {
  const [lang, setLang] = useState<"en" | "zh">("en");

  useEffect(() => {
    const saved = document.documentElement.dataset.lang;
    if (saved === "zh" || saved === "en") setLang(saved);
  }, []);

  const choose = (next: "en" | "zh") => {
    setLang(next);
    document.documentElement.dataset.lang = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  };

  return <div className="langToggle" role="group" aria-label="Language">
    <button type="button" className={lang === "en" ? "on" : ""} onClick={() => choose("en")} aria-pressed={lang === "en"}>EN</button>
    <button type="button" className={lang === "zh" ? "on" : ""} onClick={() => choose("zh")} aria-pressed={lang === "zh"}>中文</button>
  </div>;
}
