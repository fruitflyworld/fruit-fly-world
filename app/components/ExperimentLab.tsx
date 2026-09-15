"use client";

import { useMemo, useState } from "react";
import NeuralFly from "./NeuralFly";
import { initialExperiment, runExperiment, type Experiment, type Signals } from "../lib/experiment";
import { useAuth } from "./AuthProvider";

const labels: { key: keyof Signals; label: string; hint: string }[] = [
  { key: "food", label: "FOOD", hint: "reward" }, { key: "threat", label: "THREAT", hint: "danger" },
  { key: "light", label: "LIGHT", hint: "orientation" }, { key: "novelty", label: "NOVELTY", hint: "unknown" }
];
type RecordResult = Experiment & { id: string; hash: string; modelVersion: string; revision: number };

export default function ExperimentLab() {
  const { address, status: authStatus, connect } = useAuth();
  const [signals, setSignals] = useState(initialExperiment.signals);
  const [previewSeed, setPreviewSeed] = useState(initialExperiment.seed);
  const [record, setRecord] = useState<RecordResult>();
  const [status, setStatus] = useState<"preview" | "running" | "recorded" | "failed">("preview");
  const [error, setError] = useState<string>();
  const preview = useMemo(() => runExperiment(signals, previewSeed), [signals, previewSeed]);
  const result = record || preview;

  const run = async () => {
    if (!address) { await connect(); return; }
    setStatus("running"); setError(undefined);
    try {
      const response = await fetch("/api/experiments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signals }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The experiment could not be recorded.");
      setRecord(data); setPreviewSeed(data.seed); setStatus("recorded");
      window.dispatchEvent(new Event("ffw:world")); window.dispatchEvent(new Event("ffw:auth"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Experiment failed."); setStatus("failed"); }
  };
  const copyRecord = async () => {
    if (!record) return;
    await navigator.clipboard.writeText(`${window.location.origin}/experiments/${record.id}`);
    setStatus("recorded");
  };

  return <div className={`labShell lab-${status}`}>
    <div className="labVisual"><div className="labTag"><span>{status === "running" ? "PROCESSING SIGNALS" : "LIVE MODEL PREVIEW"}</span><b>{result.behavior}</b></div><div className="labReticle" aria-hidden="true"><i/><i/><i/><i/></div><NeuralFly experiment={result} compact />{status === "running" && <div className="runSequence" role="status"><span>TRANSMITTING STIMULUS</span><b>CANONICALIZING WORLD EVENT</b><i/></div>}</div>
    <div className="labControls">
      <div className="labHeader"><div><small>INPUT PANEL</small><h3>Change its world.</h3></div><span>{record ? `ROUND ${record.revision}` : "UNRECORDED"}</span></div>
      {labels.map(({ key, label, hint }) => <label className="slider" key={key}><span><b>{label}</b><small>{hint}</small><output>{signals[key]}</output></span><input type="range" min="0" max="100" value={signals[key]} onChange={(event) => { setSignals((current) => ({ ...current, [key]: Number(event.target.value) })); setPreviewSeed((value) => value + 1); setRecord(undefined); setStatus("preview"); }} /></label>)}
      <button className="runButton" type="button" disabled={status === "running" || authStatus === "signing"} onClick={() => void run()}>{status === "running" ? "RECORDING WORLD EVENT…" : address ? "RUN + RECORD THIS WORLD" : "SIGN IN TO RUN"}<span>↗</span></button>
      {error && <p className="labError" role="alert">{error}</p>}
    </div>
    <div className="receipt" aria-live="polite">
      <div className="receiptTop"><span>{record ? `PUBLIC RECORD / ${record.id}` : "LOCAL PREVIEW"}</span><b>{record ? "SHA-256 VERIFIED" : "NOT YET PERSISTED"}</b></div>
      <div className="receiptDecision"><small>DECISION</small><strong>{result.behavior}</strong><span>{Math.round(result.confidence * 100)}% confidence</span></div>
      <dl><div><dt>WORLD EVENT</dt><dd>{result.event}</dd></div><div><dt>SECTOR</dt><dd>{result.sector}</dd></div><div><dt>MODEL</dt><dd>{record?.modelVersion || "FFW-CI/0.1"}</dd></div><div><dt>SEED</dt><dd>{result.seed}</dd></div></dl>
      {record && <div className="receiptActions"><a href={`/experiments/${record.id}`}>OPEN REPLAY</a><button type="button" onClick={() => void copyRecord()}>COPY LINK</button></div>}
    </div>
  </div>;
}
