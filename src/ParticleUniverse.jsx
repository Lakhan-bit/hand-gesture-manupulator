import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const PARTICLE_COUNT = 6000;
const PLANET_RADIUS  = 2.2;
const RING_INNER     = 3.0;
const RING_OUTER     = 5.5;

/* ══════════════════════════════════════════════════════════════
   BUILD ALL TARGET POSITION ARRAYS
══════════════════════════════════════════════════════════════ */
function buildTargets(count) {
  const arr = () => new Float32Array(count * 3);

  // ── saturn (default) ──────────────────────────────────────
  const saturn = arr();
  const PLANET_P = Math.floor(count * 0.35);
  for (let i = 0; i < PLANET_P; i++) {
    const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
    const r  = Math.cbrt(Math.random())*PLANET_RADIUS;
    saturn[i*3]   = r*Math.sin(ph)*Math.cos(th);
    saturn[i*3+1] = r*Math.sin(ph)*Math.sin(th)*0.95;
    saturn[i*3+2] = r*Math.cos(ph);
  }
  for (let i = PLANET_P; i < count; i++) {
    const a = Math.random()*Math.PI*2;
    const r = RING_INNER + Math.random()*(RING_OUTER-RING_INNER);
    saturn[i*3]   = r*Math.cos(a);
    saturn[i*3+1] = (Math.random()-0.5)*0.18;
    saturn[i*3+2] = r*Math.sin(a)*0.32;
  }

  // ── sphere ────────────────────────────────────────────────
  const sphere = arr();
  for (let i = 0; i < count; i++) {
    const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
    const r  = 3.5 + (Math.random()-0.5)*0.3;
    sphere[i*3]   = r*Math.sin(ph)*Math.cos(th);
    sphere[i*3+1] = r*Math.sin(ph)*Math.sin(th);
    sphere[i*3+2] = r*Math.cos(ph);
  }

  // ── torus ─────────────────────────────────────────────────
  const torus = arr();
  for (let i = 0; i < count; i++) {
    const u = Math.random()*Math.PI*2, v = Math.random()*Math.PI*2;
    const R = 3.5, r2 = 1.0;
    torus[i*3]   = (R+r2*Math.cos(v))*Math.cos(u);
    torus[i*3+1] = (R+r2*Math.cos(v))*Math.sin(u)*0.4;
    torus[i*3+2] = r2*Math.sin(v);
  }

  // ── dna double helix ──────────────────────────────────────
  const dna = arr();
  for (let i = 0; i < count; i++) {
    const t = (i/count)*Math.PI*12 - Math.PI*6;
    const off = (i%2)*Math.PI;
    const r2  = 1.5 + (Math.random()-0.5)*0.15;
    dna[i*3]   = r2*Math.cos(t+off);
    dna[i*3+1] = t*0.55 + (Math.random()-0.5)*0.1;
    dna[i*3+2] = r2*Math.sin(t+off);
  }

  // ── sine wave ─────────────────────────────────────────────
  const sine = arr();
  for (let i = 0; i < count; i++) {
    const x = (i/count)*14 - 7;
    sine[i*3]   = x;
    sine[i*3+1] = Math.sin(x*1.3)*2.5 + (Math.random()-0.5)*0.25;
    sine[i*3+2] = (Math.random()-0.5)*0.4;
  }

  // ── galaxy spiral ─────────────────────────────────────────
  const galaxy = arr();
  for (let i = 0; i < count; i++) {
    const arm  = i % 4;
    const frac = i/count;
    const r2   = frac*5.5 + 0.3;
    const spin = r2*1.4 + (arm/4)*Math.PI*2;
    galaxy[i*3]   = r2*Math.cos(spin) + (Math.random()-0.5)*0.35;
    galaxy[i*3+1] = (Math.random()-0.5)*0.4;
    galaxy[i*3+2] = r2*Math.sin(spin) + (Math.random()-0.5)*0.35;
  }

  // ── bar chart ─────────────────────────────────────────────
  const bars = arr();
  const BAR_H = [3,5,2,6,4,7,1.5,4.5];
  const pPerB = Math.floor(count/8);
  let bIdx = 0;
  for (let b = 0; b < 8; b++) {
    const bx  = (b-3.5)*1.6;
    const h   = BAR_H[b];
    const cnt = b===7 ? count-bIdx : pPerB;
    for (let j = 0; j < cnt; j++, bIdx++) {
      bars[bIdx*3]   = bx + (Math.random()-0.5)*1.1;
      bars[bIdx*3+1] = Math.random()*h - h/2;
      bars[bIdx*3+2] = (Math.random()-0.5)*0.4;
    }
  }

  // ── scatter plot ──────────────────────────────────────────
  const scatter = arr();
  for (let i = 0; i < count; i++) {
    const cx = (Math.floor(i/(count/6))-2.5)*2;
    const cy = Math.sin(cx*0.9)*1.5;
    scatter[i*3]   = cx + (Math.random()-0.5)*1.4;
    scatter[i*3+1] = cy + (Math.random()-0.5)*1.4;
    scatter[i*3+2] = (Math.random()-0.5)*0.5;
  }

  // ── heart ─────────────────────────────────────────────────
  const heart = arr();
  for (let i = 0; i < count; i++) {
    const t2 = (i/count)*Math.PI*2;
    const r2 = 0.5 + Math.random()*0.2;
    heart[i*3]   = 16*Math.pow(Math.sin(t2),3)*0.28*r2;
    heart[i*3+1] = (13*Math.cos(t2)-5*Math.cos(2*t2)-2*Math.cos(3*t2)-Math.cos(4*t2))*0.28*r2;
    heart[i*3+2] = (Math.random()-0.5)*0.5;
  }

  // ── trefoil knot ──────────────────────────────────────────
  const knot = arr();
  for (let i = 0; i < count; i++) {
    const t2 = (i/count)*Math.PI*2;
    knot[i*3]   = (Math.sin(t2)+2*Math.sin(2*t2))*1.8 + (Math.random()-0.5)*0.2;
    knot[i*3+1] = (Math.cos(t2)-2*Math.cos(2*t2))*1.8 + (Math.random()-0.5)*0.2;
    knot[i*3+2] = -Math.sin(3*t2)*1.8                  + (Math.random()-0.5)*0.2;
  }

  // ── cube wireframe ────────────────────────────────────────
  const cube = arr();
  const EDGES = [
    [[-1,-1,-1],[1,-1,-1]],[[-1,1,-1],[1,1,-1]],
    [[-1,-1,1],[1,-1,1]],[[-1,1,1],[1,1,1]],
    [[-1,-1,-1],[-1,1,-1]],[[1,-1,-1],[1,1,-1]],
    [[-1,-1,1],[-1,1,1]],[[1,-1,1],[1,1,1]],
    [[-1,-1,-1],[-1,-1,1]],[[1,-1,-1],[1,-1,1]],
    [[-1,1,-1],[-1,1,1]],[[1,1,-1],[1,1,1]],
  ];
  const S = 2.8;
  for (let i = 0; i < count; i++) {
    const e  = EDGES[i%EDGES.length];
    const t2 = Math.random();
    cube[i*3]   = (e[0][0]*(1-t2)+e[1][0]*t2)*S + (Math.random()-0.5)*0.15;
    cube[i*3+1] = (e[0][1]*(1-t2)+e[1][1]*t2)*S + (Math.random()-0.5)*0.15;
    cube[i*3+2] = (e[0][2]*(1-t2)+e[1][2]*t2)*S + (Math.random()-0.5)*0.15;
  }

  // ── möbius band ───────────────────────────────────────────
  const mobius = arr();
  for (let i = 0; i < count; i++) {
    const u = (Math.random()*2-1)*0.5;
    const v = Math.random()*Math.PI*2;
    const R2 = 3.5;
    mobius[i*3]   = (R2+(u*Math.cos(v/2)))*Math.cos(v);
    mobius[i*3+1] = (R2+(u*Math.cos(v/2)))*Math.sin(v)*0.4;
    mobius[i*3+2] = u*Math.sin(v/2);
  }

  // ── pyramid ───────────────────────────────────────────────
  const pyramid = arr();
  for (let i = 0; i < count; i++) {
    const h  = Math.random()*4;
    const r2 = (1-h/4)*3;
    const a  = Math.random()*Math.PI*2;
    pyramid[i*3]   = r2*Math.cos(a)*(0.8+Math.random()*0.4);
    pyramid[i*3+1] = h - 2;
    pyramid[i*3+2] = r2*Math.sin(a)*(0.8+Math.random()*0.4);
  }

  // ── lissajous ─────────────────────────────────────────────
  const lissajous = arr();
  for (let i = 0; i < count; i++) {
    const t2 = (i/count)*Math.PI*2*3;
    lissajous[i*3]   = Math.sin(3*t2+Math.PI/4)*4 + (Math.random()-0.5)*0.2;
    lissajous[i*3+1] = Math.sin(2*t2)*3            + (Math.random()-0.5)*0.2;
    lissajous[i*3+2] = Math.sin(t2)*1.5            + (Math.random()-0.5)*0.2;
  }

  // ── wormhole tunnel ───────────────────────────────────────
  const wormhole = arr();
  for (let i = 0; i < count; i++) {
    const z2 = (i/count)*14 - 7;
    const r2 = 1.8 + Math.abs(z2)*0.35 + (Math.random()-0.5)*0.2;
    const a  = Math.random()*Math.PI*2;
    wormhole[i*3]   = r2*Math.cos(a);
    wormhole[i*3+1] = r2*Math.sin(a);
    wormhole[i*3+2] = z2 + (Math.random()-0.5)*0.15;
  }

  // ── pie chart ─────────────────────────────────────────────
  const pie = arr();
  const wedges = [0.35, 0.4, 0.25];
  let cumAng = 0, pIdx = 0;
  wedges.forEach((frac, wi) => {
    const cnt = Math.floor(count*frac);
    const start = cumAng, end = cumAng + frac*Math.PI*2;
    for (let j = 0; j < cnt; j++, pIdx++) {
      const a  = start + Math.random()*(end-start);
      const r2 = Math.sqrt(Math.random())*3.8;
      pie[pIdx*3]   = r2*Math.cos(a);
      pie[pIdx*3+1] = wi*0.5 - 0.5 + (Math.random()-0.5)*0.12;
      pie[pIdx*3+2] = r2*Math.sin(a);
    }
    cumAng = end;
  });
  while (pIdx < count) { pie[pIdx*3]=pie[pIdx*3+1]=pie[pIdx*3+2]=0; pIdx++; }

  // ── line graph ────────────────────────────────────────────
  const linegraph = arr();
  const pPerL = Math.floor(count/3);
  for (let li = 0; li < 3; li++) {
    for (let j = 0; j < pPerL; j++) {
      const idx = li*pPerL+j;
      const x   = (j/pPerL)*12-6;
      linegraph[idx*3]   = x;
      linegraph[idx*3+1] = Math.sin(x*0.8+li*1.3)*2 + li*1.5 - 1.5 + (Math.random()-0.5)*0.3;
      linegraph[idx*3+2] = (Math.random()-0.5)*0.25;
    }
  }

  // ── vortex funnel ─────────────────────────────────────────
  const vortex = arr();
  for (let i = 0; i < count; i++) {
    const t2 = (i/count)*Math.PI*2*8;
    const r2 = (i/count)*4.5 + 0.2;
    vortex[i*3]   = r2*Math.cos(t2) + (Math.random()-0.5)*0.2;
    vortex[i*3+1] = -(i/count)*5 + 2.5 + (Math.random()-0.5)*0.15;
    vortex[i*3+2] = r2*Math.sin(t2) + (Math.random()-0.5)*0.2;
  }

  // ── klein bottle ─────────────────────────────────────────
  const klein = arr();
  for (let i = 0; i < count; i++) {
    const u = Math.random()*Math.PI*2;
    const v = Math.random()*Math.PI*2;
    let x, y, z;
    if (u < Math.PI) {
      x = 3*Math.cos(u)*(1+Math.sin(u)) + (2*(1-Math.cos(u)/2))*Math.cos(u)*Math.cos(v);
      z = -8*Math.sin(u) - 2*(1-Math.cos(u)/2)*Math.sin(u)*Math.cos(v);
    } else {
      x = 3*Math.cos(u)*(1+Math.sin(u)) + (2*(1-Math.cos(u)/2))*Math.cos(v+Math.PI);
      z = -8*Math.sin(u);
    }
    y = -2*(1-Math.cos(u)/2)*Math.sin(v);
    klein[i*3]   = x*0.25 + (Math.random()-0.5)*0.1;
    klein[i*3+1] = y*0.25 + (Math.random()-0.5)*0.1;
    klein[i*3+2] = z*0.25 + (Math.random()-0.5)*0.1;
  }

  // ── area chart ────────────────────────────────────────────
  const areachart = arr();
  const pPerS = Math.floor(count/4);
  for (let s = 0; s < 4; s++) {
    for (let j = 0; j < pPerS; j++) {
      const idx = s*pPerS+j;
      const x   = (j/pPerS)*10-5;
      areachart[idx*3]   = x;
      areachart[idx*3+1] = s*1.2 - 2.0 + Math.random()*(Math.abs(Math.sin(x*0.6+s*0.8))*2+0.3);
      areachart[idx*3+2] = s*0.8-1.6 + (Math.random()-0.5)*0.3;
    }
  }

  return { saturn, sphere, torus, dna, sine, galaxy, bars, scatter, heart, knot,
           cube, mobius, pyramid, lissajous, wormhole, pie, linegraph, vortex, klein, areachart };
}

