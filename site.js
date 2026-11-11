/* Wormwell website behaviour. No dependencies, no cookies, no network requests. */
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.remove("no-js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* Small deterministic random, so the page draws the same tunnel on every visit. */
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Navigation background ---------- */
  const nav = document.querySelector("[data-nav]");
  if (nav) {
    const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Shared painting: the worm and Amber ---------- */
  const WORM = { contour: "#a34e5b", body: "#e3909a", band: "#d27e8a", shine: "rgba(255, 228, 232, .55)" };

  /* Draws a worm along `pts` (head first) as one smooth tapered body: contour, flesh, shine and soft segment rings.
     `r` is the head radius. */
  function drawWorm(ctx, pts, r, opts = {}) {
    if (pts.length < 2) return;
    const n = pts.length;
    const radius = (i) => r * (0.82 - 0.42 * Math.pow(i / (n - 1), 1.6));
    const outline = Math.max(1.5, r * 0.13);
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const pass = (style, widthOf, ox = 0, oy = 0) => {
      ctx.strokeStyle = style;
      for (let i = n - 1; i > 0; i--) {
        ctx.lineWidth = widthOf(i);
        ctx.beginPath(); ctx.moveTo(pts[i].x + ox, pts[i].y + oy); ctx.lineTo(pts[i - 1].x + ox, pts[i - 1].y + oy); ctx.stroke();
      }
    };
    pass(WORM.contour, (i) => radius(i) * 2 + outline * 2);
    pass(WORM.body, (i) => radius(i) * 2);
    // Segment rings across the body.
    ctx.strokeStyle = "rgba(168, 76, 92, .32)";
    ctx.lineWidth = Math.max(1, r * 0.09);
    for (let i = 3; i < n - 1; i += 2) {
      const dx = pts[i - 1].x - pts[i + 1].x, dy = pts[i - 1].y - pts[i + 1].y, l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l, rr = radius(i) * 0.86;
      ctx.beginPath(); ctx.moveTo(pts[i].x + nx * rr, pts[i].y + ny * rr); ctx.lineTo(pts[i].x - nx * rr, pts[i].y - ny * rr); ctx.stroke();
    }
    // A glossy highlight along the upper-left side, where the light comes from.
    pass(WORM.shine, (i) => radius(i) * 0.55, -r * 0.22, -r * 0.26);
    ctx.restore();
    drawHead(ctx, pts[0], pts[1], r, opts);
  }

  function drawHead(ctx, head, neck, r, { blink = 0, look = null } = {}) {
    let dx = head.x - neck.x, dy = head.y - neck.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const px = -dy, py = dx;
    const g = ctx.createRadialGradient(head.x - r * 0.35, head.y - r * 0.4, r * 0.1, head.x, head.y, r * 1.05);
    g.addColorStop(0, "#f7b8bf");
    g.addColorStop(0.6, WORM.body);
    g.addColorStop(1, "#cc7381");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(head.x, head.y, r, 0, TAU); ctx.fill();
    // Blush.
    ctx.fillStyle = "rgba(236, 104, 120, .35)";
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(head.x + px * s * r * 0.62 + dx * r * 0.05, head.y + py * s * r * 0.62 + dy * r * 0.05, r * 0.2, 0, TAU); ctx.fill();
    }
    // Large ivory eyes facing the way the worm digs; pupils follow `look` when given.
    const lx = look ? look.x : dx, ly = look ? look.y : dy;
    for (const s of [-1, 1]) {
      const ex = head.x + dx * r * 0.32 + px * s * r * 0.36;
      const ey = head.y + dy * r * 0.32 + py * s * r * 0.36;
      const er = r * 0.36;
      ctx.fillStyle = "#4a1f22";
      ctx.beginPath(); ctx.arc(ex, ey, er + r * 0.06, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff6e8";
      ctx.beginPath(); ctx.ellipse(ex, ey, er, er * (1 - blink * 0.9), Math.atan2(dy, dx), 0, TAU); ctx.fill();
      if (blink < 0.6) {
        ctx.fillStyle = "#3a1810";
        ctx.beginPath(); ctx.arc(ex + lx * er * 0.42, ey + ly * er * 0.42, er * 0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(ex + lx * er * 0.42 - er * 0.18, ey + ly * er * 0.42 - er * 0.2, er * 0.17, 0, TAU); ctx.fill();
      }
    }
  }

  function drawAmber(ctx, x, y, r, t = 0, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    glow.addColorStop(0, `rgba(255, 216, 107, ${0.35 + 0.12 * Math.sin(t * 2.4 + x)})`);
    glow.addColorStop(1, "rgba(255, 216, 107, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 1.12);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, "#ffe9a8"); g.addColorStop(0.5, "#ffc457"); g.addColorStop(1, "#e08a24");
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, .55)";
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.12); ctx.lineTo(x - r * 0.87, y - r * 0.56); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function sizeCanvas(canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* ---------- Zones: the page ground and the depth readout ---------- */
  const ZONES = [
    { at: 0, name: "Roots & Soil", a: [75, 48, 38], b: [42, 27, 22] },
    { at: 100, name: "Clay & Stone", a: [110, 62, 40], b: [52, 28, 18] },
    { at: 300, name: "Underground Waters", a: [40, 72, 78], b: [17, 30, 34] },
    { at: 600, name: "Glowing Caverns", a: [56, 44, 96], b: [22, 16, 40] },
    { at: 1000, name: "Hot Depths", a: [86, 48, 32], b: [34, 18, 12] },
    { at: 1500, name: "Basalt Shelf", a: [56, 57, 62], b: [24, 24, 28] },
    { at: 2500, name: "Magma Rivers", a: [96, 32, 20], b: [36, 12, 8] },
    { at: 4000, name: "Crystal Abyss", a: [36, 46, 104], b: [14, 16, 44] },
    { at: 7000, name: "Ancient Core", a: [82, 40, 58], b: [32, 14, 24] },
    { at: 11000, name: "Fossil Vaults", a: [110, 96, 74], b: [44, 36, 26] },
    { at: 16000, name: "Iron Roots", a: [98, 52, 30], b: [38, 18, 10] },
    { at: 22000, name: "Sunken Sea", a: [28, 78, 78], b: [10, 30, 32] },
    { at: 29000, name: "Obsidian Halls", a: [46, 26, 60], b: [16, 8, 22] },
    { at: 37000, name: "Heart of the World", a: [118, 32, 36], b: [46, 10, 12] },
  ];
  const MAX_DEPTH = 40000;
  // Eased so the first zones pass while reading the first sections and the Heart of the World waits at the bottom.
  const depthAt = (p) => Math.round(Math.pow(MAX_DEPTH + 1, Math.pow(clamp(p, 0, 1), 0.55)) - 1);
  const zoneIndex = (m) => { let i = 0; while (i + 1 < ZONES.length && m >= ZONES[i + 1].at) i++; return i; };
  const rgb = (c) => `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
  const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

  /* ---------- The burrow: the worm digs down the page as it scrolls ---------- */
  const burrowCanvas = document.querySelector("[data-burrow]");
  if (burrowCanvas) {
    const hero = document.querySelector(".hero");
    const gauge = document.querySelector(".gauge");
    const gDepth = document.querySelector("[data-gauge-depth]");
    const gZone = document.querySelector("[data-gauge-zone]");
    const gAmber = document.querySelector("[data-gauge-amber]");
    const STEP = 4;
    let ctx, W = 0, H = 0, scale = 1;
    let xs = [], ys = [], amber = [], pebbles = [], crumbs = [];
    let blinkTimer = 0, surfaceY = 0, headS = 0, dugS = 0, collected = 0, lastTime = 0, running = false, blinkAt = 0, blink = 0, shownDepth = -1;

    // Plans a meandering tunnel from the hole under the hero to the bottom of the page.
    function plan() {
      const rand = seeded(7);
      W = window.innerWidth; H = window.innerHeight;
      scale = clamp(W / 1200, 0.68, 1);
      ctx = sizeCanvas(burrowCanvas, W, H);
      const docH = Math.max(document.documentElement.scrollHeight, H);
      const heroH = hero ? hero.offsetHeight : H;
      surfaceY = heroH * (W < 980 ? 0.94 : 0.88);
      // A weave across the window so the worm stays in view: two slow waves, resampled at equal arc length.
      const amp = W / 2 - 70 * scale;
      const phase = rand() * TAU;
      const x0 = W * (W < 980 ? 0.18 : 0.47);
      const xAt = (y) => {
        const d = y - surfaceY;
        const wave = 0.72 * Math.sin(d / 520 + phase) + 0.28 * Math.sin(d / 190 + phase * 2);
        const ease = Math.min(1, d / 400); // leave the hole gently
        return lerp(x0, W / 2 + amp * wave, ease);
      };
      xs = [x0]; ys = [surfaceY];
      let px = x0, py = surfaceY, y = surfaceY;
      while (y < docH + H) {
        y += 1;
        const x = xAt(y);
        if (Math.hypot(x - px, y - py) >= STEP) { xs.push(x); ys.push(y); px = x; py = y; }
      }
      // Amber sits in the tunnel's way; pebbles lie beside it.
      amber = [];
      for (let i = 140; i < xs.length; i += 90 + Math.floor(rand() * 90)) {
        amber.push({ i, x: xs[i] + (rand() - 0.5) * 10, y: ys[i], taken: i <= dugS / STEP, pop: 0 });
      }
      pebbles = [];
      for (let i = 60; i < xs.length; i += 40 + Math.floor(rand() * 70)) {
        const side = rand() < 0.5 ? -1 : 1;
        pebbles.push({ x: xs[i] + side * (34 + rand() * 60) * scale, y: ys[i] + (rand() - 0.5) * 40, rx: (6 + rand() * 12) * scale, ry: (4 + rand() * 8) * scale, a: rand() * Math.PI });
      }
      kick();
    }

    const indexAtY = (y) => {
      let lo = 0, hi = ys.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (ys[mid] < y) lo = mid + 1; else hi = mid; }
      return lo;
    };
    const pointAt = (s) => {
      const f = clamp(s / STEP, 0, xs.length - 1), i = Math.floor(f), t = f - i, j = Math.min(i + 1, xs.length - 1);
      return { x: lerp(xs[i], xs[j], t), y: lerp(ys[i], ys[j], t) };
    };
    // The head digs a little below the middle of the window; at the top of the page it waits in its hole.
    const targetS = () => {
      const y = window.scrollY + H * 0.62;
      return y <= surfaceY ? 0 : indexAtY(y) * STEP;
    };

    function frame(now) {
      const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
      lastTime = now;
      const target = targetS();
      const before = headS;
      // Crawl towards the scroll target instead of jumping; a long scroll still catches up quickly.
      const gap = target - headS;
      const step = Math.sign(gap) * Math.min(Math.abs(gap), Math.max(240, Math.abs(gap) * 7) * dt);
      headS = reduceMotion ? target : headS + step;
      const moving = Math.abs(headS - before) > 0.05;
      if (headS > dugS) {
        dugS = headS;
        if (!reduceMotion && moving) for (let k = 0; k < 2; k++) crumbs.push({ ...pointAt(headS), vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 60, life: 0.6 });
      }
      for (const a of amber) {
        if (!a.taken && a.i * STEP <= dugS) { a.taken = true; a.pop = 1; collected++; if (gAmber) { gAmber.textContent = String(collected); gAmber.classList.remove("is-bump"); void gAmber.offsetWidth; gAmber.classList.add("is-bump"); } }
        if (a.pop > 0) a.pop = Math.max(0, a.pop - dt * 2.2);
      }
      crumbs = crumbs.filter((c) => (c.life -= dt) > 0);
      for (const c of crumbs) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; }
      if (now > blinkAt) { blink = 1; blinkAt = now + 2800 + Math.random() * 3000; }
      blink = Math.max(0, blink - dt * 7);

      draw(now / 1000);
      updateReadout();
      const busy = moving || crumbs.length > 0 || blink > 0 || amber.some((a) => a.pop > 0);
      if (busy) requestAnimationFrame(frame); else { running = false; lastTime = 0; clearTimeout(blinkTimer); blinkTimer = setTimeout(kick, Math.max(0, blinkAt - performance.now())); }
    }

    function kick() {
      if (running || document.hidden) return;
      running = true;
      requestAnimationFrame(frame);
    }

    function draw(t) {
      const sy = window.scrollY;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(0, -sy);
      const top = sy - 80, bottom = sy + H + 80;

      for (const p of pebbles) {
        if (p.y < top || p.y > bottom || p.y < surfaceY + 20) continue;
        ctx.fillStyle = "rgba(0, 0, 0, .22)";
        ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 3, p.rx, p.ry, p.a, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(160, 140, 125, .32)";
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, p.a, 0, TAU); ctx.fill();
      }

      // The tunnel dug so far (only the part on screen).
      const i0 = Math.max(0, indexAtY(top)), i1 = Math.min(Math.floor(dugS / STEP), indexAtY(bottom));
      if (i1 > i0) {
        const trace = (ox, oy) => { ctx.beginPath(); ctx.moveTo(xs[i0] + ox, ys[i0] + oy); for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(xs[i] + ox, ys[i] + oy); ctx.lineTo(...Object.values(pointAt(dugS))); };
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        trace(0, 0); ctx.strokeStyle = "rgba(0, 0, 0, .25)"; ctx.lineWidth = 48 * scale; ctx.stroke();
        trace(-2, -2); ctx.strokeStyle = "rgba(255, 214, 160, .09)"; ctx.lineWidth = 38 * scale; ctx.stroke();
        trace(1, 1.5); ctx.strokeStyle = "rgba(18, 9, 5, .72)"; ctx.lineWidth = 34 * scale; ctx.stroke();
      }

      // The hole in the turf where the dig began.
      if (surfaceY > top && surfaceY < bottom) {
        const hx = xs[0];
        ctx.fillStyle = "rgba(60, 38, 26, .9)";
        ctx.beginPath(); ctx.ellipse(hx, surfaceY + 4, 40 * scale, 14 * scale, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#140a06";
        ctx.beginPath(); ctx.ellipse(hx, surfaceY + 2, 26 * scale, 9 * scale, 0, 0, TAU); ctx.fill();
      }

      for (const a of amber) {
        if (a.y < top || a.y > bottom) continue;
        if (!a.taken) drawAmber(ctx, a.x, a.y, 8 * scale, t);
        else if (a.pop > 0) drawAmber(ctx, a.x, a.y - (1 - a.pop) * 40, 8 * scale * (1 + (1 - a.pop) * 0.5), t, a.pop);
      }

      // The worm: head at the dig front, body trailing back up the tunnel and into the hole.
      const r = 19 * scale, spacing = 6 * scale, count = 34;
      const pts = [];
      for (let k = 0; k < count; k++) {
        const s = headS - k * spacing;
        if (s < 0 && k > 0) break;
        pts.push(pointAt(s));
      }
      if (headS < 1) {
        // Waiting at the top: peek out of the hole, looking up at the reader.
        drawHead(ctx, { x: xs[0], y: surfaceY - 4 * scale }, { x: xs[0], y: surfaceY + 10 }, r, { blink, look: { x: 0, y: -0.6 } });
        ctx.fillStyle = "rgba(60, 38, 26, .95)";
        ctx.beginPath(); ctx.ellipse(xs[0], surfaceY + 8 * scale, 30 * scale, 8 * scale, 0, 0, Math.PI); ctx.fill();
      } else if (pts.length > 1) {
        drawWorm(ctx, pts, r, { blink });
      }

      ctx.fillStyle = "rgba(120, 82, 58, .9)";
      for (const c of crumbs) { ctx.beginPath(); ctx.arc(c.x, c.y, 2.4 * scale, 0, TAU); ctx.fill(); }
      ctx.restore();
    }

    function updateReadout() {
      const total = (xs.length - 1) * STEP;
      const p = total > 0 ? headS / total : 0;
      const m = headS < 1 ? 0 : depthAt(p);
      const zi = zoneIndex(m);
      // Ease the ground colour from this zone to the next.
      const z = ZONES[zi], next = ZONES[Math.min(zi + 1, ZONES.length - 1)];
      const t = next === z ? 0 : clamp((m - z.at) / (next.at - z.at), 0, 1) ** 2;
      root.style.setProperty("--depth-a", rgb(mix(z.a, next.a, t)));
      root.style.setProperty("--depth-b", rgb(mix(z.b, next.b, t)));
      root.style.setProperty("--ground-shift", `${-(window.scrollY * 0.25) % 600}px`);
      if (gauge) gauge.classList.toggle("is-on", headS > 4);
      if (m !== shownDepth) {
        shownDepth = m;
        if (gDepth) gDepth.textContent = `${m.toLocaleString("en-US")} m`;
        if (gZone) gZone.textContent = headS < 1 ? "Meadow" : z.name;
      }
    }

    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(plan, 120); });
    window.addEventListener("scroll", kick, { passive: true });
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("load", plan);
    plan();
  }

  /* ---------- Interactive dig demo ---------- */
  const demoCanvas = document.querySelector("[data-demo]");
  if (demoCanvas) {
    const elAmber = document.querySelector("[data-demo-amber]");
    const elDepth = document.querySelector("[data-demo-depth]");
    const elEnergy = document.querySelector("[data-demo-energy]");
    const elEnergyN = document.querySelector("[data-demo-energy-n]");
    const elStatus = document.querySelector("[data-demo-status]");
    const PX_PER_M = 14, CELL = 6, SPEED = 64, TURN = 5.2, R = 13;
    const SOILS = [[110, 72, 50], [138, 82, 52], [62, 84, 88], [70, 56, 110], [96, 58, 40], [70, 72, 78]];
    let ctx, W = 0, H = 0, chunks, head, heading, target, trail, energy, amberCount, maxDepth, lunge, alive, camY, interacted, visible = false, running = false, last = 0, sparks;
    let pointer = null, keys = new Set();

    const chunkH = () => Math.max(200, H);

    function makeChunk(index) {
      const ch = chunkH();
      const rand = seeded(1000 + index * 97);
      const canvas = document.createElement("canvas");
      const c = sizeCanvas(canvas, W, ch);
      const y0 = index * ch;
      // Soil colour shifts every ~900 px, like zones going by.
      const band = (y) => SOILS[Math.floor(Math.max(0, y) / 900) % SOILS.length];
      const g = c.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, rgb(band(y0))); g.addColorStop(1, rgb(mix(band(y0), band(y0 + ch), 0.7)));
      c.fillStyle = g; c.fillRect(0, 0, W, ch);
      for (let k = 0; k < 18; k++) {
        c.fillStyle = `rgba(${rand() < 0.5 ? "0, 0, 0" : "255, 220, 180"}, ${0.05 + rand() * 0.07})`;
        c.beginPath(); c.ellipse(rand() * W, rand() * ch, 30 + rand() * 70, 18 + rand() * 40, rand() * 3, 0, TAU); c.fill();
      }
      for (let k = 0; k < 220; k++) {
        c.fillStyle = `rgba(${rand() < 0.6 ? "0, 0, 0" : "255, 230, 200"}, ${0.08 + rand() * 0.18})`;
        c.beginPath(); c.arc(rand() * W, rand() * ch, 0.6 + rand() * 1.8, 0, TAU); c.fill();
      }
      if (index === 0) {
        c.strokeStyle = "rgba(210, 170, 120, .35)"; c.lineCap = "round";
        for (let k = 0; k < 5; k++) {
          let x = rand() * W, y = 0; c.lineWidth = 3 + rand() * 3; c.beginPath(); c.moveTo(x, y);
          for (let s = 0; s < 8; s++) { x += (rand() - 0.5) * 30; y += 12 + rand() * 14; c.lineTo(x, y); }
          c.stroke();
        }
      }
      const items = [];
      const start = index === 0 ? 120 : 0;
      for (let k = 0; k < 4; k++) items.push({ kind: "stone", x: 40 + rand() * (W - 80), y: y0 + start + rand() * (ch - start), r: 14 + rand() * 16, a: rand() * 3 });
      for (let k = 0; k < 7; k++) items.push({ kind: "amber", x: 24 + rand() * (W - 48), y: y0 + Math.max(60, rand() * ch) });
      for (let k = 0; k < 2; k++) items.push({ kind: "food", x: 30 + rand() * (W - 60), y: y0 + Math.max(80, rand() * ch) });
      const cols = Math.ceil(W / CELL), rows = Math.ceil(ch / CELL);
      return { index, canvas, c, y0, items: items.filter((it) => it.kind === "stone" || !items.some((s) => s.kind === "stone" && Math.hypot(s.x - it.x, s.y - it.y) < s.r + 16)), dug: new Uint8Array(cols * rows), cols, rows };
    }

    const chunkAt = (y) => {
      const i = Math.floor(Math.max(0, y) / chunkH());
      if (!chunks.has(i)) chunks.set(i, makeChunk(i));
      return chunks.get(i);
    };

    // Carves a round tunnel into the soil and reports whether any of it was fresh earth.
    function carve(x, y) {
      let fresh = false;
      for (const ch of [chunkAt(y - R), chunkAt(y + R)]) {
        const ly = y - ch.y0;
        const r0 = Math.floor((ly - R) / CELL), r1 = Math.floor((ly + R) / CELL);
        const c0 = Math.floor((x - R) / CELL), c1 = Math.floor((x + R) / CELL);
        for (let rr = Math.max(0, r0); rr <= Math.min(ch.rows - 1, r1); rr++) {
          for (let cc = Math.max(0, c0); cc <= Math.min(ch.cols - 1, c1); cc++) {
            const k = rr * ch.cols + cc;
            if (!ch.dug[k] && Math.hypot(cc * CELL + CELL / 2 - x, rr * CELL + CELL / 2 - ly) < R) { ch.dug[k] = 1; fresh = true; }
          }
        }
        const g = ch.c.createRadialGradient(x - 2, ly - 2, 1, x, ly, R + 3);
        g.addColorStop(0, "rgba(28, 15, 10, 1)"); g.addColorStop(0.75, "rgba(36, 20, 13, 1)"); g.addColorStop(1, "rgba(36, 20, 13, 0)");
        ch.c.fillStyle = g;
        ch.c.beginPath(); ch.c.arc(x, ly, R + 3, 0, TAU); ch.c.fill();
      }
      return fresh;
    }

    function reset() {
      chunks = new Map();
      head = { x: W * 0.5, y: 24 };
      heading = Math.PI / 2; target = heading;
      trail = [];
      for (let k = 0; k < 40; k++) trail.push({ x: head.x, y: head.y - k * 2 });
      energy = 100; amberCount = 0; maxDepth = 0; lunge = 0; alive = true; sparks = [];
      camY = -H * 0.2;
      setStatus(interacted ? "" : "Drag to steer");
    }

    function setStatus(text) {
      if (!elStatus) return;
      if (text) elStatus.textContent = text;
      elStatus.classList.toggle("is-hidden", !text);
    }

    function layout() {
      const rect = demoCanvas.getBoundingClientRect();
      if (rect.width < 10) return;
      const changed = Math.round(rect.width) !== W;
      W = Math.round(rect.width); H = Math.round(rect.height);
      ctx = sizeCanvas(demoCanvas, W, H);
      if (changed || !chunks) reset();
      render(0);
    }

    function step(dt, t) {
      if (!alive) return;
      const autopilot = !interacted && !reduceMotion;
      if (!interacted && reduceMotion) return;
      if (autopilot) target = Math.PI / 2 + Math.sin(t * 0.6) * 0.9 + Math.sin(t * 1.7) * 0.25;
      if (keys.size) {
        const kx = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
        const ky = (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
        if (kx || ky) target = Math.atan2(ky, kx);
      }
      // Keep away from the walls and the turf.
      if (head.x < 30) target = 0.2; else if (head.x > W - 30) target = Math.PI - 0.2;
      if (head.y < 20) target = Math.PI / 2;
      let diff = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
      const turn = TURN * (lunge > 0 ? 3 : 1) * dt;
      heading += clamp(diff, -turn, turn);
      lunge = Math.max(0, lunge - dt);
      const speed = SPEED * (1 + 1.8 * (lunge / 0.35));
      const nx = head.x + Math.cos(heading) * speed * dt, ny = head.y + Math.sin(heading) * speed * dt;
      head.x = clamp(nx, R, W - R); head.y = Math.max(R, ny);
      // Stones push the worm aside and cost a little energy.
      for (const ch of [chunkAt(head.y - 60), chunkAt(head.y + 60)]) {
        for (const it of ch.items) {
          if (it.taken) continue;
          const d = Math.hypot(head.x - it.x, head.y - it.y);
          if (it.kind === "stone" && d < it.r + R - 2) {
            const ux = (head.x - it.x) / (d || 1), uy = (head.y - it.y) / (d || 1);
            head.x = it.x + ux * (it.r + R - 2); head.y = it.y + uy * (it.r + R - 2);
            if (!autopilot) energy -= 4 * dt;
          } else if (it.kind === "amber" && d < R + 8) {
            it.taken = true; amberCount++; burst(it.x, it.y, "255, 205, 100");
          } else if (it.kind === "food" && d < R + 10) {
            it.taken = true; energy = Math.min(100, energy + 28); burst(it.x, it.y, "140, 220, 100");
          }
        }
      }
      const fresh = carve(head.x, head.y);
      if (!autopilot) energy -= (fresh ? 3.4 : 0.8) * dt * (lunge > 0 ? 2 : 1);
      trail.unshift({ x: head.x, y: head.y });
      if (trail.length > 200) trail.length = 200;
      maxDepth = Math.max(maxDepth, Math.floor(head.y / PX_PER_M));
      if (energy <= 0) { energy = 0; alive = false; setStatus("Out of energy · tap to dig again"); }
      // Forget soil far above the worm.
      for (const [k, ch] of chunks) if (ch.y0 + chunkH() < head.y - chunkH() * 2) chunks.delete(k);
    }

    function burst(x, y, color) {
      if (reduceMotion) return;
      for (let k = 0; k < 10; k++) sparks.push({ x, y, vx: Math.cos(k / 10 * TAU) * (50 + Math.random() * 50), vy: Math.sin(k / 10 * TAU) * (50 + Math.random() * 50), life: 0.5, color });
    }

    function render(t) {
      if (!ctx) return;
      camY = lerp(camY, Math.max(-H * 0.2, head.y - H * 0.42), 0.12);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(0, -Math.round(camY));
      // Meadow and turf above the soil.
      if (camY < 0) {
        const g = ctx.createLinearGradient(0, camY, 0, 0);
        g.addColorStop(0, "#56693e"); g.addColorStop(1, "#3c4d2b");
        ctx.fillStyle = g; ctx.fillRect(0, camY, W, -camY);
        ctx.strokeStyle = "#7d9a55"; ctx.lineWidth = 2; ctx.lineCap = "round";
        for (let x = 4; x < W; x += 7) { ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x + Math.sin(x + t) * 3, -8 - (x * 13 % 9)); ctx.stroke(); }
      }
      const ch = chunkH();
      for (let i = Math.floor(Math.max(0, camY) / ch); i * ch < camY + H; i++) {
        const c = chunkAt(i * ch);
        ctx.drawImage(c.canvas, 0, c.y0, W, ch);
      }
      for (let i = Math.floor(Math.max(0, camY) / ch); i * ch < camY + H; i++) {
        for (const it of chunkAt(i * ch).items) {
          if (it.taken || it.y < camY - 40 || it.y > camY + H + 40) continue;
          if (it.kind === "stone") {
            ctx.fillStyle = "rgba(0, 0, 0, .3)";
            ctx.beginPath(); ctx.ellipse(it.x + 3, it.y + 4, it.r, it.r * 0.82, it.a, 0, TAU); ctx.fill();
            const g = ctx.createRadialGradient(it.x - it.r * 0.4, it.y - it.r * 0.4, 1, it.x, it.y, it.r);
            g.addColorStop(0, "#c3c8cc"); g.addColorStop(1, "#6d747a");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(it.x, it.y, it.r, it.r * 0.82, it.a, 0, TAU); ctx.fill();
            ctx.strokeStyle = "rgba(40, 40, 46, .5)"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(it.x - it.r * 0.3, it.y - it.r * 0.5); ctx.lineTo(it.x, it.y); ctx.lineTo(it.x + it.r * 0.2, it.y + it.r * 0.4); ctx.stroke();
          } else if (it.kind === "amber") {
            drawAmber(ctx, it.x, it.y, 7, t);
          } else {
            // A small sprout: food.
            ctx.strokeStyle = "#5c8a3a"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(it.x, it.y + 8); ctx.lineTo(it.x, it.y - 2); ctx.stroke();
            ctx.fillStyle = "#8fd35f";
            ctx.beginPath(); ctx.ellipse(it.x - 6, it.y - 4, 7, 4, -0.5, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(it.x + 6, it.y - 5, 7, 4, 0.5, 0, TAU); ctx.fill();
          }
        }
      }
      const pts = [];
      let acc = 0;
      pts.push(trail[0]);
      for (let k = 1; k < trail.length && pts.length < 18; k++) {
        acc += Math.hypot(trail[k].x - trail[k - 1].x, trail[k].y - trail[k - 1].y);
        if (acc >= 7) { pts.push(trail[k]); acc = 0; }
      }
      if (pts.length > 1) drawWorm(ctx, pts, R, { blink: alive ? (Math.sin(t * 1.3) > 0.985 ? 1 : 0) : 0.85 });
      sparks = sparks.filter((s) => (s.life -= 1 / 60) > 0);
      for (const s of sparks) {
        s.x += s.vx / 60; s.y += s.vy / 60;
        ctx.fillStyle = `rgba(${s.color}, ${s.life * 2})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
      if (elAmber) elAmber.textContent = String(amberCount);
      if (elDepth) elDepth.textContent = maxDepth.toLocaleString("en-US");
      if (elEnergyN) elEnergyN.textContent = String(Math.ceil(energy));
      if (elEnergy) { elEnergy.style.setProperty("--v", (energy / 100).toFixed(3)); elEnergy.classList.toggle("is-low", energy < 25); }
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      step(dt, now / 1000);
      render(now / 1000);
      if (visible) requestAnimationFrame(loop); else { running = false; last = 0; }
    }
    function start() { if (!running && visible && W) { running = true; requestAnimationFrame(loop); } }

    function engage() {
      if (!alive) { reset(); }
      if (!interacted) { interacted = true; setStatus(""); }
    }

    function doLunge(angle) {
      if (!alive) return;
      target = angle; lunge = 0.35; energy -= 3;
    }

    // Floating anchor steering, as in the game: the first touch is the anchor, the drag direction is the course.
    demoCanvas.addEventListener("pointerdown", (e) => {
      engage();
      demoCanvas.setPointerCapture(e.pointerId);
      pointer = { id: e.pointerId, ax: e.clientX, ay: e.clientY, hist: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
    });
    demoCanvas.addEventListener("pointermove", (e) => {
      if (!pointer || e.pointerId !== pointer.id) return;
      const vx = e.clientX - pointer.ax, vy = e.clientY - pointer.ay, d = Math.hypot(vx, vy);
      if (d > 10) target = Math.atan2(vy, vx);
      if (d > 60) { pointer.ax = e.clientX - vx / d * 60; pointer.ay = e.clientY - vy / d * 60; }
      pointer.hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      if (pointer.hist.length > 12) pointer.hist.shift();
    });
    const release = (e) => {
      if (!pointer || e.pointerId !== pointer.id) return;
      // A swipe still moving fast when the finger lifts becomes a lunge.
      const h = pointer.hist.filter((p) => e.timeStamp - p.t < 110);
      if (h.length > 1) {
        const a = h[0], b = h[h.length - 1], dist = Math.hypot(b.x - a.x, b.y - a.y), v = dist / Math.max(1, b.t - a.t) * 1000;
        if (v > 700 && dist > 20) doLunge(Math.atan2(b.y - a.y, b.x - a.x));
      }
      pointer = null;
    };
    demoCanvas.addEventListener("pointerup", release);
    demoCanvas.addEventListener("pointercancel", release);
    demoCanvas.addEventListener("keydown", (e) => {
      if (e.key.startsWith("Arrow")) { e.preventDefault(); engage(); keys.add(e.key); }
      else if (e.key === " ") { e.preventDefault(); engage(); }
    });
    demoCanvas.addEventListener("keyup", (e) => {
      keys.delete(e.key);
      if (e.key === " ") doLunge(heading);
    });
    demoCanvas.addEventListener("blur", () => keys.clear());

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(demoCanvas);
    } else { visible = true; }
    if ("ResizeObserver" in window) new ResizeObserver(() => { layout(); start(); }).observe(demoCanvas);
    else window.addEventListener("resize", layout);
    layout();
    start();
  }

  /* ---------- Screenshot gallery ---------- */
  const gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    const tabs = [...gallery.querySelectorAll("[data-tab]")];
    const shots = [...gallery.querySelectorAll("[data-shot]")];
    const SLIDE = 6000;
    let current = 0, timer = null;
    gallery.style.setProperty("--slide", `${SLIDE / 1000}s`);
    const show = (i, focus = false) => {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => {
        const on = k === current;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        if (on) { const bar = t.querySelector(".t-progress"); if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; } }
      });
      shots.forEach((s, k) => s.classList.toggle("is-active", k === current));
      if (focus) tabs[current].focus();
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (reduceMotion || gallery.classList.contains("is-paused")) return;
      timer = setTimeout(() => show(current + 1), SLIDE);
    };
    tabs.forEach((t, k) => {
      t.addEventListener("click", () => show(k));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); show(current + 1, true); }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); show(current - 1, true); }
      });
    });
    gallery.addEventListener("mouseenter", () => { gallery.classList.add("is-paused"); clearTimeout(timer); });
    gallery.addEventListener("mouseleave", () => { gallery.classList.remove("is-paused"); show(current); });
    if (reduceMotion) gallery.classList.add("is-paused");
    show(0);
  }
})();
