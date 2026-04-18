import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

const PARTICLE_COUNT = 3000;
const FIELD_RADIUS = 4;

/* ═══════════════════════════════════════════════════════════════
   Gesture detection with stricter thresholds + extra poses
   ═══════════════════════════════════════════════════════════════ */
function getGestureState(landmarks) {
  if (!landmarks || landmarks.length === 0) return { type: "none" };

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const middleMcp = landmarks[9];
  const ringTip = landmarks[16];
  const ringMcp = landmarks[13];
  const pinkyTip = landmarks[20];
  const pinkyMcp = landmarks[17];

  // Stricter extension test (y decreases upward in MediaPipe)
  const isExt = (tip, mcp) => tip.y < mcp.y - 0.04;
  const idxE = isExt(indexTip, indexMcp);
  const midE = isExt(middleTip, middleMcp);
  const rngE = isExt(ringTip, ringMcp);
  const pnkE = isExt(pinkyTip, pinkyMcp);
  const extCount = [idxE, midE, rngE, pnkE].filter(Boolean).length;

  const pinchDist = Math.hypot(
    thumbTip.x - indexTip.x,
    thumbTip.y - indexTip.y,
  );
  const palmX = (wrist.x + indexMcp.x + middleMcp.x) / 3;
  const palmY = (wrist.y + indexMcp.y + middleMcp.y) / 3;
  const spreadDist =
    Math.hypot(indexTip.x - pinkyTip.x, indexTip.y - pinkyTip.y) +
    Math.hypot(thumbTip.x - pinkyTip.x, thumbTip.y - pinkyTip.y);

  // 1. Pinch
  if (pinchDist < 0.08) return { type: "pinch", palmX, palmY };

  // 2. Fist (all fingers curled)
  if (extCount === 0) return { type: "fist", palmX, palmY };

  // 3. Horns / Rock-on → index + pinky only
  if (idxE && !midE && !rngE && pnkE) return { type: "chaos", palmX, palmY };

  // 4. Explode (wide open hand)
  if (extCount >= 4 && spreadDist > 0.4)
    return { type: "explode", palmX, palmY };

  // 5. Peace / Twist → index + middle only
  if (idxE && midE && !rngE && !pnkE) return { type: "twist", palmX, palmY };

  // 6. Attract (3 fingers)
  if (extCount === 3) return { type: "attract", palmX, palmY };

  // 7. Push (index only)
  if (extCount === 1 && idxE) return { type: "push", palmX, palmY };

  // 8. Idle (hand visible, nothing special)
  return { type: "idle", palmX, palmY };
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function ParticleUniverse() {
  const mountRef = useRef(null);
  const videoRef = useRef(null);

  // --- Core refs for high-frequency physics (no React re-renders) ---
  const gestureRef = useRef({ type: "none" }); // raw from MediaPipe
  const historyRef = useRef([]); // last N detections
  const confirmedRef = useRef({
    // debounced + smoothed
    type: "none",
    palmX: 0.5,
    palmY: 0.5,
    progress: 0, // 0→1 transition ramp
  });
  const smoothedHandRef = useRef({ x: 0.5, y: 0.5 }); // lerped palm coords

  // --- React state (throttled, low-frequency) ---
  const [camReady, setCamReady] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [uiGesture, setUiGesture] = useState({
    type: "none",
    label: "NO HANDS",
    color: "#888888",
  });

  // UI throttling
  const lastUiUpdateRef = useRef(0);

  const gestureMeta = {
    none: { label: "NO HANDS", color: "#888888" },
    idle: { label: "• IDLE", color: "#aaffaa" },
    attract: { label: "✦ ATTRACT", color: "#00f5ff" },
    push: { label: "↑ PUSH", color: "#ff6b6b" },
    explode: { label: "✸ EXPLODE", color: "#ffd700" },
    pinch: { label: "⊙ VORTEX", color: "#bf5fff" },
    fist: { label: "◉ CALM", color: "#ff5555" },
    twist: { label: "↻ TWIST", color: "#00ffaa" },
    chaos: { label: "⚡ CHAOS", color: "#ff00aa" },
  };

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;

    // COPY THE REF HERE
    const mountNode = mountRef.current;
    if (!mountNode) return;

    /* ── Renderer ─────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    mountNode.appendChild(renderer.domElement); // use the copied variable

    /* ── Scene / Camera ───────────────────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 10;

    /* ── Particle Buffers ─────────────────────────────────── */
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const orig = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * FIELD_RADIUS;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pos[i * 3] = orig[i * 3] = x;
      pos[i * 3 + 1] = orig[i * 3 + 1] = y;
      pos[i * 3 + 2] = orig[i * 3 + 2] = z;
      const c = new THREE.Color().setHSL(i / PARTICLE_COUNT, 0.9, 0.65);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute vec3 aColor;
        varying   vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(180.0 / length(mv.xyz), 1.5, 10.0);
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float a = 1.0 - smoothstep(0.2, 0.5, d);
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Points(geo, mat);
    scene.add(mesh);

    // Debug sphere (shows smoothed hand position)
    const debugGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const debugMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    });
    const debugSphere = new THREE.Mesh(debugGeo, debugMat);
    scene.add(debugSphere);

    /* ── Animation Loop ───────────────────────────────────── */
    let frameId;
    const clock = new THREE.Clock();
    let orbitAngle = 0;
    const _color = new THREE.Color(); // reuse, avoid GC

    function loop() {
      frameId = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      mat.uniforms.uTime.value = t;

      // Slow camera orbit (keeps world-space stable for hand forces)
      orbitAngle += 0.003;
      camera.position.x = Math.sin(orbitAngle) * 10;
      camera.position.z = Math.cos(orbitAngle) * 10;
      camera.lookAt(0, 0, 0);

      /* ── Read & confirm gesture ─────────────────────────── */
      const raw = gestureRef.current;
      const hasRawHand = raw.type !== "none" && raw.palmX !== undefined;

      // Smooth hand position (always track, even if gesture is idle)
      if (hasRawHand) {
        smoothedHandRef.current.x +=
          (raw.palmX - smoothedHandRef.current.x) * 0.12;
        smoothedHandRef.current.y +=
          (raw.palmY - smoothedHandRef.current.y) * 0.12;
      }

      // Debounce gesture type via history buffer
      const hist = historyRef.current;
      if (raw.type !== "none") {
        hist.push(raw.type);
        if (hist.length > 10) hist.shift();
      } else {
        hist.length = 0;
      }

      const counts = {};
      hist.forEach((g) => (counts[g] = (counts[g] || 0) + 1));
      let best = raw.type;
      let bestCount = 0;
      for (const [k, v] of Object.entries(counts)) {
        if (v > bestCount) {
          bestCount = v;
          best = k;
        }
      }

      const confirmed = confirmedRef.current;
      const agreed = hist.length > 0 && bestCount / hist.length >= 0.7;

      if (agreed && confirmed.type !== best) {
        confirmed.type = best;
        confirmed.progress = 0; // start fade-in
      }

      // Ramp progress 0 → 1
      if (confirmed.progress < 1) {
        confirmed.progress = Math.min(1, confirmed.progress + 0.06);
      }

      // Fade out when hand lost
      if (!hasRawHand && confirmed.type !== "none") {
        confirmed.progress = Math.max(0, confirmed.progress - 0.08);
        if (confirmed.progress === 0) confirmed.type = "none";
      }

      const hasHand = confirmed.type !== "none" && confirmed.progress > 0;
      const intensity = confirmed.progress; // 0..1 blend factor

      // World-space hand target
      const handWorldX = hasHand ? (0.5 - smoothedHandRef.current.x) * 6 : 0;
      const handWorldY = hasHand ? (0.5 - smoothedHandRef.current.y) * 4 : 0;
      debugSphere.position.set(handWorldX, handWorldY, 0);
      debugSphere.material.opacity = 0.1 + intensity * 0.4;

      /* ── Particle Physics ───────────────────────────────── */
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3,
          iy = ix + 1,
          iz = ix + 2;
        let ax = 0,
          ay = 0,
          az = 0;

        // Organic drift (always on)
        ax += Math.sin(pos[ix] * 1.2 + t * 0.6) * 0.002;
        ay += Math.cos(pos[iy] * 1.2 + t * 0.5) * 0.002;
        az += Math.sin(pos[iz] * 1.2 + t * 0.8) * 0.002;

        // Spring to origin (modulated by gesture)
        let k = 0.0015; // base spring
        let damping = 0.96;

        if (!hasHand) {
          k = 0.004; // stronger return when no hand
          damping = 0.95;
        } else if (confirmed.type === "fist") {
          k = 0.02; // strong recall
          damping = 0.88;
        }

        ax += (orig[ix] - pos[ix]) * k;
        ay += (orig[iy] - pos[iy]) * k;
        az += (orig[iz] - pos[iz]) * k;

        // Gesture forces (scaled by transition intensity)
        if (hasHand && intensity > 0.01) {
          const dx = pos[ix] - handWorldX;
          const dy = pos[iy] - handWorldY;
          const dz = pos[iz]; // hand plane is z≈0
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
          const nx = dx / dist,
            ny = dy / dist,
            nz = dz / dist;

          const baseF = Math.min(6.0 / dist, 0.6) * intensity;

          switch (confirmed.type) {
            case "attract": {
              const f = Math.min(8.0 / (dist + 0.1), 0.8) * intensity;
              ax -= nx * f * 0.9;
              ay -= ny * f * 0.9;
              az -= nz * f * 0.35;
              break;
            }
            case "push": {
              if (dist < 4.5) {
                const f = Math.min(5.5 / dist, 0.55) * intensity;
                ax += nx * f;
                ay += ny * f;
                az += nz * f;
              }
              break;
            }
            case "explode": {
              const f = baseF;
              ax += nx * f;
              ay += ny * f;
              az += nz * f;
              break;
            }
            case "pinch": {
              const f = Math.min(5.0 / dist, 0.55) * intensity;
              ax -= nx * f;
              ay -= ny * f;
              az -= nz * f;
              // Tangential swirl
              ax += -ny * f * 0.5;
              ay += nx * f * 0.5;
              break;
            }
            case "twist": {
              // Planar swirl with vertical bob
              const f = Math.min(4.0 / (dist + 0.2), 0.4) * intensity;
              ax += -ny * f - nx * f * 0.15;
              ay += nx * f - ny * f * 0.15;
              az += Math.sin(t * 2.5 + dist * 1.5) * f * 0.6;
              break;
            }
            case "chaos": {
              // Perlin-ish noise turbulence
              const f = 0.25 * intensity;
              const s = 2.2;
              ax +=
                Math.sin(pos[iy] * s + t * 3.2) * Math.cos(pos[iz] * s - t) * f;
              ay +=
                Math.cos(pos[ix] * s - t * 2.8) *
                Math.sin(pos[iz] * s + t * 1.2) *
                f;
              az +=
                Math.sin(pos[ix] * s + t * 2.1) *
                Math.cos(pos[iy] * s - t * 1.5) *
                f;
              break;
            }
            case "fist": {
              // Extra inward pull (in addition to high spring)
              const f = Math.min(3.0 / (dist + 0.1), 0.3) * intensity;
              ax -= nx * f;
              ay -= ny * f;
              az -= nz * f;
              break;
            }
            case "idle": {
              if (dist < 6.0) {
                const f = Math.min(2.0 / dist, 0.12) * intensity;
                ax -= nx * f;
                ay -= ny * f;
              }
              break;
            }
            default:
              break;
          }
        }

        // Integrate
        vel[ix] = (vel[ix] + ax * 8.0) * damping;
        vel[iy] = (vel[iy] + ay * 8.0) * damping;
        vel[iz] = (vel[iz] + az * 8.0) * damping;

        pos[ix] += vel[ix];
        pos[iy] += vel[iy];
        pos[iz] += vel[iz];

        // Soft boundary: nudge back instead of hard reset
        const d2 = pos[ix] ** 2 + pos[iy] ** 2 + pos[iz] ** 2;
        const limit = FIELD_RADIUS * 3.5;
        if (d2 > limit ** 2) {
          const pullback = 0.02;
          vel[ix] += (orig[ix] - pos[ix]) * pullback;
          vel[iy] += (orig[iy] - pos[iy]) * pullback;
          vel[iz] += (orig[iz] - pos[iz]) * pullback;
          // Hard reset only if wildly out of bounds
          if (d2 > (limit * 1.4) ** 2) {
            pos[ix] = orig[ix];
            pos[iy] = orig[iy];
            pos[iz] = orig[iz];
            vel[ix] = vel[iy] = vel[iz] = 0;
          }
        }

        // Dynamic colour based on speed + time
        const spd = Math.sqrt(vel[ix] ** 2 + vel[iy] ** 2 + vel[iz] ** 2);
        const hue =
          (i / PARTICLE_COUNT +
            t * 0.05 +
            (confirmed.type === "chaos" ? spd * 0.3 : 0)) %
          1;
        const lit = Math.min(0.5 + spd * 5, 0.95);
        const sat = Math.min(0.75 + spd * 3.5, 1.0);
        _color.setHSL(hue, sat, lit);
        col[ix] = _color.r;
        col[iy] = _color.g;
        col[iz] = _color.b;
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.aColor.needsUpdate = true;
      renderer.render(scene, camera);
    }

    loop();

    /* ── MediaPipe Hands ──────────────────────────────────── */
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.55,
    });

    hands.onResults((results) => {
      const count = results.multiHandLandmarks?.length || 0;
      setHandCount(count);

      if (count === 0) {
        gestureRef.current = { type: "none" };
        historyRef.current = [];
        return;
      }

      const gs = getGestureState(results.multiHandLandmarks[0]);
      gestureRef.current = gs;

      // Throttle React UI updates to ~10 Hz (smoother than 30 Hz spam)
      const now = Date.now();
      if (now - lastUiUpdateRef.current > 100) {
        lastUiUpdateRef.current = now;
        const meta = gestureMeta[confirmedRef.current.type] || gestureMeta.none;
        setUiGesture({
          type: confirmedRef.current.type,
          label: meta.label,
          color: meta.color,
        });
      }
    });

    const cam = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    cam
      .start()
      .then(() => setCamReady(true))
      .catch((e) => console.error("Camera failed:", e));

    /* ── Resize ───────────────────────────────────────────── */
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ── Cleanup ──────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(frameId);
      cam.stop();
      window.removeEventListener("resize", onResize);

      // Use the captured variable, not mountRef.current
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      debugGeo.dispose();
      debugMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentColor = uiGesture.color;

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        fontFamily: "monospace",
      }}
    >
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      {/* Mirrored camera preview */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 180,
          height: 135,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          opacity: 0.85,
          transform: "scaleX(-1)",
          objectFit: "cover",
          zIndex: 2,
        }}
        autoPlay
        playsInline
        muted
      />

      {/* Top Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.35em",
              color: "rgba(255,255,255,0.25)",
              marginBottom: 5,
            }}
          >
            PARTICLE UNIVERSE
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#fff",
              letterSpacing: "0.04em",
            }}
          >
            {PARTICLE_COUNT.toLocaleString()} particles
          </div>
        </div>

        <div style={{ textAlign: "right", marginRight: 205 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              border: `1px solid ${uiGesture.type !== "none" ? currentColor + "55" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 100,
              background:
                uiGesture.type !== "none" ? currentColor + "14" : "transparent",
              transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  uiGesture.type !== "none"
                    ? currentColor
                    : "rgba(255,255,255,0.15)",
                boxShadow:
                  uiGesture.type !== "none"
                    ? `0 0 10px ${currentColor}aa`
                    : "none",
                transition: "all 0.35s ease",
              }}
            />
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.2em",
                color:
                  uiGesture.type !== "none"
                    ? currentColor
                    : "rgba(255,255,255,0.25)",
                transition: "color 0.35s ease",
                minWidth: 100,
                textAlign: "center",
              }}
            >
              {uiGesture.label}
            </span>
          </div>

          {handCount > 0 && (
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.18)",
                marginTop: 6,
                letterSpacing: "0.2em",
              }}
            >
              {handCount} HAND{handCount > 1 ? "S" : ""} DETECTED
            </div>
          )}
        </div>
      </div>

      {/* Gesture Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 10,
          pointerEvents: "none",
          zIndex: 3,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "90vw",
        }}
      >
        {[
          { icon: "🤙", sub: "3 fingers", label: "ATTRACT", color: "#00f5ff" },
          { icon: "☝️", sub: "1 finger", label: "PUSH", color: "#ff6b6b" },
          { icon: "✋", sub: "open hand", label: "EXPLODE", color: "#ffd700" },
          { icon: "🤌", sub: "pinch", label: "VORTEX", color: "#bf5fff" },
          { icon: "✌️", sub: "peace", label: "TWIST", color: "#00ffaa" },
          { icon: "🤘", sub: "horns", label: "CHAOS", color: "#ff00aa" },
          { icon: "✊", sub: "fist", label: "CALM", color: "#ff5555" },
        ].map(({ icon, sub, label, color }) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              padding: "7px 12px",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              opacity: uiGesture.label.includes(label) ? 1 : 0.45,
              transform: uiGesture.label.includes(label)
                ? "scale(1.05)"
                : "scale(1)",
              transition: "all 0.3s ease",
            }}
          >
            <div style={{ fontSize: 15, marginBottom: 2 }}>{icon}</div>
            <div
              style={{
                fontSize: 8,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 2,
              }}
            >
              {sub}
            </div>
            <div
              style={{
                fontSize: 9,
                color: uiGesture.label.includes(label)
                  ? color
                  : "rgba(255,255,255,0.5)",
                letterSpacing: "0.12em",
                transition: "color 0.3s ease",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Loading overlay */}
      {!camReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            background: "#000",
          }}
        >
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div
            style={{
              width: 36,
              height: 36,
              border: "2px solid rgba(255,255,255,0.08)",
              borderTopColor: "#00f5ff",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.3em",
            }}
          >
            INITIALIZING
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.15)",
              letterSpacing: "0.2em",
            }}
          >
            ALLOW CAMERA ACCESS WHEN PROMPTED
          </div>
        </div>
      )}
    </div>
  );
}
