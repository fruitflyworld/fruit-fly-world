"use client";

/* ── app/components/CopyBox.tsx ─────────────────────────────────────────────
   A labelled block of text with one job: get itself into the reader's
   clipboard. On the skill page this is the entire product — a copy button that
   silently does nothing sends an agent to a prompt the user never received — so
   it falls back to the textarea trick when navigator.clipboard is unavailable
   (plain http, an in-app browser).
   ------------------------------------------------------------------------- */

import { useState } from "react";

export default function CopyBox({ text, label, note }: { text: string; label: string; note?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const scratch = document.createElement("textarea");
      scratch.value = text;
      scratch.setAttribute("readonly", "");
      scratch.style.position = "fixed";
      scratch.style.opacity = "0";
      document.body.appendChild(scratch);
      scratch.select();
      try { document.execCommand("copy"); } catch { /* nothing left to try */ }
      document.body.removeChild(scratch);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <div className="skillCopy">
    <div className="skillCopyHead">
      <span className="skillCopyLabel"><i/>{label}</span>
      <button type="button" className={copied ? "copied" : ""} onClick={() => void copy()}>
        {copied ? "✓ COPIED" : "COPY"}
      </button>
    </div>
    <pre>{text}</pre>
    {note && <p className="skillCopyNote">{note}</p>}
  </div>;
}
