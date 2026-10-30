import { useState } from "react";
import "./Skyline.css";

const W = 800;
const H = 240;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Each style controls building size and which roof shapes appear
const STYLES = {
  towers: { hMin: 70, hMax: 200, wMin: 34, wMax: 64, roofs: ["flat", "flat", "antenna", "step"] },
  spires: { hMin: 50, hMax: 150, wMin: 28, wMax: 52, roofs: ["spire", "step", "dome", "flat"] },
  lowrise: { hMin: 28, hMax: 90, wMin: 30, wMax: 60, roofs: ["flat", "gable", "flat"], mountain: true },
};

function makeBuildings(style, scale) {
  const s = STYLES[style];
  const list = [];
  let x = -10;
  while (x < W) {
    const w = rand(s.wMin, s.wMax) * scale;
    const h = rand(s.hMin, s.hMax) * scale;
    list.push({ x, w, h, roof: pick(s.roofs) });
    x += w + rand(-6, 6);
  }
  return list;
}

// One SVG path string per layer: body plus roof shape for every building
function layerPath(buildings) {
  return buildings
    .map(({ x, w, h, roof }) => {
      const top = H - h;
      const cx = x + w / 2;
      let d = `M${x} ${H}V${top}`;
      if (roof === "gable") d += `L${cx} ${top - w * 0.3}`;
      d += `H${x + w}V${H}Z`;
      if (roof === "antenna") d += `M${cx - 1} ${top}v-20h2v20z`;
      if (roof === "spire") d += `M${x + w * 0.2} ${top}L${cx} ${top - w * 0.9}L${x + w * 0.8} ${top}z`;
      if (roof === "step") d += `M${x + w * 0.25} ${top}v-12h${w * 0.5}v12z`;
      if (roof === "dome") d += `M${x + w * 0.15} ${top}a${w * 0.35} ${w * 0.35} 0 0 1 ${w * 0.7} 0z`;
      return d;
    })
    .join("");
}

// Lit windows as tiny rectangles, all in a single path
function windowsPath(buildings) {
  let d = "";
  for (const { x, w, h } of buildings) {
    for (let wx = x + 7; wx < x + w - 9; wx += 11) {
      for (let wy = H - h + 12; wy < H - 8; wy += 14) {
        if (Math.random() < 0.3) d += `M${wx.toFixed(1)} ${wy.toFixed(1)}h4v6h-4z`;
      }
    }
  }
  return d;
}

function makeScene() {
  const style = pick(Object.keys(STYLES));
  const back = makeBuildings(style, 0.7);
  const front = makeBuildings(style, 1);
  return {
    mountain: STYLES[style].mountain,
    back: layerPath(back),
    front: layerPath(front),
    windows: windowsPath(front),
  };
}

export default function Skyline() {
  // Built once per page load, so each visit shows a different skyline
  const [scene] = useState(makeScene);

  return (
    <div className="skyline" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet">
        {scene.mountain && (
          <path
            className="sky-mountain"
            d={`M0 ${H}L110 ${H - 120}L170 ${H - 150}H520L600 ${H - 110}L800 ${H - 60}V${H}Z`}
          />
        )}
        <path className="sky-back" d={scene.back} />
        <path className="sky-front" d={scene.front} />
        <path className="sky-windows" d={scene.windows} />
      </svg>
    </div>
  );
}
