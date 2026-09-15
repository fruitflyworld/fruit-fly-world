"use client";

import { useCallback, useEffect, useState } from "react";
import FruitFlySwarm from "./FruitFlySwarm";

type World = { revision: number; energy: number; mappedSectors: string[]; events: { revision: number; public_id: string; record_hash: string; behavior: string; description: string; sector: string; energy_delta: number; created_at: string }[] };

export default function WorldMap() {
  const [world, setWorld] = useState<World>();
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try { const response = await fetch("/api/world", { cache: "no-store" }); if (!response.ok) throw new Error(); setWorld(await response.json()); setFailed(false); }
    catch { setFailed(true); }
  }, []);
  useEffect(() => {
    void load(); const event = () => void load(); window.addEventListener("ffw:world", event);
    const timer = window.setInterval(load, 20_000); return () => { clearInterval(timer); window.removeEventListener("ffw:world", event); };
  }, [load]);
  const active = world ? world.revision % 6 : 0;
  return <div className="worldPanel">
    <div className="worldMap" aria-label="Map of the persistent experiment world"><div className="mapGrid"/><div className="mapRadar" aria-hidden="true"/>{[0,1,2,3,4,5].map((node) => <i className={active === node ? "mapNode active" : "mapNode"} key={node} />)}<FruitFlySwarm variant="world"/><div className="worldMetrics"><span>WORLD REVISION <b>{world?.revision ?? "—"}</b></span><span>ENERGY <b>{world?.energy ?? "—"}</b></span><span>MAPPED <b>{world?.mappedSectors.length ?? "—"}</b></span></div><div className="mapCoordinates">CANONICAL MODEL / FFW-CI 0.1<br/>{world?.events[0]?.sector || "AWAITING FIRST ROUND"}</div></div>
    <div className="eventFeed"><header><span>WORLD EVENT STREAM</span><b>{failed ? "OFFLINE" : world ? "LIVE DATA" : "SYNCING"}</b></header>{world?.events.length ? world.events.map((event) => <a className="worldEvent" href={`/experiments/${event.public_id}`} key={event.revision}><time>#{event.revision}</time><b>{event.behavior}</b><span>{event.description}</span><small>{event.sector} · {event.energy_delta >= 0 ? "+" : ""}{event.energy_delta} ENERGY · {event.record_hash.slice(0, 8)}…</small></a>) : <div className="emptyFeed"><b>THE WORLD IS QUIET</b><span>Sign in and run the first public experiment.</span></div>}</div>
  </div>;
}
