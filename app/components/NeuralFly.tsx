"use client";

import { useEffect, useRef } from "react";
import type { Experiment } from "../lib/experiment";

type Props = { experiment: Experiment; compact?: boolean; filmFrame?: number };

export default function NeuralFly({ experiment, compact = false, filmFrame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let internalFrame = 0;
    let raf = 0;
    let active = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const motion = filmFrame !== undefined || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - rect.left) / rect.width - .5;
      pointer.ty = (event.clientY - rect.top) / rect.height - .5;
    };

    const draw = () => {
      const frame = filmFrame ?? internalFrame;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      if (canvas.width !== rect.width * ratio || canvas.height !== rect.height * ratio) {
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
      }
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.save();
      context.scale(ratio, ratio);
      const w = width / ratio;
      const h = height / ratio;
      pointer.x += (pointer.tx - pointer.x) * .035;
      pointer.y += (pointer.ty - pointer.y) * .035;
      const behaviorDrift = !motion ? 0 : experiment.behavior === "APPROACH" ? Math.sin(frame * .025) * 5 : experiment.behavior === "AVOID" ? Math.sin(frame * .11) * 8 : experiment.behavior === "EXPLORE" ? Math.sin(frame * .018) * 12 : 0;
      const cx = w * 0.52 + pointer.x * 18;
      const cy = h * 0.5 + behaviorDrift + pointer.y * 12;
      const scale = Math.min(w / 760, h / 540);
      const pulse = motion ? (Math.sin(frame * 0.035) + 1) / 2 : 0.5;
      const time = frame * .012;

      for (let index = 0; index < (compact ? 34 : 64); index++) {
        const depth = (index % 7 + 1) / 7;
        const x = ((index * 97.7 + time * 18 * depth) % (w + 80)) - 40 + pointer.x * 28 * depth;
        const y = (index * 53.3 + Math.sin(time + index) * 18) % h;
        context.fillStyle = `rgba(190,255,65,${.025 + depth * .08})`;
        context.beginPath(); context.arc(x, y, .4 + depth * 1.5, 0, Math.PI * 2); context.fill();
      }
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, 260 * scale);
      glow.addColorStop(0, `rgba(186,255,53,${.07 + pulse * .045})`); glow.addColorStop(1, "rgba(5,8,5,0)");
      context.fillStyle = glow; context.fillRect(0, 0, w, h);

      context.strokeStyle = "rgba(190,255,65,.11)";
      context.lineWidth = 1;
      for (let radius = 70; radius < Math.min(w, h) * 0.56; radius += 60) {
        context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke();
      }
      context.strokeStyle = "rgba(190,255,65,.17)";
      context.setLineDash([3, 8]);
      context.beginPath(); context.arc(cx, cy, 205 * scale, 0, Math.PI * 2); context.stroke();
      context.setLineDash([]);

      const wing = (side: number) => {
        const beat = motion ? Math.sin(frame * .18) * .08 : 0;
        context.save(); context.translate(cx, cy); context.scale(side, 1); context.rotate((-0.16 + beat) * side);
        context.beginPath(); context.ellipse(115 * scale, -72 * scale, 142 * scale, (61 + beat * 80) * scale, -0.35, 0, Math.PI * 2);
        const membrane = context.createLinearGradient(0, -130 * scale, 210 * scale, 10 * scale);
        membrane.addColorStop(0, "rgba(232,255,222,.16)"); membrane.addColorStop(1, "rgba(160,255,122,.015)");
        context.fillStyle = membrane; context.fill(); context.strokeStyle = "rgba(205,255,184,.48)"; context.lineWidth = 1; context.stroke();
        context.globalAlpha = .18; context.beginPath(); context.moveTo(20 * scale, -55 * scale); context.lineTo(220 * scale, -104 * scale); context.moveTo(38 * scale, -40 * scale); context.lineTo(207 * scale, -48 * scale); context.stroke();
        context.restore();
      };
      wing(-1); wing(1);

      context.save(); context.translate(cx, cy);
      context.strokeStyle = "rgba(207,255,191,.88)"; context.fillStyle = "rgba(8,15,9,.96)"; context.lineWidth = 1.4;
      context.beginPath(); context.ellipse(0, 42 * scale, 42 * scale, 115 * scale, 0, 0, Math.PI * 2); context.fill(); context.stroke();
      context.beginPath(); context.arc(0, -72 * scale, 55 * scale, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = "rgba(255,89,63,.78)";
      context.beginPath(); context.arc(-32 * scale, -80 * scale, 22 * scale, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.arc(32 * scale, -80 * scale, 22 * scale, 0, Math.PI * 2); context.fill();

      const nodes = [
        [-22,-65],[0,-86],[22,-65],[-26,-32],[0,-35],[27,-31],[-20,3],[15,8],[-16,42],[18,48],[0,77]
      ];
      const links = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[5,7],[6,8],[7,9],[8,10],[9,10]];
      context.strokeStyle = "rgba(190,255,65,.36)";
      links.forEach(([a,b], linkIndex) => {
        context.beginPath(); context.moveTo(nodes[a][0]*scale,nodes[a][1]*scale); context.lineTo(nodes[b][0]*scale,nodes[b][1]*scale); context.stroke();
        if (motion) {
          const progress = ((frame * .018 + linkIndex * .13) % 1);
          const x = (nodes[a][0] + (nodes[b][0] - nodes[a][0]) * progress) * scale;
          const y = (nodes[a][1] + (nodes[b][1] - nodes[a][1]) * progress) * scale;
          context.shadowColor = "#beff41"; context.shadowBlur = 10; context.fillStyle = "#beff41";
          context.beginPath(); context.arc(x, y, 1.6 * scale, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
        }
      });
      nodes.forEach(([x,y], index) => {
        const wave = motion ? (Math.sin(frame * .05 - index * .8) + 1) / 2 : .6;
        context.shadowColor = "#beff41"; context.shadowBlur = 7 + wave * 15;
        context.fillStyle = `rgba(190,255,65,${.5 + wave * .5})`;
        context.beginPath(); context.arc(x*scale,y*scale,(2.5+wave*2.4)*scale,0,Math.PI*2); context.fill();
      });
      context.shadowBlur = 0;
      const leg = (x: number, y: number, dx: number, dy: number) => { context.beginPath(); context.moveTo(x*scale,y*scale); context.quadraticCurveTo(dx*.55*scale,dy*.45*scale,dx*scale,dy*scale); context.stroke(); };
      context.strokeStyle = "rgba(207,255,191,.75)"; context.lineWidth = 1.2;
      leg(-24,10,-110,82); leg(-28,35,-125,135); leg(-22,66,-90,174); leg(24,10,110,82); leg(28,35,125,135); leg(22,66,90,174);
      context.restore();

      const signalColor = experiment.behavior === "AVOID" ? "#ff593f" : experiment.behavior === "FREEZE" ? "#ffbd3e" : "#beff41";
      context.strokeStyle = signalColor; context.globalAlpha = .25 + pulse * .4;
      context.lineWidth = 2;
      context.beginPath(); context.arc(cx, cy, (145 + pulse * 45) * scale, 0, Math.PI * 2); context.stroke();
      context.restore();
      internalFrame += 1;
      if (active && motion && filmFrame === undefined) raf = requestAnimationFrame(draw);
    };
    draw();
    const visibility = () => { active = !document.hidden; if (active && motion && filmFrame === undefined) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); } };
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", () => { pointer.tx = 0; pointer.ty = 0; });
    window.addEventListener("resize", draw);
    return () => { active = false; cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", visibility); canvas.removeEventListener("pointermove", move); window.removeEventListener("resize", draw); };
  }, [experiment, compact, filmFrame]);

  return <canvas ref={canvasRef} className={compact ? "neuralCanvas compact" : "neuralCanvas"} aria-hidden="true" />;
}