/* ══════════════════════════════════════════════════════════════
   GESTURE DETECTION — 20 distinct poses
══════════════════════════════════════════════════════════════ */
function detectGesture(lm) {
  if (!lm || lm.length === 0) return { type:"none" };

  const W=lm[0], T=lm[4];
  const I8=lm[8], I5=lm[5];
  const M12=lm[12], M9=lm[9];
  const R16=lm[16], R13=lm[13];
  const P20=lm[20], P17=lm[17];

  const isExt = (tip,mcp) => tip.y < mcp.y - 0.04;
  const iE=isExt(I8,I5), mE=isExt(M12,M9), rE=isExt(R16,R13), pE=isExt(P20,P17);
  const ext=[iE,mE,rE,pE].filter(Boolean).length;

  const palmX=(W.x+I5.x+M9.x)/3;
  const palmY=(W.y+I5.y+M9.y)/3;
  const spread=Math.hypot(I8.x-P20.x,I8.y-P20.y)+Math.hypot(T.x-P20.x,T.y-P20.y);
  const pinch=Math.hypot(T.x-I8.x,T.y-I8.y);
  const thumbUp  = T.y < W.y-0.12 && ext===0;
  const thumbDn  = T.y > W.y+0.08 && ext===0;

  if (ext===0 && !thumbUp && !thumbDn) return { type:"fist",       palmX, palmY };
  if (thumbUp)                          return { type:"thumbsup",   palmX, palmY };
  if (thumbDn)                          return { type:"thumbsdown", palmX, palmY };
  if (ext===4 && spread>0.45)           return { type:"open",       palmX, palmY };
  if (ext===4 && spread<=0.45)          return { type:"cupped",     palmX, palmY };
  if (pinch<0.07)                       return { type:"pinch",      palmX, palmY };
  if (ext===1 && iE)                    return { type:"point",      palmX, palmY };
  if (ext===1 && mE)                    return { type:"middle",     palmX, palmY };
  if (ext===1 && rE)                    return { type:"ringonly",   palmX, palmY };
  if (ext===1 && pE)                    return { type:"pinkyonly",  palmX, palmY };
  if (iE&&mE&&!rE&&!pE)                return { type:"peace",      palmX, palmY };
  if (iE&&mE&&rE&&!pE)                 return { type:"three",      palmX, palmY };
  if (iE&&!mE&&!rE&&pE)               return { type:"horns",      palmX, palmY };
  if (!iE&&!mE&&rE&&pE)               return { type:"ringpinky",  palmX, palmY };
  if (iE&&!mE&&!rE&&pE&&pinch<0.14)  return { type:"loosehorns", palmX, palmY };

  return { type:"idle", palmX, palmY };
}

