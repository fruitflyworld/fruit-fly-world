"use client";

import { useEffect, useState } from "react";
import NeuralFly from "../../components/NeuralFly";
import { useAuth } from "../../components/AuthProvider";
import type { Experiment } from "../../lib/experiment";

type RecordData = Experiment & { id: string; hash: string; modelVersion: string; createdAt: string; revision?: string; energyDelta?: number; replayOf?: string };
export default function ReplayClient({ id }: { id: string }) {
  const { address, connect, status: authStatus } = useAuth();
  const [record, setRecord] = useState<RecordData>();
  const [status, setStatus] = useState<"loading" | "ready" | "verifying" | "match" | "failed">("loading");
  const [error, setError] = useState<string>();
  useEffect(() => { fetch(`/api/experiments/${id}`, { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setRecord(data); setStatus("ready"); }).catch((cause) => { setError(cause.message); setStatus("failed"); }); }, [id]);
  const replay = async () => {
    if (!address) { await connect(); return; }
    setStatus("verifying");
    try { const response = await fetch(`/api/experiments/${id}/replay`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setStatus(data.match ? "match" : "failed"); window.dispatchEvent(new Event("ffw:auth")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Replay failed"); setStatus("failed"); }
  };
  if (!record) return <main className="recordPage"><div className="recordLoading"><span>{status === "failed" ? "RECORD UNAVAILABLE" : "LOADING CANONICAL RECORD…"}</span>{error && <p>{error}</p>}<a href="/">RETURN TO WORLD</a></div></main>;
  return <main className="recordPage"><nav><a className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><a className="navCta" href="/">ENTER WORLD</a></nav><section className="recordHero"><div className="recordCopy"><label>PUBLIC EXPERIMENT RECORD</label><h1>Replay<br/><em>{record.id}</em></h1><p>Same inputs. Same model. Same seed. The result should be exact—not approximately similar.</p><button className="primary" type="button" disabled={status === "verifying" || authStatus === "signing"} onClick={() => void replay()}>{status === "verifying" ? "RECOMPUTING…" : status === "match" ? "EXACT MATCH VERIFIED" : address ? "VERIFY REPLAY" : "SIGN IN + VERIFY"}<span>↗</span></button>{error && <p className="labError">{error}</p>}</div><div className={`recordSpecimen ${status === "match" ? "verified" : ""}`}><NeuralFly experiment={record}/><div className="recordSeal"><small>REPLAY STATUS</small><strong>{status === "match" ? "MATCH" : "READY"}</strong></div></div></section><section className="recordData"><header><span>CANONICAL RECEIPT</span><b>{record.modelVersion}</b></header><div><span>BEHAVIOR<b>{record.behavior}</b></span><span>CONFIDENCE<b>{Math.round(record.confidence * 100)}%</b></span><span>WORLD REVISION<b>{record.revision ? `#${record.revision}` : "—"}</b></span><span>ENERGY DELTA<b>{record.energyDelta === undefined ? "—" : `${record.energyDelta >= 0 ? "+" : ""}${record.energyDelta}`}</b></span></div><p>SHA-256 / {record.hash}</p><div className="recordSignals"><span>FOOD<b>{record.signals.food}</b></span><span>THREAT<b>{record.signals.threat}</b></span><span>LIGHT<b>{record.signals.light}</b></span><span>NOVELTY<b>{record.signals.novelty}</b></span><span>SECTOR<b>{record.sector}</b></span><span>SEED<b>{record.seed}</b></span></div><div className="receiptActions"><a href={`/api/experiments/${record.id}`} download={`${record.id}.json`}>DOWNLOAD JSON RECEIPT</a></div></section></main>;
}
