// Location panoramas drawn in SVG: layered silhouettes, mist and light, Darkest Dungeon style.
// window.SCENE(slug, { w, h, tone }) returns an <svg class="scene"> string.
// Placeholder art for the sketches; real illustrations would replace it.
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
  };

  function rand(seed) {
    let r = seed % 2147483647 || 1;
    return () => (r = (r * 16807) % 2147483647) / 2147483647;
  }

  function pine(x, y, h) {
    const W = h * 0.36,
      tiers = 5,
      pts = [[x, y - h]];
    for (let t = 1; t <= tiers; t++) {
      const ty = y - h + (h * 0.88 * t) / tiers,
        e = (W * t) / tiers;
      pts.push([x - e, ty]);
      if (t < tiers) pts.push([x - e * 0.45, ty - h * 0.02]);
    }
    pts.push(
      [x - h * 0.03, y - h * 0.12],
      [x - h * 0.03, y],
      [x + h * 0.03, y],
      [x + h * 0.03, y - h * 0.12],
    );
    for (let t = tiers; t >= 1; t--) {
      const ty = y - h + (h * 0.88 * t) / tiers,
        e = (W * t) / tiers;
      pts.push([x + e, ty]);
      if (t > 1)
        pts.push([
          x + ((W * (t - 1)) / tiers) * 0.45,
          y - h + (h * 0.88 * (t - 1)) / tiers - h * 0.02,
        ]);
    }
    return (
      'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join('L') + 'Z'
    );
  }

  function ridge(w, h, base, amp, rnd, step = 40) {
    let d = `M0 ${h}`;
    const ph = rnd() * 10;
    for (let x = 0; x <= w + step; x += step) {
      const y =
        base +
        Math.sin(x / 180 + ph) * amp +
        Math.sin(x / 61 + ph * 2) * amp * 0.35 +
        (rnd() - 0.5) * amp * 0.3;
      d += `L${x} ${y.toFixed(1)}`;
    }
    return d + `L${w} ${h}Z`;
  }

  function trees(w, base, count, minH, maxH, rnd, edgesOnly) {
    let d = '';
    for (let k = 0; k < count; k++) {
      let x = rnd() * w;
      if (edgesOnly) x = rnd() < 0.5 ? rnd() * w * 0.22 : w - rnd() * w * 0.22;
      const hh = minH + rnd() * (maxH - minH);
      d += pine(x, base + rnd() * 10, hh);
    }
    return d;
  }

  window.SCENE = function (slug, { w = 1200, h = 420, tone = 'dusk' } = {}) {
    const id = `sc${++uid}`;
    const P = PALETTES[tone] || PALETTES.dusk;
    const rnd = rand(slug.length * 977 + 13);
    const mist = (y, hh, a) =>
      `<rect x="0" y="${y}" width="${w}" height="${hh}" fill="url(#${id}m)" opacity="${a}"/>`;
    let body = '';

    if (slug === 'forest') {
      body += `<path d="${ridge(w, h, h * 0.52, 22, rnd)}" fill="${P.layers[0]}"/>`;
      body += `<path d="${trees(w, h * 0.58, 70, 40, 80, rnd)}" fill="${P.layers[0]}"/>`;
      body += mist(h * 0.45, h * 0.3, 0.9);
      body += `<path d="${trees(w, h * 0.78, 34, 110, 190, rnd)}" fill="${P.layers[1]}"/>`;
      body += mist(h * 0.6, h * 0.3, 0.7);
      body += `<path d="${trees(w, h * 1.02, 12, 300, 420, rnd, true)}" fill="${P.layers[2]}"/>`;
      body += `<path d="${ridge(w, h, h * 0.9, 10, rnd)}" fill="${P.layers[3]}"/>`;
    } else if (slug === 'clearing') {
      body += `<path d="${ridge(w, h, h * 0.6, 14, rnd)}" fill="${P.layers[0]}"/>`;
      body += `<path d="${trees(w, h * 0.64, 40, 30, 60, rnd)}" fill="${P.layers[0]}"/>`;
      body += mist(h * 0.5, h * 0.25, 0.8);
      body += `<path d="${trees(w, h * 0.98, 9, 230, 360, rnd, true)}" fill="${P.layers[2]}"/>`;
      body += `<path d="${ridge(w, h, h * 0.84, 6, rnd)}" fill="${P.layers[3]}"/>`;
      // stumps and the old fire pit
      for (const [x, s] of [
        [0.36, 1],
        [0.6, 0.8],
        [0.68, 1.2],
      ])
        body += `<path d="M${w * x - 12 * s} ${h * 0.86}l3 ${-26 * s}h${18 * s}l3 ${26 * s}z" fill="${P.layers[3]}"/>`;
      body += `<ellipse cx="${w * 0.5}" cy="${h * 0.87}" rx="70" ry="10" fill="${P.glow}" opacity=".35" filter="url(#${id}b)"/>`;
      body += `<path d="M${w * 0.5} ${h * 0.85}c-20-40 30-60 0-110s20-70-10-120" fill="none" stroke="rgba(${P.mist},.35)" stroke-width="16" stroke-linecap="round" filter="url(#${id}b)"/>`;
    } else if (slug === 'mill') {
      body += `<path d="${ridge(w, h, h * 0.55, 18, rnd)}" fill="${P.layers[0]}"/>`;
      body += mist(h * 0.4, h * 0.4, 1);
      const mx = w * 0.58,
        my = h * 0.8;
      body += `<g fill="${P.layers[2]}"><rect x="${mx}" y="${my - 120}" width="150" height="120"/><path d="M${mx - 14} ${my - 118}l89-60 89 60z"/></g>`;
      body += `<g fill="none" stroke="${P.layers[2]}" stroke-width="7"><circle cx="${mx - 30}" cy="${my - 50}" r="60"/>${[0, 30, 60, 90, 120, 150].map((a) => `<path d="M${mx - 30 + 60 * Math.cos((a * Math.PI) / 180)} ${my - 50 + 60 * Math.sin((a * Math.PI) / 180)}L${mx - 30 - 60 * Math.cos((a * Math.PI) / 180)} ${my - 50 - 60 * Math.sin((a * Math.PI) / 180)}"/>`).join('')}</g>`;
      body += `<rect x="0" y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${P.layers[3]}"/>`;
      body += mist(h * 0.62, h * 0.3, 0.8);
    } else {
      body += `<path d="${ridge(w, h, h * 0.6, 30, rnd)}" fill="${P.layers[0]}" opacity=".6"/>`;
      body += mist(h * 0.2, h * 0.8, 1);
      body += mist(h * 0.4, h * 0.6, 1);
    }

    return `<svg class="scene" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.skyTop}"/><stop offset=".75" stop-color="${P.skyLow}"/></linearGradient>
        <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(${P.mist})" stop-opacity="0"/><stop offset=".5" stop-color="rgb(${P.mist})" stop-opacity=".22"/><stop offset="1" stop-color="rgb(${P.mist})" stop-opacity="0"/></linearGradient>
        <radialGradient id="${id}g"><stop offset="0" stop-color="${P.glow}" stop-opacity=".9"/><stop offset=".25" stop-color="${P.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>
        <filter id="${id}b"><feGaussianBlur stdDeviation="8"/></filter>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#${id}s)"/>
      <circle cx="${w * 0.7}" cy="${h * 0.42}" r="${h * 0.55}" fill="url(#${id}g)"/>
      ${body}
    </svg>`;
  };
})();