/* ══════════════════════════════════════════════════════════════
   GESTURE METADATA
══════════════════════════════════════════════════════════════ */
const GM = {
  none:       { shape:"saturn",    label:"🪐 SATURN",        color:"#ffd98e", desc:"Default planet" },
  idle:       { shape:"saturn",    label:"• IDLE",           color:"#ffd98e", desc:"Rest state" },
  fist:       { shape:"freeze",    label:"✊ FREEZE",        color:"#7ec8ff", desc:"Hold all motion" },
  thumbsup:   { shape:"snake",     label:"👍 SNAKE",         color:"#aaffcc", desc:"Sinuous ribbon" },
  thumbsdown: { shape:"vortex",    label:"👎 VORTEX FUNNEL", color:"#ff88cc", desc:"Spiral funnel" },
  open:       { shape:"explode",   label:"✋ EXPLODE",       color:"#ff9955", desc:"Scatter burst" },
  cupped:     { shape:"sphere",    label:"🫴 CYCLE SHAPES",  color:"#55ddff", desc:"Hold to cycle extras" },
  pinch:      { shape:"heart",     label:"🤌 HEART",         color:"#ff5577", desc:"Particle heart" },
  point:      { shape:"attract",   label:"☝ ATTRACT",       color:"#ff6b6b", desc:"Pull to finger" },
  peace:      { shape:"sine",      label:"✌ SINE WAVE",     color:"#88ffcc", desc:"Wave graph" },
  three:      { shape:"linegraph", label:"3️⃣ LINE CHART",   color:"#88aaff", desc:"Multi-line chart" },
  horns:      { shape:"galaxy",    label:"🤘 GALAXY",        color:"#ff44ff", desc:"Spiral arms" },
  ringpinky:  { shape:"dna",       label:"🖖 DNA HELIX",     color:"#44ffdd", desc:"Double helix" },
  middle:     { shape:"bars",      label:"🖕 BAR CHART",     color:"#ffcc44", desc:"Bar graph" },
  ringonly:   { shape:"scatter",   label:"💍 SCATTER PLOT",  color:"#ff9977", desc:"Scatter graph" },
  pinkyonly:  { shape:"pie",       label:"🤙 PIE CHART",     color:"#cc88ff", desc:"3-D pie" },
  loosehorns: { shape:"areachart", label:"🤟 AREA CHART",    color:"#88ffaa", desc:"Stacked area" },
};

