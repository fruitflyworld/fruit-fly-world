"use client";

import { useEffect, useState } from "react";

const passports = [
  { name: "GENESIS", image: "/nft/passport-genesis-001.png", rarity: "UNLOCKED", color: "#00d5ff" },
  { name: "RARE", image: "/nft/passport-rare-001.png", rarity: "RARE", color: "#00d5ff" },
  { name: "EPIC", image: "/nft/passport-epic-001.png", rarity: "EPIC", color: "#ba89ff" },
  { name: "LEGENDARY", image: "/nft/passport-legendary-001.png", rarity: "LEGENDARY", color: "#ffd700" }
];

export default function HeroPassportGallery() {
  const [index, setIndex] = useState(0);
  const passport = passports[index];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((v) => (v + 1) % passports.length), 3500);
    return () => window.clearInterval(timer);
  }, []);

  return <div className="heroSpecimen">
    <div className="specimenAtmosphere" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
    <div className="specimenTop">
      <span><i/> FRUIT FLY WORLD · PASSPORT COLLECTION</span>
      <b>NFT PREVIEW / 0{index + 1}</b>
    </div>
    <div className="specimenReticle" aria-hidden="true"><i/><i/><i/><i/></div>
    <div className="heroPassportImage" key={index}>
      <img src={passport.image} alt={`${passport.name} Passport`} />
    </div>
    <div className="heroPassportLabel" key={`label-${index}`}>
      <small>{passport.rarity} · EDITION 1/1</small>
      <strong>{passport.name}</strong>
    </div>
    <div className="specimenScale" aria-hidden="true"><span>1024 × 1024</span></div>
    <div className="passportDots">
      {passports.map((p, i) => (
        <button
          key={p.name}
          className={i === index ? "active" : ""}
          onClick={() => setIndex(i)}
          aria-label={`Show ${p.name} passport`}
          style={{ "--dot-color": p.color } as React.CSSProperties}
        />
      ))}
    </div>
    <div className="specimenIndex" aria-hidden="true">0{index + 1}<span>/04</span></div>
  </div>;
}
