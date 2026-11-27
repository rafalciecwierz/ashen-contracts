// Shared behaviour for the design sketches: landing ↔ game, the map, adventures and energy.
// Display only: in the real game every number comes from the server.
// Each sketch styles the same class names in its own CSS, and may set window.PROTO:
//   divider: '<svg…>'                 ornament between title and text
//   map(ctx) / outcome(ctx) → html    replace a view's markup (ctx: LOCATIONS, state, icon, loc, o, canAgain)
//   after(view, ctx)                   called after a view renders
// A page without a [data-view="landing"] opens straight into the game.
(function () {
  const opts = window.PROTO || {};
  // Optional art slot in an outcome; hidden unless a sketch styles it.
  document.head.insertAdjacentHTML(
    'afterbegin',
    '<style>.outcome-art{display:none}</style>',
  );

  // Icon sprite: <svg class="i"><use href="#i-map"/></svg>
  const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.display = 'none';
  sprite.innerHTML = Object.entries(window.ICONS)
    .map(
      ([k, paths]) =>
        `<symbol id="i-${k}" viewBox="0 0 512 512">${paths.map((d) => `<path fill="currentColor" d="${d}"/>`).join('')}</symbol>`,
    )
    .join('');
  document.body.prepend(sprite);
  const icon = (k) =>
    `<svg class="i" aria-hidden="true"><use href="#i-${k}"/></svg>`;
  document
    .querySelectorAll('[data-icon]')
    .forEach((el) =>
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)),
    );

  const LOCATIONS = [
    {
      slug: 'clearing',
      name: 'The Clearing',
      desc: 'Where the forest gives up and the road begins.',
      cost: 5,
      icon: 'acorn',
      outcomes: [
        {
          title: 'Nothing of note',
          text: 'You walk the clearing twice. Crows, stumps, old ash. The road is as empty going back as it was coming.',
          gain: ['+2 crowns'],
        },
        {
          title: 'A coin in the ash',
          text: 'Something catches the light where the fire pit used to be. A copper crown, blackened, still good. Someone left in a hurry.',
          gain: ['+4 crowns'],
        },
      ],
    },
    {
      slug: 'forest',
      name: 'The Old Forest',
      desc: 'Pines older than the kingdom. The light goes green and thin.',
      cost: 10,
      icon: 'forest',
      outcomes: [
        {
          title: 'Resin and silence',
          text: 'You walk beneath the pines until the light goes green and thin. Nothing follows you home but the smell of resin and the feeling of being counted.',
          gain: ['+3 crowns'],
        },
        {
          title: 'A satchel in the rain',
          text: 'Under a fallen spruce lies a satchel gone stiff with rain. Inside: seven crowns and a ring too small for any hand you know. Whoever owned it will not be coming back for it.',
          gain: ['+7 crowns', 'Tarnished ring'],
        },
        {
          title: 'The root',
          text: 'A root catches your boot and the forest floor comes up to meet you. You lie there a while, listening to something large decide you are not worth the trouble. You limp back slower than you went.',
          gain: [],
          loss: ['−5 extra energy'],
        },
      ],
    },
    {
      slug: 'mill',
      name: 'Mill on the Weir',
      desc: 'The wheel has not turned in a year. Nobody says why.',
      locked: 'Reputation 10',
    },
    {
      slug: 'unknown',
      name: '? ? ?',
      desc: 'Not on any map you own.',
      locked: 'Undiscovered',
    },
  ];

  const state = {
    energy: 64,
    max: 100,
    crowns: 12,
    last: {},
    items: ['Notched knife', 'Acorn'],
  };
  const $ = (s) => document.querySelector(s);
  const center = $('#center');

  function renderStats() {
    document
      .querySelectorAll('[data-energy]')
      .forEach((el) => (el.textContent = state.energy));
    document
      .querySelectorAll('[data-energy-bar]')
      .forEach(
        (el) => (el.style.width = `${(state.energy / state.max) * 100}%`),
      );
    document
      .querySelectorAll('[data-crowns]')
      .forEach((el) => (el.textContent = state.crowns));
  }

  const hook = (name, ctx) =>
    opts[name] && opts[name]({ LOCATIONS, state, icon, ...ctx });

  function renderMap() {
    if (opts.map) {
      center.innerHTML = hook('map', {});
      setNav('map');
      return hook('after', { view: 'map' });
    }
    center.innerHTML = `
      <section class="map">
        <p class="center-kicker">The Northern Marches</p>
        <h1 class="center-title">Map</h1>
        ${opts.divider || ''}
        <ul class="locations">
          ${LOCATIONS.map((l) =>
            l.locked
              ? `<li class="locked"><div class="loc" aria-disabled="true">${icon('lock')}<span class="loc-name">${l.name}</span><span class="loc-desc">${l.desc}</span><span class="loc-cost">${l.locked}</span></div></li>`
              : `<li><button class="loc" data-loc="${l.slug}">${icon(l.icon)}<span class="loc-name">${l.name}</span><span class="loc-desc">${l.desc}</span><span class="loc-cost">${icon('energy')}${l.cost} energy</span></button></li>`,
          ).join('')}
        </ul>
      </section>`;
    setNav('map');
  }

  function adventure(slug) {
    const loc = LOCATIONS.find((l) => l.slug === slug);
    if (state.energy < loc.cost) return renderOutcome(loc, null);
    let i;
    do {
      i = Math.floor(Math.random() * loc.outcomes.length);
    } while (loc.outcomes.length > 1 && i === state.last[slug]);
    state.last[slug] = i;
    const o = loc.outcomes[i];
    state.energy -= loc.cost + (o.loss ? 5 : 0);
    if (
      o.gain.some((g) => !g.includes('crowns')) &&
      !state.items.includes('Tarnished ring')
    )
      state.items.push('Tarnished ring');
    if (state.energy < 0) state.energy = 0;
    o.gain.forEach((g) => {
      const m = g.match(/\+(\d+) crowns/);
      if (m) state.crowns += +m[1];
    });
    renderStats();
    renderOutcome(loc, o);
  }

  function renderOutcome(loc, o) {
    const canAgain = state.energy >= loc.cost;
    if (opts.outcome) {
      center.innerHTML = hook('outcome', { loc, o, canAgain });
      setNav('map');
      return hook('after', { view: 'outcome', loc, o });
    }
    center.innerHTML = `
      <section class="outcome" aria-live="polite">
        <p class="center-kicker">${loc.name}</p>
        <h1 class="center-title">${o ? o.title : 'Too tired to go on'}</h1>
        ${opts.divider || ''}
        <div class="outcome-text"><span class="outcome-art" aria-hidden="true">${icon(loc.icon)}</span><p>${o ? o.text : 'Your legs refuse the road. Rest, and try again when your strength returns.'}</p></div>
        <ul class="effects">
          ${o ? o.gain.map((g) => `<li class="gain">${g}</li>`).join('') : ''}
          ${o && o.loss ? o.loss.map((g) => `<li class="loss">${g}</li>`).join('') : ''}
          ${o ? `<li class="cost">−${loc.cost} energy</li>` : ''}
        </ul>
        <div class="outcome-actions">
          <button class="btn btn-primary" data-act="again" data-loc="${loc.slug}" ${canAgain ? '' : 'disabled'}>Go again <small>${loc.cost} energy</small></button>
          <button class="btn" data-act="map">Back to map</button>
        </div>
      </section>`;
    setNav('map');
    center.querySelector('.outcome').classList.add('enter');
  }

  function renderPlaceholder(name) {
    center.innerHTML = `<section class="placeholder"><p class="center-kicker">Not in this sketch</p><h1 class="center-title">${name}</h1>${opts.divider || ''}<div class="outcome-text"><p>This page comes later. The map works: try the Old Forest.</p></div><div class="outcome-actions"><button class="btn btn-primary" data-act="map">Open the map</button></div></section>`;
  }

  function setNav(k) {
    document
      .querySelectorAll('[data-nav]')
      .forEach((el) =>
        el.toggleAttribute('aria-current', el.dataset.nav === k),
      );
  }

  function show(view) {
    document
      .querySelectorAll('[data-view]')
      .forEach((el) => (el.hidden = el.dataset.view !== view));
    document.body.dataset.current = view;
    window.scrollTo(0, 0);
    if (view === 'game') adventure('forest');
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-loc],[data-act],[data-nav]');
    if (!t || t.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault();
    if (t.dataset.go) {
      history.replaceState(null, '', t.dataset.go === 'game' ? '#game' : '#');
      return show(t.dataset.go);
    }
    if (t.dataset.act === 'map') return renderMap();
    if (t.dataset.loc) return adventure(t.dataset.loc);
    if (t.dataset.nav === 'map') return renderMap();
    if (t.dataset.nav) {
      setNav(t.dataset.nav);
      return renderPlaceholder(t.textContent.trim());
    }
  });

  const initial = () =>
    location.hash === '#game' ||
    !document.querySelector('[data-view="landing"]')
      ? 'game'
      : 'landing';
  renderStats();
  show(initial());
  window.addEventListener('hashchange', () => show(initial()));
})();