const BASE_MAP = {
  none:"saturn", idle:"saturn", fist:"freeze", thumbsup:"snake",
  thumbsdown:"vortex", open:"explode", cupped:"sphere", pinch:"heart",
  point:"attract", peace:"sine", three:"linegraph", horns:"galaxy",
  ringpinky:"dna", middle:"bars", ringonly:"scatter", pinkyonly:"pie",
  loosehorns:"areachart",
};

const EXTRA_SHAPES = ["torus","knot","cube","mobius","lissajous","wormhole","klein","pyramid"];
const EXTRA_LABELS = {
  torus:    { label:"⭕ TORUS",         color:"#ffaa44" },
  knot:     { label:"🔱 TREFOIL KNOT",  color:"#cc44ff" },
  cube:     { label:"📦 CUBE",          color:"#44ccff" },
  mobius:   { label:"∞  MÖBIUS BAND",   color:"#ff8844" },
  lissajous:{ label:"〰 LISSAJOUS",     color:"#aaffff" },
  wormhole: { label:"🌀 WORMHOLE",      color:"#ffccff" },
  klein:    { label:"🫧 KLEIN BOTTLE",  color:"#ff99cc" },
  pyramid:  { label:"🔺 PYRAMID",       color:"#ffdd88" },
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function SaturnParticleUniverse() {
  const mountRef  = useRef(null);
  const videoRef  = useRef(null);
  const gestRef   = useRef({ type:"none" });
  const histRef   = useRef([]);
  const confRef   = useRef({ type:"none", shape:"saturn", palmX:.5, palmY:.5, progress:0 });
  const sHandRef  = useRef({ x:.5, y:.5 });
  const frozenRef = useRef(false);
  const snakePhR  = useRef(0);
  const targRef   = useRef(null);
  const exCycleR  = useRef(0);
  const lastCupR  = useRef(0);
  const lastUiR   = useRef(0);

  const [camReady,  setCamReady]  = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [uiG, setUiG] = useState({ label:"NO HANDS", color:"#888", desc:"", shape:"" });

  useEffect(() => {
    const W=window.innerWidth, H=window.innerHeight;
    const mountNode=mountRef.current;
    if(!mountNode) return;

    const targets = buildTargets(PARTICLE_COUNT);
    targRef.current = targets;

    // ── Renderer ──────────────────────────────────────────
    const renderer=new THREE.WebGLRenderer({ antialias:true, powerPreference:"high-performance" });
    renderer.setSize(W,H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x000000,1);
    mountNode.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(55,W/H,.1,1000);
    camera.position.set(0,4,16);
    camera.lookAt(0,0,0);

    // ── Buffers ───────────────────────────────────────────
    const orig=new Float32Array(targets.saturn);
    const pos =new Float32Array(targets.saturn);
    const vel =new Float32Array(PARTICLE_COUNT*3);
    const col =new Float32Array(PARTICLE_COUNT*3);

    const _c=new THREE.Color();
    for(let i=0;i<PARTICLE_COUNT;i++){
      const h=0.08+(i/PARTICLE_COUNT)*0.12;
      _c.setHSL(h,.95,.55+Math.random()*.25);
      col[i*3]=_c.r; col[i*3+1]=_c.g; col[i*3+2]=_c.b;
    }

    // ── Geometry / Material ───────────────────────────────
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    geo.setAttribute("aColor",  new THREE.BufferAttribute(col,3));

    const mat=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0}},
      vertexShader:`
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vDepth;
        void main(){
          vColor=aColor;
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          vDepth=length(mv.xyz);
          gl_PointSize=clamp(290.0/vDepth,1.0,22.0);
          gl_Position=projectionMatrix*mv;
        }
      `,
      fragmentShader:`
        varying vec3 vColor;
        varying float vDepth;
        void main(){
          vec2 uv=gl_PointCoord-.5;
          float d=length(uv);
          if(d>.5) discard;
          float core=1.-smoothstep(0.,.2,d);
          float halo=(1.-smoothstep(.1,.5,d))*.4;
          float a=(core+halo)*clamp(1.-vDepth*.03,.25,1.);
          gl_FragColor=vec4(vColor+vec3(.18,.09,0.)*core,a*.9);
        }
      `,
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(geo,mat));

    // ── Starfield ─────────────────────────────────────────
    const sP=new Float32Array(1400*3);
    for(let i=0;i<1400;i++){
      sP[i*3]=(Math.random()-.5)*220; sP[i*3+1]=(Math.random()-.5)*220; sP[i*3+2]=(Math.random()-.5)*220;
    }
    const sGeo=new THREE.BufferGeometry();
    sGeo.setAttribute("position",new THREE.BufferAttribute(sP,3));
    const sMat=new THREE.PointsMaterial({color:0xffeedd,size:.13,transparent:true,opacity:.45});
    scene.add(new THREE.Points(sGeo,sMat));

    // ── Faint grid ────────────────────────────────────────
    const gPts=[];
    for(let x=-6;x<=6;x+=2){gPts.push(x,-3,-6,x,-3,6);}
    for(let z=-6;z<=6;z+=2){gPts.push(-6,-3,z,6,-3,z);}
    const gGeo=new THREE.BufferGeometry();
    gGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(gPts),3));
    scene.add(new THREE.LineSegments(gGeo,new THREE.LineBasicMaterial({color:0x222211,transparent:true,opacity:.2})));

    // ── Animation loop ────────────────────────────────────
    let frameId, orbit=0;
    const clock=new THREE.Clock();

    function loop(){
      frameId=requestAnimationFrame(loop);
      const t=clock.getElapsedTime();
      mat.uniforms.uTime.value=t;

      orbit+=.002;
      camera.position.x=Math.sin(orbit)*16;
      camera.position.z=Math.cos(orbit)*16;
      camera.position.y=4+Math.sin(orbit*.4)*2;
      camera.lookAt(0,0,0);

      // Debounce gesture
      const raw=gestRef.current;
      const hasHand=raw.type!=="none"&&raw.palmX!==undefined;
      if(hasHand){
        sHandRef.current.x+=(raw.palmX-sHandRef.current.x)*.1;
        sHandRef.current.y+=(raw.palmY-sHandRef.current.y)*.1;
      }
      const hist=histRef.current;
      if(raw.type!=="none"){hist.push(raw.type);if(hist.length>14)hist.shift();}
      else hist.length=0;

      const counts={};
      hist.forEach(g=>(counts[g]=(counts[g]||0)+1));
      let best=raw.type,bestN=0;
      for(const[k,v]of Object.entries(counts))if(v>bestN){bestN=v;best=k;}

      const conf=confRef.current;
      const agreed=hist.length>0&&bestN/hist.length>=.6;

      if(agreed&&conf.type!==best){
        if(best==="fist")       frozenRef.current=true;
        else                    frozenRef.current=false;

        let shape=BASE_MAP[best]||"saturn";
        if(best==="cupped"){
          const now=Date.now();
          if(now-lastCupR.current>1600){
            lastCupR.current=now;
            exCycleR.current=(exCycleR.current+1)%EXTRA_SHAPES.length;
          }
          shape=EXTRA_SHAPES[exCycleR.current];
        }

        conf.type=best; conf.shape=shape; conf.progress=0;

        if(shape!=="freeze"&&shape!=="snake"&&shape!=="attract"&&shape!=="explode"&&shape!=="vortex"){
          const tgt=targRef.current[shape];
          if(tgt) for(let i=0;i<PARTICLE_COUNT*3;i++) orig[i]=tgt[i];
        }
        if(shape==="saturn"){
          const tgt=targRef.current.saturn;
          for(let i=0;i<PARTICLE_COUNT*3;i++) orig[i]=tgt[i];
        }
      }

      if(!hasHand&&conf.type!=="none"){
        frozenRef.current=false;
        conf.progress=Math.max(0,conf.progress-.04);
        if(conf.progress===0){
          conf.type="none"; conf.shape="saturn";
          const tgt=targRef.current.saturn;
          for(let i=0;i<PARTICLE_COUNT*3;i++) orig[i]=tgt[i];
        }
      }
      if(conf.progress<1) conf.progress=Math.min(1,conf.progress+.045);

      const intensity=conf.progress;
      const hwX=(0.5-sHandRef.current.x)*9;
      const hwY=(0.5-sHandRef.current.y)*6;
      const cs=conf.shape;
      snakePhR.current+=.038;

      // Particle physics
      for(let i=0;i<PARTICLE_COUNT;i++){
        const ix=i*3,iy=ix+1,iz=ix+2;

        if(frozenRef.current){
          _c.setHSL(.58+Math.random()*.06,.75,.65);
          col[ix]=_c.r; col[iy]=_c.g; col[iz]=_c.b;
          continue;
        }

        let ax=0,ay=0,az=0;
        const damp=.966;

        // Micro drift
        ax+=Math.sin(pos[ix]*1.1+t*.55)*.0012;
        ay+=Math.cos(pos[iy]*1.1+t*.45)*.0012;
        az+=Math.sin(pos[iz]*1.1+t*.70)*.0012;

        // Spring to target
        const k=cs==="explode"?.0004:.0025;
        ax+=(orig[ix]-pos[ix])*k;
        ay+=(orig[iy]-pos[iy])*k;
        az+=(orig[iz]-pos[iz])*k;

        // Gesture-specific forces
        if(cs==="explode"){
          const ex=pos[ix]||.01,ey=pos[iy]||.01,ez=pos[iz]||.01;
          const ed=Math.sqrt(ex*ex+ey*ey+ez*ez)+.01;
          const f=.055*intensity;
          ax+=ex/ed*f; ay+=ey/ed*f; az+=ez/ed*f;
        } else if(cs==="snake"){
          const p=snakePhR.current, ni=i/PARTICLE_COUNT;
          ax+=(Math.sin(ni*Math.PI*3+p)*5-pos[ix])*.022*intensity;
          ay+=(Math.cos(ni*Math.PI*2+p*.7)*2-pos[iy])*.022*intensity;
          az+=(Math.sin(ni*Math.PI*4+p*1.3)*2.5-pos[iz])*.022*intensity;
        } else if(cs==="attract"){
          const dx=hwX-pos[ix],dy=hwY-pos[iy],dz=-pos[iz];
          const d=Math.sqrt(dx*dx+dy*dy+dz*dz)+.1;
          const f=Math.min(7/d,.55)*intensity;
          ax+=dx/d*f; ay+=dy/d*f; az+=dz/d*f;
        } else if(cs==="vortex"){
          const d=Math.sqrt(pos[ix]**2+pos[iz]**2)+.1;
          const f=.03*intensity;
          ax+=(-pos[iz]/d*f*2-pos[ix]/d*f);
          ay-=.015*intensity;
          az+=(pos[ix]/d*f*2-pos[iz]/d*f);
        }

        vel[ix]=(vel[ix]+ax*7)*damp;
        vel[iy]=(vel[iy]+ay*7)*damp;
        vel[iz]=(vel[iz]+az*7)*damp;
        pos[ix]+=vel[ix]; pos[iy]+=vel[iy]; pos[iz]+=vel[iz];

        const d2=pos[ix]**2+pos[iy]**2+pos[iz]**2;
        if(d2>20**2){
          vel[ix]+=(orig[ix]-pos[ix])*.014;
          vel[iy]+=(orig[iy]-pos[iy])*.014;
          vel[iz]+=(orig[iz]-pos[iz])*.014;
          if(d2>28**2){pos[ix]=orig[ix];pos[iy]=orig[iy];pos[iz]=orig[iz];vel[ix]=vel[iy]=vel[iz]=0;}
        }

        // Dynamic colour
        const spd=Math.sqrt(vel[ix]**2+vel[iy]**2+vel[iz]**2);
        const hue=
          cs==="heart"?0.97+Math.random()*.05:
          cs==="galaxy"?(i/PARTICLE_COUNT+t*.015)%1:
          cs==="dna"?(i%2===0?.5:.15):
          cs==="vortex"?.82+Math.random()*.1:
          cs==="pie"?[0,.35,.65][Math.floor(i/(PARTICLE_COUNT/3))]||0:
          cs==="knot"?.72+Math.random()*.15:
          cs==="wormhole"?.88+Math.random()*.1:
          0.08+(i/PARTICLE_COUNT)*.12+t*.008;
        const lit=Math.min(.45+spd*6,.92);
        const sat=Math.min(.8+spd*3,1);
        _c.setHSL(hue%1,sat,lit);
        col[ix]=_c.r; col[iy]=_c.g; col[iz]=_c.b;
      }

      geo.attributes.position.needsUpdate=true;
      geo.attributes.aColor.needsUpdate=true;
      renderer.render(scene,camera);

      const now=Date.now();
      if(now-lastUiR.current>140){
        lastUiR.current=now;
        let meta=GM[conf.type]||GM.none;
        let label=meta.label, color=meta.color;
        if(conf.type==="cupped"&&EXTRA_LABELS[cs]){
          label=EXTRA_LABELS[cs].label; color=EXTRA_LABELS[cs].color;
        }
        setUiG({ label, color, desc:meta.desc, shape:cs });
        setHandCount(hist.length>0?1:0);
      }
    }

    loop();

    // MediaPipe
    const hands=new Hands({ locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands:1, modelComplexity:1, minDetectionConfidence:.65, minTrackingConfidence:.55 });
    hands.onResults(r=>{
      const cnt=r.multiHandLandmarks?.length||0;
      if(cnt===0){gestRef.current={type:"none"};histRef.current=[];return;}
      gestRef.current=detectGesture(r.multiHandLandmarks[0]);
    });

    const cam=new Camera(videoRef.current,{
      onFrame:async()=>{await hands.send({image:videoRef.current});},
      width:640,height:480,
    });
    cam.start().then(()=>setCamReady(true)).catch(e=>console.error(e));

    const onResize=()=>{
      const w=window.innerWidth,h=window.innerHeight;
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
    };
    window.addEventListener("resize",onResize);

    return()=>{
      cancelAnimationFrame(frameId); cam.stop();
      window.removeEventListener("resize",onResize);
      if(mountNode&&renderer.domElement) mountNode.removeChild(renderer.domElement);
      renderer.dispose(); geo.dispose(); mat.dispose(); sGeo.dispose(); sMat.dispose(); gGeo.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const cc=uiG.color||"#888";

  const LEGEND=[
    { icon:"🪐", g:"(none)",      label:"SATURN",        color:"#ffd98e" },
    { icon:"✊", g:"Fist",        label:"FREEZE",        color:"#7ec8ff" },
    { icon:"✋", g:"Open hand",   label:"EXPLODE",       color:"#ff9955" },
    { icon:"👍", g:"Thumbs up",  label:"SNAKE",         color:"#aaffcc" },
    { icon:"👎", g:"Thumbs down",label:"VORTEX FUNNEL", color:"#ff88cc" },
    { icon:"🫴", g:"Cupped",      label:"CYCLE SHAPES",  color:"#55ddff" },
    { icon:"🤌", g:"Pinch",       label:"HEART",         color:"#ff5577" },
    { icon:"☝",  g:"1 finger",   label:"ATTRACT",       color:"#ff6b6b" },
    { icon:"✌",  g:"Peace",       label:"SINE WAVE",     color:"#88ffcc" },
    { icon:"3",   g:"3 fingers",  label:"LINE CHART",    color:"#88aaff" },
    { icon:"🤘", g:"Horns",       label:"GALAXY",        color:"#ff44ff" },
    { icon:"🖖", g:"Ring+Pinky", label:"DNA HELIX",     color:"#44ffdd" },
    { icon:"🖕", g:"Middle",      label:"BAR CHART",     color:"#ffcc44" },
    { icon:"💍", g:"Ring only",  label:"SCATTER PLOT",  color:"#ff9977" },
    { icon:"🤙", g:"Pinky only", label:"PIE CHART",     color:"#cc88ff" },
    { icon:"🤟", g:"Loose horns",label:"AREA CHART",    color:"#88ffaa" },
  ];

  const EXTRAS=[
    { label:"TORUS",color:"#ffaa44"},{label:"TREFOIL KNOT",color:"#cc44ff"},
    { label:"CUBE", color:"#44ccff"},{label:"MÖBIUS",      color:"#ff8844"},
    { label:"LISSAJOUS",color:"#aaffff"},{label:"WORMHOLE",color:"#ffccff"},
    { label:"KLEIN BOTTLE",color:"#ff99cc"},{label:"PYRAMID",color:"#ffdd88"},
  ];

  return (
    <div style={{ position:"relative", width:"100vw", height:"100vh", background:"#000",
      overflow:"hidden", fontFamily:"'Courier New',monospace" }}>
      <div ref={mountRef} style={{ position:"absolute", inset:0 }} />

      <video ref={videoRef} style={{ position:"absolute", top:16, right:16, width:165, height:124,
        borderRadius:10, border:"1px solid rgba(255,210,120,0.18)", opacity:.8,
        transform:"scaleX(-1)", objectFit:"cover", zIndex:2 }}
        autoPlay playsInline muted />

      {/* Top bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, padding:"20px 24px",
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        pointerEvents:"none", zIndex:3 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:".4em", color:"rgba(255,200,100,0.28)", marginBottom:5 }}>
            PARTICLE UNIVERSE — GESTURE LAB
          </div>
          <div style={{ fontSize:17, color:"#ffd98e", letterSpacing:".04em" }}>
            {PARTICLE_COUNT.toLocaleString()} particles · 20 gestures
          </div>
        </div>

        <div style={{ textAlign:"right", marginRight:185 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"7px 18px",
            border:`1px solid ${cc}44`, borderRadius:100, background:`${cc}12`,
            transition:"all .3s ease", backdropFilter:"blur(6px)" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:cc,
              boxShadow:`0 0 12px ${cc}bb`, transition:"all .3s ease" }} />
            <span style={{ fontSize:11, letterSpacing:".18em", color:cc,
              transition:"color .3s ease", minWidth:145, textAlign:"center" }}>
              {uiG.label}
            </span>
          </div>
          {uiG.desc && <div style={{ fontSize:9, color:"rgba(255,200,100,0.3)", marginTop:5, letterSpacing:".14em" }}>{uiG.desc}</div>}
          {handCount>0 && <div style={{ fontSize:8, color:"rgba(255,200,100,0.2)", marginTop:3, letterSpacing:".2em" }}>HAND DETECTED</div>}
        </div>
      </div>

      {/* Left legend */}
      <div style={{ position:"absolute", top:"50%", left:12, transform:"translateY(-50%)",
        display:"flex", flexDirection:"column", gap:3, zIndex:3, pointerEvents:"none",
        maxHeight:"82vh", overflowY:"auto" }}>
        {LEGEND.map(({ icon, g, label, color }) => {
          const active=uiG.label&&uiG.label.includes(label);
          return (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 9px",
              border:`1px solid ${active?color+"55":"rgba(255,210,120,0.07)"}`,
              borderRadius:7, background:active?`${color}18`:"rgba(0,0,0,0.5)",
              backdropFilter:"blur(4px)", opacity:active?1:.38,
              transition:"all .22s ease", transform:active?"scale(1.04)":"scale(1)" }}>
              <span style={{ fontSize:12 }}>{icon}</span>
              <div>
                <div style={{ fontSize:8, color:active?color:"rgba(255,200,100,0.4)",
                  letterSpacing:".12em", transition:"color .22s ease" }}>{label}</div>
                <div style={{ fontSize:7, color:"rgba(255,200,100,0.22)", letterSpacing:".08em" }}>{g}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: cupped-cycle extras panel */}
      <div style={{ position:"absolute", top:"50%", right:12, transform:"translateY(-50%)",
        display:"flex", flexDirection:"column", gap:3, zIndex:3, pointerEvents:"none" }}>
        <div style={{ fontSize:8, color:"rgba(255,200,100,0.25)", letterSpacing:".2em",
          textAlign:"center", marginBottom:4 }}>🫴 CYCLE</div>
        {EXTRAS.map(({ label, color }) => {
          const active=uiG.label&&uiG.label.toUpperCase().includes(label.split(" ")[0]);
          return (
            <div key={label} style={{ padding:"4px 10px", border:`1px solid ${active?color+"55":"rgba(255,210,120,0.07)"}`,
              borderRadius:7, background:active?`${color}18`:"rgba(0,0,0,0.5)",
              backdropFilter:"blur(4px)", opacity:active?1:.35, transition:"all .22s ease",
              transform:active?"scale(1.05)":"scale(1)" }}>
              <div style={{ fontSize:8, color:active?color:"rgba(255,200,100,0.38)",
                letterSpacing:".12em", transition:"color .22s" }}>{label}</div>
            </div>
          );
        })}
      </div>

      {/* Loading overlay */}
      {!camReady&&(
        <div style={{ position:"absolute", inset:0, zIndex:10, display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"center",
          gap:14, background:"#000" }}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ width:38, height:38, border:"2px solid rgba(255,210,100,0.1)",
            borderTopColor:"#ffd98e", borderRadius:"50%", animation:"spin .9s linear infinite" }} />
          <div style={{ fontSize:12, color:"rgba(255,210,100,0.45)", letterSpacing:".3em" }}>INITIALIZING GESTURE LAB</div>
          <div style={{ fontSize:9, color:"rgba(255,210,100,0.18)", letterSpacing:".2em" }}>ALLOW CAMERA ACCESS WHEN PROMPTED</div>
        </div>
      )}
    </div>
  );
}