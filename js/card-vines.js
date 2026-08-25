// Project card hover — smooth messy corner vines overlapping the card edge.
(function () {
  const cards = document.querySelectorAll(".projects .card");
  if (!cards.length) return;

  const LEAF_GREENS = ["#4c5a3f", "#5a6b48", "#6f7f5c", "#68854e", "#77965a"];
  const STEM_GREENS = ["#3f4a34", "#4c5a3f", "#52663f"];
  const OUTSET = 28;
  const CARD_RADIUS = 18;

  const instances = [];

  const pickSeeded = (arr, seed, salt) =>
    arr[Math.floor(((Math.sin(seed * salt) * 43758.5453) % 1 + 1) % 1 * arr.length)];

  const easeOut = (p) => 1 - Math.pow(1 - p, 2.6);
  const easeIn = (p) => Math.pow(Math.max(0, p), 2.1);
  const smoothstep = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  function perimeterLength(w, h, r) {
    const sw = Math.max(w - 2 * r, 0);
    const sh = Math.max(h - 2 * r, 0);
    const arc = (Math.PI / 2) * r;
    return 2 * sw + 2 * sh + 4 * arc;
  }

  function shadeColor(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (n & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  // Same plump oval leaves as the hero hanging pots
  function drawPotLeaf(ctx, rx, ry, color, opts = {}) {
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

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(20, 26, 14, 0.13)";
    if (fold > 0) ctx.fillRect(-rx, 0, rx * 2, ry);
    else ctx.fillRect(-rx, -ry, rx * 2, ry);
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.18, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadeColor(color, 18);
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * 0.32;
    ctx.fill();
    ctx.globalAlpha = prevAlpha;

    ctx.beginPath();
    ctx.moveTo(-rx * 0.82, 0);
    ctx.lineTo(rx * 0.82, 0);
    ctx.strokeStyle = "rgba(20, 26, 14, 0.3)";
    ctx.lineWidth = Math.max(0.35, rx * 0.07);
    ctx.lineCap = "round";
    ctx.stroke();

    if (highlight) {
      ctx.beginPath();
      ctx.ellipse(-rx * 0.3, -ry * 0.28, rx * 0.32, ry * 0.22, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(231, 224, 204, 0.14)";
      ctx.fill();
    }
  }

  function drawStem(ctx, x0, y0, x1, y1, width, color, alpha) {
    const mx = (x0 + x1) / 2 + (x1 - x0) * 0.06;
    const my = (y0 + y1) / 2 - 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = alpha;
    ctx.stroke();
  }

  function drawTendril(ctx, x, y, angle, stemColor, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = 0.85;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(1, 0, 3.8, 0, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
  }

  function borderSample(t, w, h, r) {
    t = ((t % 1) + 1) % 1;
    const sw = Math.max(w - 2 * r, 0);
    const sh = Math.max(h - 2 * r, 0);
    const arc = (Math.PI / 2) * r;
    const per = 2 * sw + 2 * sh + 4 * arc;
    let d = t * per;

    if (d <= sw) return { x: r + d, y: 0, nx: 0, ny: -1, tx: 1, ty: 0 };
    d -= sw;
    if (d <= arc) {
      const a = -Math.PI / 2 + (d / arc) * (Math.PI / 2);
      const cx = w - r;
      const cy = r;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a) };
    }
    d -= arc;
    if (d <= sh) return { x: w, y: r + d, nx: 1, ny: 0, tx: 0, ty: 1 };
    d -= sh;
    if (d <= arc) {
      const a = (d / arc) * (Math.PI / 2);
      const cx = w - r;
      const cy = h - r;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a) };
    }
    d -= arc;
    if (d <= sw) return { x: w - r - d, y: h, nx: 0, ny: 1, tx: -1, ty: 0 };
    d -= sw;
    if (d <= arc) {
      const a = Math.PI / 2 + (d / arc) * (Math.PI / 2);
      const cx = r;
      const cy = h - r;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a) };
    }
    d -= arc;
    if (d <= sh) return { x: 0, y: h - r - d, nx: -1, ny: 0, tx: 0, ty: -1 };
    d -= sh;
    const a = Math.PI + (d / arc) * (Math.PI / 2);
    const cx = r;
    const cy = r;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a) };
  }

  function buildVineLayout(seed) {
    const vines = [];
    const corners = [0.24, 0.76];
    for (const t0 of corners) {
      for (let lane = 0; lane < 4; lane++) {
        for (const dir of [1, -1]) {
          const laneOff = Math.sin(seed * 0.11 + lane * 2.3 + dir) * 4;
          const wobbleA = Math.sin(seed + lane * 1.4 + dir) * 2.2;
          const wobbleB = Math.cos(seed * 0.7 + lane + dir * 2) * 1.4;
          const span = 0.16 + lane * 0.014;
          const stemColor = pickSeeded(STEM_GREENS, seed + lane * 17 + dir * 9, 0.019);
          const leaves = [];
          const leafCount = 11 + lane * 2;
          for (let l = 0; l < leafCount; l++) {
            const frac = (l + 0.5) / leafCount;
            const base = 7.5 + Math.sin(seed + l * 1.4 + lane) * 1.5 + (l % 3) * 0.8;
            leaves.push({
              frac,
              side: l % 2 === 0 ? 1 : -1,
              rx: base,
              ry: base * (0.58 + (Math.sin(seed + l) + 1) * 0.06),
              angleOff: (l % 2 === 0 ? 1 : -1) * (0.4 + Math.sin(seed + l * 2.1) * 0.35) + Math.sin(seed + l * 0.7) * 0.5,
              fold: l % 2 === 0 ? 1 : -1,
              highlight: l % 3 !== 1,
              color: pickSeeded(LEAF_GREENS, seed + l * 13 + lane * 7, 0.017),
              inward: l % 2 === 0,
            });
          }
          vines.push({ t0: t0 + laneOff * 0.002, span, dir, laneOff, wobbleA, wobbleB, stemW: 1.15 + lane * 0.2, stemColor, leaves });
        }
      }
    }

    const tangles = [];
    for (const t0 of corners) {
      for (let i = 0; i < 14; i++) {
        const base = 6.5 + (i % 4) * 1.4;
        tangles.push({
          cornerT: t0,
          ang: (i / 14) * Math.PI * 1.35 - 0.45 + Math.sin(seed + i * 2.1) * 0.35,
          dist: 1 + (i % 3) * 2.2,
          rx: base,
          ry: base * 0.62,
          fold: i % 2 === 0 ? 1 : -1,
          color: pickSeeded(LEAF_GREENS, seed + i * 19, 0.017),
          angleOff: Math.sin(seed + i * 1.7) * 0.8,
        });
      }
    }
    return { vines, tangles };
  }

  class CardVines {
    constructor(card) {
      this.card = card;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "card-vine-canvas";
      this.canvas.setAttribute("aria-hidden", "true");
      card.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.growth = 0;
      this.display = 0;
      this.fade = 1;
      this.shrinking = false;
      this.target = 0;
      this.seed = Math.random() * 1000;
      this.iw = 1;
      this.ih = 1;
      this.layout = buildVineLayout(this.seed);

      const onEnter = () => {
        this.target = 1;
        card.classList.add("thumb-hovered");
      };
      const onLeave = () => {
        this.target = 0;
        card.classList.remove("thumb-hovered");
      };

      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mouseleave", onLeave);
      card.addEventListener("focusin", onEnter);
      card.addEventListener("focusout", onLeave);

      this.resize();
      let resizeTimer;
      new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this.resize(), 60);
      }).observe(card);

      instances.push(this);
    }

    resize() {
      const w = this.card.offsetWidth;
      const h = this.card.offsetHeight;
      if (w < 2 || h < 2) return;
      this.iw = w;
      this.ih = h;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = w + OUTSET * 2;
      const ch = h + OUTSET * 2;
      this.canvas.width = Math.floor(cw * dpr);
      this.canvas.height = Math.floor(ch * dpr);
      this.canvas.style.width = `${cw}px`;
      this.canvas.style.height = `${ch}px`;
      this.canvas.style.left = `${-OUTSET}px`;
      this.canvas.style.top = `${-OUTSET}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ox = OUTSET;
      this.oy = OUTSET;
    }

    tick() {
      this.shrinking = this.target < this.growth - 0.001;
      const growRate = this.shrinking ? 0.11 : 0.07;
      this.growth += (this.target - this.growth) * growRate;

      const targetDisplay = this.shrinking ? easeIn(this.growth) : easeOut(this.growth);
      const displayRate = this.shrinking ? 0.18 : 0.12;
      this.display += (targetDisplay - this.display) * displayRate;

      this.fade = this.shrinking ? smoothstep(0, 0.22, this.display) : 1;

      if (this.growth < 0.002 && this.target === 0 && this.display < 0.002 && this.fade < 0.02) {
        this.growth = 0;
        this.display = 0;
        this.fade = 1;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        return;
      }
      this.draw();
    }

    pointAt(vine, frac, g) {
      const { iw, ih, ox, oy } = this;
      const r = Math.min(CARD_RADIUS, iw / 2, ih / 2);
      const activeSpan = vine.span * g;
      const t = vine.dir === 1 ? vine.t0 + activeSpan * frac : vine.t0 - activeSpan * frac;
      const p = borderSample(t, iw, ih, r);
      const wobble =
        Math.sin(frac * 7.5 + vine.wobbleA) * vine.wobbleB +
        Math.sin(frac * 3.2 + vine.wobbleB) * vine.wobbleA * 0.45;
      const onEdge = vine.laneOff + wobble;
      return {
        x: ox + p.x + p.nx * onEdge,
        y: oy + p.y + p.ny * onEdge,
        nx: p.nx,
        ny: p.ny,
        tx: p.tx,
        ty: p.ty,
      };
    }

    drawLeafAt(ctx, x, y, rx, ry, color, angle, alpha, opts = {}) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      drawPotLeaf(ctx, rx, ry, color, { ...opts, alpha });
      ctx.restore();
    }

    drawVine(ctx, vine, g) {
      const { iw, ih, fade } = this;
      const r = Math.min(CARD_RADIUS, iw / 2, ih / 2);
      const activeSpan = vine.span * g;
      if (activeSpan < 0.003) return;

      const perLen = perimeterLength(iw, ih, r);
      const steps = 24;
      const points = [];
      for (let i = 0; i <= steps; i++) {
        points.push(this.pointAt(vine, i / steps, g));
      }

      for (let i = 1; i < points.length; i++) {
        const segG = smoothstep((i - 2) / steps, i / steps, 1);
        const stemAlpha = this.shrinking ? (0.82 + segG * 0.16) * fade : 0.82 + segG * 0.16;
        drawStem(ctx, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, vine.stemW, vine.stemColor, stemAlpha);
      }

      for (const leaf of vine.leaves) {
        let leafReveal = 1;
        if (this.shrinking) {
          leafReveal = smoothstep(leaf.frac - 0.02, leaf.frac + 0.08, g);
          if (leafReveal < 0.015) continue;
        } else if (leaf.frac > g + 0.02) {
          continue;
        }

        const pt = this.pointAt(vine, leaf.frac, g);
        const tipFade = smoothstep(g - 0.1, g, leaf.frac);
        const alongTaper = 0.48 + (1 - leaf.frac) * 0.52;
        const alpha = (0.88 + tipFade * 0.12) * (this.shrinking ? leafReveal * this.fade : 1);
        const sizeBoost = this.shrinking ? 0.75 + leafReveal * 0.25 : 1;
        const rx = leaf.rx * alongTaper * (0.82 + tipFade * 0.18) * sizeBoost;
        const ry = leaf.ry * alongTaper * (0.82 + tipFade * 0.18) * sizeBoost;
        const stemAng = Math.atan2(pt.ty, pt.tx);
        const outAng = stemAng + leaf.angleOff;
        const nx = pt.nx;
        const ny = pt.ny;
        this.drawLeafAt(
          ctx,
          pt.x + nx * leaf.side * 3,
          pt.y + ny * leaf.side * 3,
          rx,
          ry,
          leaf.color,
          outAng,
          alpha,
          { fold: leaf.fold, highlight: leaf.highlight }
        );
        if (leaf.inward) {
          this.drawLeafAt(
            ctx,
            pt.x - nx * 5,
            pt.y - ny * 5,
            rx * 0.9,
            ry * 0.9,
            pickSeeded(LEAF_GREENS, this.seed + leaf.frac * 100 + vine.t0 * 50, 0.021),
            outAng + Math.PI * 0.85,
            alpha * 0.92,
            { fold: -leaf.fold, highlight: false }
          );
        }
      }
    }

    drawTangles(ctx, g) {
      const { iw, ih, ox, oy, fade } = this;
      const r = Math.min(CARD_RADIUS, iw / 2, ih / 2);
      for (const tangle of this.layout.tangles) {
        const cornerFade = this.shrinking
          ? smoothstep(0.1, 0.42, g) * fade
          : smoothstep(0.18, 0.55, g);
        if (cornerFade < 0.015) continue;
        const p = borderSample(tangle.cornerT, iw, ih, r);
        const lx = ox + p.x + p.nx * tangle.dist + Math.cos(tangle.ang) * 5;
        const ly = oy + p.y + p.ny * tangle.dist + Math.sin(tangle.ang) * 5;
        const leafAng = Math.atan2(p.ty, p.tx) + tangle.angleOff;
        const tangleScale = this.shrinking ? 0.75 + cornerFade * 0.25 : 1;
        this.drawLeafAt(
          ctx,
          lx,
          ly,
          tangle.rx * tangleScale,
          tangle.ry * tangleScale,
          tangle.color,
          leafAng,
          this.shrinking ? (0.85 + cornerFade * 0.15) * fade : 0.85 + cornerFade * 0.15,
          { fold: tangle.fold, highlight: cornerFade > 0.4 }
        );
      }
    }

    draw() {
      const { ctx, display, iw, ih } = this;
      ctx.clearRect(0, 0, iw + OUTSET * 2, ih + OUTSET * 2);
      if (display < 0.004 || iw < 2) return;

      for (const vine of this.layout.vines) {
        this.drawVine(ctx, vine, display);
      }
      this.drawTangles(ctx, display);
      ctx.globalAlpha = 1;
    }
  }

  cards.forEach((card) => new CardVines(card));

  function frame() {
    for (const inst of instances) inst.tick();
    requestAnimationFrame(frame);
  }
  frame();
})();
