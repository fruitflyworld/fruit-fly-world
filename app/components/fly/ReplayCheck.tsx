"use client";

import { Bi } from "../Bi";
import { useLiveFly } from "./LiveFly";

/** Compares the server's chain hash with the one this browser just computed. */
export default function ReplayCheck({ serverChain, serverRecordHash, tick }: { serverChain: string; serverRecordHash: string; tick: number }) {
  const { snap, progress, replayed, done } = useLiveFly();
  const finished = done && snap && snap.tick === tick;
  const same = finished && snap!.chain === serverChain && snap!.lastHash === serverRecordHash;
  return <div className={`tfVerify tfReplayCheck${finished ? (same ? " ok" : " bad") : ""}`}>
    <div className="tfVerifyGrid">
      <div><label><Bi en="Server chain"  /></label><b className="tfMono">{serverChain}</b></div>
      <div><label><Bi en="Your browser"  /></label><b className="tfMono">{finished ? snap!.chain : `${Math.round(progress * 100)}%`}</b></div>
      <div><label><Bi en="Record hash"  /></label><b className="tfMono">{finished ? snap!.lastHash : serverRecordHash}</b></div>
      <div className="tfVerdict">{finished ? (same ? <span className="ok">IDENTICAL</span> : <span className="bad">DIVERGED</span>) : <span className="idle"><Bi en="Replaying in your browser…"  /></span>}</div>
    </div>
    {!finished && <div className="tfProgress"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
    {finished && <p className="tfVerifyNote"><Bi en={`Your browser replayed ${replayed.toLocaleString("en-US")} ticks from midnight UTC and landed on the same hashes. ${same ? "This tick is exactly what the rules produce." : "They differ — that is a bug report, not a score."}`}  /></p>}
  </div>;
}
