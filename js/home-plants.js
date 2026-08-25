// Hanging-plant simulation for the home hero.
(function () {
  const canvas = document.getElementById("plantCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const stage = canvas.parentElement;

  const GRAVITY = 0.42;
  const DAMPING = 0.965;
  const SEG_LEN = 13;
  const ITERATIONS = 5;
  const WIND_RADIUS = 155;

  const LEAF_GREENS = ["#4c5a3f", "#5a6b48", "#6f7f5c", "#68854e", "#77965a"];
  const STEM_GREENS = ["#3f4a34", "#4c5a3f", "#52663f"];

  let W = 0, H = 0, dpr = 1;
  let pots = [];
  let mouse = { x: -9999, y: -9999, vx: 0, vy: 0, lastX: -9999, lastY: -9999 };
  let scroll = { y: 0, vy: 0, vx: 0 };
  let dragPot = null, dragOff = { x: 0, y: 0 };
  let t = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function shadeColor(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (n & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  // Plump rounded oval with midrib + soft shading (matches reference screenshot)
  function drawLeaf(rx, ry, color, opts = {}) {
    const fold = opts.fold != null ? opts.fold : 1;
    const highlight = opts.highlight !== false;

    const g = ctx.createLinearGradient(-rx, 0, rx, 0);
    g.addColorStop(0, shadeColor(color, fold > 0 ? -10 : 12));
    g.addColorStop(0.48, color);
    g.addColorStop(1, shadeColor(color, fold > 0 ? 14 : -10));

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Soft shadow on lower half for convex depth
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(20, 26, 14, 0.13)";
    if (fold > 0) ctx.fillRect(-rx, 0, rx * 2, ry);
    else ctx.fillRect(-rx, -ry, rx * 2, ry);
    ctx.restore();

    // Lighter center vein stripe
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.18, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadeColor(color, 18);
    ctx.globalAlpha = 0.32;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Midrib
    ctx.beginPath();
    ctx.moveTo(-rx * 0.82, 0);
    ctx.lineTo(rx * 0.82, 0);
    ctx.strokeStyle = "rgba(20, 26, 14, 0.3)";
    ctx.lineWidth = Math.max(0.4, rx * 0.07);
    ctx.lineCap = "round";
    ctx.stroke();

    if (highlight) {
      ctx.beginPath();
      ctx.ellipse(-rx * 0.3, -ry * 0.28, rx * 0.32, ry * 0.22, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(231, 224, 204, 0.14)";
      ctx.fill();
    }
  }

  function makeVine(pot, offsetX, length) {
    const n = Math.max(5, Math.round(length / SEG_LEN));
    const rimY = pot.y + 3;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = pot.x + offsetX + Math.sin(i * 0.35) * 2;
      const y = rimY + i * SEG_LEN * 0.92;
      pts.push({ x, y, px: x, py: y });
    }
    const leaves = [];
    // Densest near the pot, sparser toward the tip — like the reference
    let i = 2;
    while (i < n - 1) {
      const seg = Math.min(Math.floor(i), n - 2);
      const alongFrac = seg / n;
      // Skip more often near the tip so vines thin out
      if (alongFrac > 0.55 && Math.random() < alongFrac * 0.45) {
        i += rand(1.6, 2.8);
        continue;
      }
      const tip = alongFrac;
      // Reference SVG leaves are ~rx 8–10, ry 5–6 — keep canvas leaves in that range
      const base = tip < 0.35 ? rand(7.5, 9.5) : tip < 0.7 ? rand(5.5, 8) : rand(4, 6.5);
      const rx = base * pot.scale;
      const ry = rx * rand(0.58, 0.72);
      leaves.push({
        seg,
        side: Math.random() < 0.5 ? 1 : -1,
        rx,
        ry,
        // Each leaf gets its own angle — sideways from stem plus random wobble
        angleOff: rand(-0.7, 0.7) + (Math.random() < 0.5 ? 1 : -1) * rand(0.3, 1.05),
        outset: rand(1.8, 3.8),
        along: rand(-1, 3),
        color: pick(LEAF_GREENS),
        fold: Math.random() < 0.5 ? 1 : -1,
        highlight: Math.random() < 0.55,
      });
      // Step farther apart lower down
      i += tip < 0.4 ? rand(1.15, 1.7) : tip < 0.7 ? rand(1.5, 2.3) : rand(2.0, 3.2);
    }
    return {
      pts,
      leaves,
      offsetX,
      stemColor: pick(STEM_GREENS),
      stemW: rand(0.85, 1.25) * pot.scale,
      stemAlpha: rand(0.78, 0.9),
    };
  }

  function vineOffset(pot, index) {
    const spreads = [-0.42, -0.22, -0.04, 0.14, 0.28];
    return pot.w * (spreads[index] ?? rand(-0.3, 0.2)) + rand(-6, 6);
  }

  function makePot(xFrac, ropeLen, scale, hue) {
    const pot = {
      baseX: 0,
      xFrac,
      x: 0,
      y: 0,
      ropeLen,
      scale,
      w: 74 * scale,
      h: 40 * scale,
      swayPhase: rand(0, Math.PI * 2),
      colors: hue,
      vines: [],
      crown: [],
    };
    for (let i = 0; i < 3 + Math.floor(rand(0, 2)); i++) {
      pot.crown.push({
        ang: rand(-2.6, -0.5),
        rx: rand(6, 8.5) * scale,
        ry: rand(3.5, 5) * scale,
        color: pick(LEAF_GREENS),
        spread: rand(-0.4, 0.4),
        fold: Math.random() < 0.5 ? 1 : -1,
        highlight: true,
      });
    }
    return pot;
  }

  function buildScene() {
    const rect = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.offsetWidth || rect.width || canvas.clientWidth;
    H = stage.offsetHeight || rect.height || canvas.clientHeight;
    if (W < 10 || H < 10) return false;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    pots = [
      makePot(0.44, 22, 0.94, ["#cdbfa0", "#a8946f"]),
      makePot(0.58, 42, 1.0, ["#8a8f7c", "#4c5a3f"]),
      makePot(0.70, 158, 1.05, ["#b5714c", "#7c4a30"]),
      makePot(0.81, 52, 0.96, ["#9fb6ae", "#5c7a72"]),
      makePot(0.90, 205, 1.02, ["#cdbfa0", "#8f7d62"]),
    ];

    const POT_VINE_LENGTHS = [
      [0.38, 0.52, 0.68, 0.45, 0.82],
      [0.55, 0.72, 0.90, 0.62, 0.78],
      [0.32, 0.48, 0.65, 0.82, 0.58],
      [0.50, 0.66, 0.84, 0.58, 0.92],
      [0.40, 0.56, 0.70, 0.88, 0.48],
    ];

    for (let p = 0; p < pots.length; p++) {
      const pot = pots[p];
      pot.vines = [];
      pot.baseX = pot.xFrac * W;
      pot.x = pot.baseX;
      pot.y = pot.ropeLen;
      const room = H - pot.y - 16;
      const lengthFracs = POT_VINE_LENGTHS[p] || POT_VINE_LENGTHS[0];
      for (let i = 0; i < 5; i++) {
        const frac = lengthFracs[i] * rand(0.95, 1.04);
        const off = vineOffset(pot, i);
        pot.vines.push(makeVine(pot, off, Math.max(60, room * frac)));
      }
      pot.vines.sort((a, b) => a.stemW - b.stemW);
    }
    return true;
  }

  function potX(pot) {
    return pot.x + Math.sin(t * 0.45 + pot.swayPhase) * 1.3;
  }

  function heroScrollInfluence() {
    const rect = stage.getBoundingClientRect();
    const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    if (visible <= 0) return 0;
    return Math.min(1, visible / Math.min(rect.height, window.innerHeight * 0.9));
  }

  function trackScroll() {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const dy = y - scroll.y;
    scroll.y = y;
    scroll.vy = scroll.vy * 0.68 + dy * 0.32;
  }

  function simulate() {
    t += 0.016;
    trackScroll();
    const gustX = mouse.vx;
    const gustY = mouse.vy;
    const scrollGustX = scroll.vx;
    const scrollGustY = scroll.vy;
    const scrollMix = heroScrollInfluence();

    for (const pot of pots) {
      const px = potX(pot);

      for (const vine of pot.vines) {
        const pts = vine.pts;
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i];
          let vx = (p.x - p.px) * DAMPING;
          let vy = (p.y - p.py) * DAMPING;
          p.px = p.x;
          p.py = p.y;

          const breeze =
            Math.sin(t * 0.44 + p.y * 0.01 + pot.swayPhase) * 0.015 +
            Math.sin(t * 0.18 + p.x * 0.007) * 0.01;
          vx += breeze;
          vy += GRAVITY * 0.11;

          if (scrollMix > 0) {
            const prog = i / pts.length;
            const weight = prog * prog;
            const harsh = Math.min(1, Math.abs(scrollGustY) / 28);
            const forceY = -scrollGustY * weight * (0.028 + harsh * 0.04) * scrollMix;
            const forceX = scrollGustX * weight * (0.018 + harsh * 0.028) * scrollMix;
            vx += forceX;
            vy += forceY;
            if (Math.abs(scrollGustY) > 1.5 || Math.abs(scrollGustX) > 1.5) {
              p.px -= forceX * (2.4 + harsh * 2.2);
              p.py -= forceY * (2.4 + harsh * 2.2);
            }
          }

          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < WIND_RADIUS * WIND_RADIUS) {
            const d = Math.sqrt(d2) || 1;
            const fall = (1 - d / WIND_RADIUS) ** 1.6;
            vx += gustX * fall * 0.22;
            vy += gustY * fall * 0.13;
            vx += (dx / d) * fall * 0.24;
            vy += (dy / d) * fall * 0.07;
          }

          p.x += vx;
          p.y += vy + GRAVITY;
        }

        for (let k = 0; k < ITERATIONS; k++) {
          pts[0].x = px + vine.offsetX;
          pts[0].y = pot.y + 3;
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const diff = ((dist - SEG_LEN) / dist) * 0.5;
            const ox = dx * diff;
            const oy = dy * diff;
            if (i === 0) {
              b.x -= ox * 2;
              b.y -= oy * 2;
            } else {
              a.x += ox;
              a.y += oy;
              b.x -= ox;
              b.y -= oy;
            }
          }
        }
      }
    }

    mouse.vx *= 0.86;
    mouse.vy *= 0.86;
    scroll.vx *= 0.84;
    scroll.vy *= 0.84;
  }

  function drawRopes(pot) {
    const x = potX(pot);
    const y = pot.y;
    const h = pot.h;
    ctx.strokeStyle = "rgba(205, 191, 160, 0.82)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y - h * 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - h * 0.08, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#cdbfa0";
    ctx.fill();
  }

  function drawPotBody(pot) {
    const x = potX(pot);
    const y = pot.y;
    const w = pot.w;
    const h = pot.h;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, pot.colors[0]);
    g.addColorStop(1, pot.colors[1]);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y - h * 0.14, x + w / 2, y);
    ctx.lineTo(x + w * 0.36, y + h);
    ctx.quadraticCurveTo(x, y + h * 1.16, x - w * 0.36, y + h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fill();
  }

  function drawPotRim(pot) {
    const x = potX(pot);
    const y = pot.y;
    const w = pot.w;
    const h = pot.h;
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.02, w * 0.4, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#2a2016";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.06, w * 0.34, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3a2e1e";
    ctx.fill();
  }

  function drawCrown(pot) {
    const x = potX(pot);
    const y = pot.y;
    const w = pot.w;
    const h = pot.h;
    for (const c of pot.crown) {
      const lx = x + c.spread * w * 0.5 + Math.cos(c.ang) * w * 0.25;
      const ly = y - h * 0.04 + Math.sin(c.ang) * h * 0.16;
      const wob = Math.sin(t * 0.9 + c.ang * 3) * 0.04;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(c.ang * 0.35 + wob);
      drawLeaf(c.rx, c.ry, c.color, { fold: c.fold, highlight: c.highlight });
      ctx.restore();
    }
  }

  function drawVines(pot) {
    for (const vine of pot.vines) {
      const pts = vine.pts;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.strokeStyle = vine.stemColor;
      ctx.lineWidth = vine.stemW;
      ctx.lineCap = "round";
      ctx.globalAlpha = vine.stemAlpha;
      ctx.stroke();
      ctx.globalAlpha = 1;

      for (const leaf of vine.leaves) {
        const seg = Math.min(Math.max(1, Math.floor(leaf.seg)), pts.length - 1);
        const a = pts[seg - 1];
        const b = pts[seg];
        if (!a || !b) continue;
        const segAng = Math.atan2(b.y - a.y, b.x - a.x);
        const nx = Math.cos(segAng + Math.PI / 2);
        const ny = Math.sin(segAng + Math.PI / 2);
        const tx = b.x + Math.cos(segAng) * leaf.along + nx * leaf.side * leaf.outset;
        const ty = b.y + Math.sin(segAng) * leaf.along + ny * leaf.side * leaf.outset;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(segAng + leaf.angleOff);
        drawLeaf(leaf.rx, leaf.ry, leaf.color, { fold: leaf.fold, highlight: leaf.highlight });
        ctx.restore();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const pot of pots) drawRopes(pot);
    for (const pot of pots) drawPotBody(pot);
    for (const pot of pots) {
      drawVines(pot);
      drawPotRim(pot);
      drawCrown(pot);
    }
  }

  function frame() {
    simulate();
    draw();
    requestAnimationFrame(frame);
  }

  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function updatePointer(e) {
    const r = stage.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    const p = toLocal(e);
    if (mouse.lastX > -9000) {
      mouse.vx = mouse.vx * 0.84 + (p.x - mouse.lastX) * 0.14;
      mouse.vy = mouse.vy * 0.84 + (p.y - mouse.lastY) * 0.14;
    }
    mouse.lastX = p.x;
    mouse.lastY = p.y;
    mouse.x = p.x;
    mouse.y = p.y;
    if (dragPot) {
      dragPot.x = Math.min(W - 30, Math.max(30, p.x - dragOff.x));
      dragPot.y = Math.min(H * 0.5, Math.max(16, p.y - dragOff.y));
    }
  }

  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
    mouse.lastX = -9999;
  });

  window.addEventListener(
    "wheel",
    (e) => {
      scroll.vy += e.deltaY * 0.07;
      scroll.vx += e.deltaX * 0.045;
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      trackScroll();
    },
    { passive: true }
  );

  scroll.y = window.scrollY || document.documentElement.scrollTop || 0;

  let touchLastY = null;
  let touchLastX = null;
  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const x = e.touches[0].clientX;
      if (touchLastY != null) {
        scroll.vy += (touchLastY - y) * 0.42;
        scroll.vx += (touchLastX - x) * 0.28;
      }
      touchLastY = y;
      touchLastX = x;
    },
    { passive: true }
  );
  window.addEventListener("touchend", () => {
    touchLastY = null;
    touchLastX = null;
  });

  canvas.addEventListener("pointerdown", (e) => {
    const p = toLocal(e);
    for (let i = pots.length - 1; i >= 0; i--) {
      const pot = pots[i];
      const px = potX(pot);
      if (Math.abs(p.x - px) < pot.w * 0.7 && p.y > pot.y - 30 && p.y < pot.y + pot.h + 16) {
        dragPot = pot;
        dragOff.x = p.x - pot.x;
        dragOff.y = p.y - pot.y;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
        break;
      }
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    dragPot = null;
    canvas.style.cursor = "grab";
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  });

  function init() {
    if (!buildScene()) {
      requestAnimationFrame(() => {
        buildScene();
        requestAnimationFrame(buildScene);
      });
    }
    frame();
  }

  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildScene, 80);
  }).observe(stage);
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildScene, 160);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
