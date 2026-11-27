// Location art drawn in SVG: layered silhouettes, mist and light.
// A scene is data: a tone (palette) and a list of layers from a fixed vocabulary, drawn back to front.
//   window.SCENE.render(spec, { w, h, id })  → <svg class="scene"> string (id: a prefix for gradient ids, unique per page)
//   window.SCENE.SPECS                   → the specs of the known locations
//   window.SCENE(slug, { w, h, tone })   → shorthand for a known location (round-2 pages use it)
// Coordinates: x and y are fractions of the width and height; sizes are pixels at h = 420 and scale with h.
(function () {
  let uid = 0;

  const PALETTES = {
    ember: {
      skyTop: '#140d0c',
      skyLow: '#8a3f17',
      glow: '#ffb15a',
      layers: ['#3a2420', '#241715', '#1a100e', '#0d0807'],
      mist: '220,130,70',
    },
    dusk: {
      skyTop: '#0e1416',
      skyLow: '#6c3a1e',
      glow: '#f1a35a',
      layers: ['#2c2522', '#1d1817', '#110e0d', '#090707'],
      mist: '210,150,100',
    },
    blood: {
      skyTop: '#120607',
      skyLow: '#7a1a14',
      glow: '#ff7a4a',
      layers: ['#341416', '#220d0e', '#160809', '#0b0404'],
      mist: '200,90,70',
    },
    night: {
      skyTop: '#05080d',
      skyLow: '#26354a',
      glow: '#c9d6e8',
      layers: ['#1c2430', '#131a23', '#0c1117', '#06080b'],
      mist: '150,170,200',
    },
    fog: {
      skyTop: '#151a18',
      skyLow: '#4f5a52',
      glow: '#d8dccf',
      layers: ['#2c332f', '#202623', '#151a18', '#0b0e0d'],
      mist: '190,200,190',
    },
  };

  const rand = (seed) => {
    let r = Math.abs(seed) % 2147483647 || 1;
    return () => (r = (r * 16807) % 2147483647) / 2147483647;
  };
  const f = (n) => n.toFixed(1);

  // ---- shapes ----
  function pine(x, y, h) {
    const W = h * 0.36,
      tiers = 5,
      pts = [[x, y - h]];
    const ty = (t) => y - h + (h * 0.88 * t) / tiers,
      e = (t) => (W * t) / tiers;
    for (let t = 1; t <= tiers; t++) {
      pts.push([x - e(t), ty(t)]);
      if (t < tiers) pts.push([x - e(t) * 0.45, ty(t) - h * 0.02]);
    }
    pts.push(
      [x - h * 0.03, y - h * 0.12],
      [x - h * 0.03, y],
      [x + h * 0.03, y],
      [x + h * 0.03, y - h * 0.12],
    );
    for (let t = tiers; t >= 1; t--) {
      pts.push([x + e(t), ty(t)]);
      if (t > 1) pts.push([x + e(t - 1) * 0.45, ty(t - 1) - h * 0.02]);
    }
    return 'M' + pts.map((p) => p.map(f).join(' ')).join('L') + 'Z';
  }

  function deadtree(x, y, h, rnd) {
    // trunk and a few forked branches, drawn as strokes by the caller
    let d = `M${f(x)} ${f(y)}L${f(x + (rnd() - 0.5) * h * 0.05)} ${f(y - h)}`;
    const branch = (bx, by, len, ang, depth) => {
      const ex = bx + Math.cos(ang) * len,
        ey = by - Math.sin(ang) * len;
      d += `M${f(bx)} ${f(by)}L${f(ex)} ${f(ey)}`;
      if (depth > 0) {
        branch(ex, ey, len * 0.6, ang + 0.5 + rnd() * 0.3, depth - 1);
        branch(ex, ey, len * 0.55, ang - 0.5 - rnd() * 0.3, depth - 1);
      }
    };
    for (let k = 0; k < 3; k++)
      branch(x, y - h * (0.45 + k * 0.18), h * 0.32, k % 2 ? 2.2 : 0.9, 2);
    return d;
  }

  function ridgePath(w, h, base, amp, rnd, step) {
    let d = `M0 ${h}`;
    const ph = rnd() * 10;
    for (let x = 0; x <= w + step; x += step) {
      const y =
        base +
        Math.sin(x / 180 + ph) * amp +
        Math.sin(x / 61 + ph * 2) * amp * 0.35 +
        (rnd() - 0.5) * amp * 0.3;
      d += `L${x} ${f(y)}`;
    }
    return d + `L${w} ${h}Z`;
  }

  const xs = (L, w, rnd) => {
    if (L.edges) return rnd() < 0.5 ? rnd() * w * 0.22 : w - rnd() * w * 0.22;
    const [a, b] = L.spread || [0, 1];
    return (a + rnd() * (b - a)) * w;
  };

  // ---- layer vocabulary ----
  const LAYERS = {
    ridge: (L, c) =>
      `<path d="${ridgePath(c.w, c.h, L.y * c.h, (L.amp ?? 20) * c.u, c.rnd, 40)}" fill="${c.col(L.color ?? 0)}" ${L.opacity ? `opacity="${L.opacity}"` : ''}/>`,
    ground: (L, c) =>
      `<path d="${ridgePath(c.w, c.h, L.y * c.h, (L.amp ?? 8) * c.u, c.rnd, 40)}" fill="${c.col(L.color ?? 3)}"/>`,
    pines: (L, c) => {
      let d = '';
      for (let k = 0; k < L.count; k++)
        d += pine(
          xs(L, c.w, c.rnd),
          L.y * c.h + c.rnd() * 10 * c.u,
          (L.min + c.rnd() * (L.max - L.min)) * c.u,
        );
      return `<path d="${d}" fill="${c.col(L.color ?? 1)}"/>`;
    },
    deadtrees: (L, c) => {
      let d = '';
      for (let k = 0; k < L.count; k++)
        d += deadtree(
          xs(L, c.w, c.rnd),
          L.y * c.h,
          (L.min + c.rnd() * (L.max - L.min)) * c.u,
          c.rnd,
        );
      return `<path d="${d}" fill="none" stroke="${c.col(L.color ?? 2)}" stroke-width="${(L.stroke ?? 5) * c.u}" stroke-linecap="round"/>`;
    },
    mist: (L, c) =>
      `<rect x="0" y="${L.y * c.h}" width="${c.w}" height="${L.h * c.h}" fill="url(#${c.id}m)" opacity="${L.a ?? 0.8}"/>`,
    water: (L, c) => {
      const y = L.y * c.h;
      let lines = '';
      for (let k = 0; k < 9; k++) {
        const ly = y + 6 * c.u + (k * (c.h - y)) / 10,
          lw = (60 + c.rnd() * 140) * c.u,
          lx = (L.glint ?? 0.7) * c.w - lw / 2 + (c.rnd() - 0.5) * 80 * c.u;
        lines += `<path d="M${f(lx)} ${f(ly)}h${f(lw)}" stroke="${c.P.glow}" stroke-opacity="${f(0.45 - k * 0.04)}" stroke-width="${2 * c.u}"/>`;
      }
      return `<rect x="0" y="${y}" width="${c.w}" height="${c.h - y}" fill="${c.col(L.color ?? 2)}"/>${lines}`;
    },
    stumps: (L, c) =>
      L.at
        .map(
          ([x, s]) =>
            `<path d="M${f(x * c.w - 12 * s * c.u)} ${f(L.y * c.h)}l${3 * c.u} ${f(-26 * s * c.u)}h${f(18 * s * c.u)}l${3 * c.u} ${f(26 * s * c.u)}z" fill="${c.col(L.color ?? 3)}"/>`,
        )
        .join(''),
    rocks: (L, c) => {
      let d = '';
      for (let k = 0; k < L.count; k++) {
        const x = xs(L, c.w, c.rnd),
          y = L.y * c.h,
          r = (10 + c.rnd() * 26) * c.u;
        d += `M${f(x - r)} ${f(y)}q${f(r * 0.2)} ${f(-r * 1.1)} ${f(r)} ${f(-r * 0.9)}t${f(r)} ${f(r * 0.9)}z`;
      }
      return `<path d="${d}" fill="${c.col(L.color ?? 3)}"/>`;
    },
    fire: (L, c) => {
      const x = L.x * c.w,
        y = L.y * c.h;
      return `<ellipse cx="${x}" cy="${y}" rx="${80 * c.u}" ry="${12 * c.u}" fill="${c.P.glow}" opacity=".35" filter="url(#${c.id}b)"/>
        <path d="M${x} ${y - 30 * c.u}c${8 * c.u} ${12 * c.u} ${14 * c.u} ${18 * c.u} ${6 * c.u} ${30 * c.u}h${-12 * c.u}c${-8 * c.u} ${-12 * c.u} ${-2 * c.u} ${-18 * c.u} ${6 * c.u} ${-30 * c.u}z" fill="${c.P.glow}" opacity=".9"/>`;
    },
    smoke: (L, c) =>
      `<path d="M${L.x * c.w} ${L.y * c.h}c-20-40 30-60 0-110s20-70-10-120" transform="scale(1 ${c.u})" transform-origin="${L.x * c.w} ${L.y * c.h}" fill="none" stroke="rgba(${c.P.mist},.35)" stroke-width="${16 * c.u}" stroke-linecap="round" filter="url(#${c.id}b)"/>`,
    hut: (L, c) => {
      const x = L.x * c.w,
        y = L.y * c.h,
        s = (L.s ?? 1) * c.u;
      return `<g fill="${c.col(L.color ?? 2)}"><rect x="${x}" y="${y - 70 * s}" width="${110 * s}" height="${70 * s}"/><path d="M${x - 12 * s} ${y - 66 * s}l${67 * s} ${-50 * s} ${67 * s} ${50 * s}z"/><rect x="${x + 76 * s}" y="${y - 132 * s}" width="${14 * s}" height="${40 * s}"/></g>
        ${L.lit ? `<rect x="${x + 22 * s}" y="${y - 50 * s}" width="${18 * s}" height="${18 * s}" fill="${c.P.glow}" opacity=".85"/><circle cx="${x + 31 * s}" cy="${y - 41 * s}" r="${40 * s}" fill="url(#${c.id}g)" opacity=".5"/>` : ''}`;
    },
    mill: (L, c) => {
      const mx = L.x * c.w,
        my = L.y * c.h,
        s = (L.s ?? 1) * c.u,
        col = c.col(L.color ?? 2);
      const spokes = [0, 30, 60, 90, 120, 150]
        .map((a) => {
          const r = (a * Math.PI) / 180,
            cx = mx - 30 * s,
            cy = my - 50 * s,
            R = 60 * s;
          return `<path d="M${f(cx + R * Math.cos(r))} ${f(cy + R * Math.sin(r))}L${f(cx - R * Math.cos(r))} ${f(cy - R * Math.sin(r))}"/>`;
        })
        .join('');
      return `<g fill="${col}"><rect x="${mx}" y="${my - 120 * s}" width="${150 * s}" height="${120 * s}"/><path d="M${mx - 14 * s} ${my - 118 * s}l${89 * s} ${-60 * s} ${89 * s} ${60 * s}z"/></g>
        <g fill="none" stroke="${col}" stroke-width="${7 * s}"><circle cx="${mx - 30 * s}" cy="${my - 50 * s}" r="${60 * s}"/>${spokes}</g>`;
    },
    ruins: (L, c) => {
      const x = L.x * c.w,
        y = L.y * c.h,
        s = (L.s ?? 1) * c.u;
      return `<path d="M${x} ${y}v${-140 * s}l${14 * s} ${-10 * s} ${10 * s} ${16 * s}v${40 * s}h${50 * s}v${-30 * s}a${30 * s} ${30 * s} 0 0 1 ${60 * s} 0v${60 * s}l${12 * s} ${-24 * s} ${8 * s} ${30 * s}v${58 * s}z" fill="${c.col(L.color ?? 2)}"/>`;
    },
    tower: (L, c) => {
      const x = L.x * c.w,
        y = L.y * c.h,
        s = (L.s ?? 1) * c.u;
      return `<g fill="${c.col(L.color ?? 1)}"><rect x="${x}" y="${y - 200 * s}" width="${46 * s}" height="${200 * s}"/><path d="M${x - 8 * s} ${y - 200 * s}h${62 * s}v${-14 * s}h${-10 * s}v${8 * s}h${-10 * s}v${-8 * s}h${-12 * s}v${8 * s}h${-10 * s}v${-8 * s}h${-10 * s}v${8 * s}h${-10 * s}z"/></g>`;
    },
    fence: (L, c) => {
      const y = L.y * c.h;
      let d = '';
      for (let x = L.x0 * c.w; x < L.x1 * c.w; x += 26 * c.u)
        d += `M${f(x)} ${f(y)}v${f(-28 * c.u - c.rnd() * 6 * c.u)}`;
      d += `M${L.x0 * c.w} ${f(y - 18 * c.u)}H${L.x1 * c.w}`;
      return `<path d="${d}" stroke="${c.col(L.color ?? 3)}" stroke-width="${4 * c.u}" fill="none"/>`;
    },
    moon: (L, c) =>
      `<circle cx="${L.x * c.w}" cy="${L.y * c.h}" r="${(L.r ?? 26) * c.u}" fill="${c.P.glow}" opacity=".9"/><circle cx="${L.x * c.w}" cy="${L.y * c.h}" r="${(L.r ?? 26) * 4 * c.u}" fill="url(#${c.id}g)" opacity=".6"/>`,
    cave: (L, c) => {
      // a rock mound with a dark mouth; lit: firelight inside
      const x = L.x * c.w,
        y = L.y * c.h,
        s = (L.s ?? 1) * c.u;
      // jagged outline: a lopsided hump with rocky steps
      let mound = `M${f(x - 240 * s)} ${f(y)}`;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16,
          hump = Math.sin(Math.PI * t) ** 0.7 * (1 - 0.25 * t);
        mound += `L${f(x - 240 * s + t * 490 * s)} ${f(y - hump * 190 * s - (c.rnd() - 0.3) * 22 * s)}`;
      }
      mound += `L${f(x + 250 * s)} ${f(y)}Z`;
      const mouth = `M${f(x - 50 * s)} ${f(y)}V${f(y - 60 * s)}Q${f(x - 46 * s)} ${f(y - 110 * s)} ${f(x)} ${f(y - 112 * s)}T${f(x + 50 * s)} ${f(y - 58 * s)}V${f(y)}Z`;
      return `<path d="${mound}" fill="${c.col(L.color ?? 1)}"/><path d="${mouth}" fill="${c.col(3)}"/>${L.lit ? `<ellipse cx="${f(x)}" cy="${f(y - 30 * s)}" rx="${f(46 * s)}" ry="${f(40 * s)}" fill="url(#${c.id}g)" opacity=".9"/><ellipse cx="${f(x)}" cy="${f(y - 4 * s)}" rx="${f(120 * s)}" ry="${f(14 * s)}" fill="${c.P.glow}" opacity=".25" filter="url(#${c.id}b)"/>` : ''}`;
    },
    graves: (L, c) => {
      // leaning headstones: rounded slabs, no religious symbols
      let out = '';
      for (let k = 0; k < L.count; k++) {
        const x = xs(L, c.w, c.rnd),
          y = L.y * c.h + c.rnd() * 6 * c.u,
          s = (L.s ?? 1) * (0.7 + c.rnd() * 0.5) * c.u,
          tilt = (c.rnd() - 0.5) * 22;
        out += `<path d="M${f(x - 14 * s)} ${f(y)}V${f(y - 34 * s)}a${f(14 * s)} ${f(14 * s)} 0 0 1 ${f(28 * s)} 0V${f(y)}Z" transform="rotate(${f(tilt)} ${f(x)} ${f(y)})"/>`;
      }
      return `<g fill="${c.col(L.color ?? 2)}">${out}</g>`;
    },
    reeds: (L, c) => {
      // marsh reeds and cattails at the water line
      let d = '',
        heads = '';
      for (let k = 0; k < L.count; k++) {
        const x = xs(L, c.w, c.rnd),
          y = L.y * c.h + c.rnd() * 8 * c.u,
          h = ((L.min ?? 30) + c.rnd() * ((L.max ?? 70) - (L.min ?? 30))) * c.u,
          lean = (c.rnd() - 0.5) * h * 0.3;
        d += `M${f(x)} ${f(y)}q${f(lean * 0.2)} ${f(-h * 0.5)} ${f(lean)} ${f(-h)}`;
        if (c.rnd() < 0.35)
          heads += `<ellipse cx="${f(x + lean)}" cy="${f(y - h + 6 * c.u)}" rx="${f(2.6 * c.u)}" ry="${f(8 * c.u)}" transform="rotate(${f((lean / h) * 40)} ${f(x + lean)} ${f(y - h)})"/>`;
      }
      return `<path d="${d}" fill="none" stroke="${c.col(L.color ?? 3)}" stroke-width="${f(2.4 * c.u)}" stroke-linecap="round"/><g fill="${c.col(L.color ?? 3)}">${heads}</g>`;
    },
    birds: (L, c) => {
      let d = '';
      for (let k = 0; k < (L.count ?? 5); k++) {
        const x = (L.x + (c.rnd() - 0.5) * 0.12) * c.w,
          y = (L.y + (c.rnd() - 0.5) * 0.08) * c.h,
          s = (6 + c.rnd() * 5) * c.u;
        d += `M${f(x - s)} ${f(y)}q${f(s / 2)} ${f(-s / 2)} ${f(s)} 0q${f(s / 2)} ${f(-s / 2)} ${f(s)} 0`;
      }
      return `<path d="${d}" fill="none" stroke="${c.col(3)}" stroke-width="${2 * c.u}"/>`;
    },
  };

  function render(spec, { w = 1200, h = 420, tone, id = `sc${++uid}` } = {}) {
    const P = PALETTES[tone || spec.tone] || PALETTES.dusk;
    const c = {
      id,
      w,
      h,
      u: h / 420,
      P,
      rnd: rand(spec.seed ?? 7),
      col: (i) => P.layers[i],
    };
    const g = spec.glow || { x: 0.7, y: 0.42, r: 0.55 };
    const body = spec.layers
      .map((L) => (LAYERS[L.type] ? LAYERS[L.type](L, c) : ''))
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" class="scene" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.skyTop}"/><stop offset=".75" stop-color="${P.skyLow}"/></linearGradient>
        <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(${P.mist})" stop-opacity="0"/><stop offset=".5" stop-color="rgb(${P.mist})" stop-opacity=".22"/><stop offset="1" stop-color="rgb(${P.mist})" stop-opacity="0"/></linearGradient>
        <radialGradient id="${id}g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".9"/><stop offset=".25" stop-color="${P.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>
        <filter id="${id}b"><feGaussianBlur stdDeviation="${8 * c.u}"/></filter>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#${id}s)"/>
      <circle cx="${g.x * w}" cy="${g.y * h}" r="${g.r * h}" fill="url(#${id}g)"/>
      ${body}
    </svg>`;
  }

  // ---- the known locations ----
  const SPECS = {
    clearing: {
      tone: 'ember',
      seed: 81,
      layers: [
        { type: 'ridge', y: 0.6, amp: 14, color: 0 },
        { type: 'pines', y: 0.64, count: 40, min: 30, max: 60, color: 0 },
        { type: 'mist', y: 0.5, h: 0.25, a: 0.8 },
        { type: 'birds', x: 0.3, y: 0.28, count: 4 },
        {
          type: 'pines',
          y: 0.98,
          count: 9,
          min: 230,
          max: 360,
          color: 2,
          edges: true,
        },
        { type: 'ground', y: 0.84, amp: 6 },
        {
          type: 'stumps',
          y: 0.86,
          at: [
            [0.36, 1],
            [0.6, 0.8],
            [0.68, 1.2],
          ],
        },
        { type: 'fire', x: 0.5, y: 0.87 },
        { type: 'smoke', x: 0.5, y: 0.85 },
      ],
    },
    forest: {
      tone: 'dusk',
      seed: 97,
      layers: [
        { type: 'ridge', y: 0.52, amp: 22, color: 0 },
        { type: 'pines', y: 0.58, count: 70, min: 40, max: 80, color: 0 },
        { type: 'mist', y: 0.45, h: 0.3, a: 0.9 },
        { type: 'pines', y: 0.78, count: 34, min: 110, max: 190, color: 1 },
        { type: 'mist', y: 0.6, h: 0.3, a: 0.7 },
        {
          type: 'deadtrees',
          y: 0.95,
          count: 2,
          min: 160,
          max: 220,
          color: 2,
          spread: [0.3, 0.7],
        },
        {
          type: 'pines',
          y: 1.02,
          count: 12,
          min: 300,
          max: 420,
          color: 2,
          edges: true,
        },
        { type: 'ground', y: 0.9, amp: 10 },
      ],
    },
    mill: {
      tone: 'fog',
      seed: 43,
      glow: { x: 0.3, y: 0.35, r: 0.5 },
      layers: [
        { type: 'ridge', y: 0.55, amp: 18, color: 0 },
        { type: 'mist', y: 0.4, h: 0.4, a: 1 },
        { type: 'mill', x: 0.58, y: 0.78 },
        {
          type: 'deadtrees',
          y: 0.8,
          count: 2,
          min: 110,
          max: 150,
          color: 2,
          spread: [0.12, 0.35],
        },
        { type: 'water', y: 0.78, glint: 0.3 },
        { type: 'mist', y: 0.62, h: 0.3, a: 0.8 },
      ],
    },
    unknown: {
      tone: 'night',
      seed: 5,
      glow: { x: 0.5, y: 0.5, r: 0.6 },
      layers: [
        { type: 'ridge', y: 0.6, amp: 30, color: 0, opacity: 0.6 },
        { type: 'mist', y: 0.2, h: 0.8, a: 1 },
        { type: 'tower', x: 0.62, y: 0.66, s: 0.7, color: 0 },
        { type: 'mist', y: 0.4, h: 0.6, a: 1 },
      ],
    },
  };

  const SCENE = (slug, opts = {}) => render(SPECS[slug] || SPECS.unknown, opts);
  SCENE.render = render;
  SCENE.SPECS = SPECS;
  SCENE.LAYERS = Object.keys(LAYERS);
  SCENE.TONES = Object.keys(PALETTES);
  window.SCENE = SCENE;
})();
