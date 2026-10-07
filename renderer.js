(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = { blue: '#45a8ff', red: '#ff6065', green: '#5bd879', neutral: '#334052' };
  const svg = document.getElementById('grille');
  const GRID_STEP = 100;
  const MARGIN = 55;
  const LONG_PRESS_MS = 400;
  const CONSTELLATIONS = [
    { name: 'Grande Ourse', width: 6, height: 3, points: [[0, 0], [1, 0], [2, 1], [3, 2], [4, 1], [5, 1], [5, 2]] },
    { name: 'Ceinture d’Orion', width: 2, height: 0, points: [[0, 0], [1, 0], [2, 0]] }
  ];
  let constellationScene = null;
  let currentState = null;
  let ambientTimer = null;
  let cometTimer = null;
  let cometCycleStarted = false;
  function element(name, attributes = {}) {
    const node = document.createElementNS(NS, name);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }
  function point(state, piece) {
    return { x: MARGIN + piece.x * GRID_STEP, y: MARGIN + piece.y * GRID_STEP };
  }
  function centerRingRadius(state) {
    return Math.max(21, GRID_STEP / 4 - 2);
  }
  function canvasSize(state) {
    return {
      width: MARGIN * 2 + (state.config.width - 1) * GRID_STEP,
      height: MARGIN * 2 + (state.config.height - 1) * GRID_STEP
    };
  }
  function crossingAtPointer(state, event) {
    const box = svg.getBoundingClientRect();
    const size = canvasSize(state);
    const x = Math.round((((event.clientX - box.left) * size.width / box.width) - MARGIN) / GRID_STEP);
    const y = Math.round((((event.clientY - box.top) * size.height / box.height) - MARGIN) / GRID_STEP);
    if (x < 0 || y < 0 || x >= state.config.width || y >= state.config.height) return null;
    return `${x}:${y}`;
  }
  function drawGrid(state) {
    const size = canvasSize(state);
    svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    svg.setAttribute('width', size.width);
    svg.setAttribute('height', size.height);
    svg.replaceChildren();
    svg.append(element('rect', { x: 0, y: 0, width: size.width, height: size.height, class: 'space' }));
    const grid = element('g', { class: 'grid-lines' });
    for (let x = 0; x < state.config.width; x += 1) {
      const a = point(state, { x, y: 0 }); const b = point(state, { x, y: state.config.height - 1 });
      grid.append(element('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
    }
    for (let y = 0; y < state.config.height; y += 1) {
      const a = point(state, { x: 0, y }); const b = point(state, { x: state.config.width - 1, y });
      grid.append(element('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
    }
    svg.append(grid);
  }
  function constellationSceneFor(state) {
    const signature = `${state.config.width}x${state.config.height}`;
    const expired = constellationScene && Date.now() - constellationScene.createdAt > 30000;
    if (constellationScene && constellationScene.signature === signature && !expired) return constellationScene;
    const compatible = CONSTELLATIONS.filter(pattern => pattern.width < state.config.width && pattern.height < state.config.height);
    constellationScene = {
      signature,
      createdAt: Date.now(),
      constellations: compatible.map((pattern, index) => {
        const offsetX = Math.floor(Math.random() * (state.config.width - pattern.width));
        const offsetY = Math.floor(Math.random() * (state.config.height - pattern.height));
        return {
          name: pattern.name,
          delay: index * -5,
          stars: pattern.points.map(([x, y]) => ({ x: offsetX + x, y: offsetY + y }))
        };
      })
    };
    return constellationScene;
  }
  function drawConstellationStars(state) {
    const layer = element('g', { class: 'constellation-stars', 'aria-hidden': 'true' });
    constellationSceneFor(state).constellations.forEach(constellation => {
      const group = element('g', {
        class: 'constellation-group',
        style: `--constellation-delay: ${constellation.delay}s`,
        'aria-label': constellation.name
      });
      constellation.stars.forEach(star => {
        if (state.pieces.has(`${star.x}:${star.y}`)) return;
        const p = point(state, star);
        group.append(element('circle', { cx: p.x, cy: p.y, r: 5, class: 'constellation-star' }));
      });
      if (group.childElementCount) layer.append(group);
    });
    svg.append(layer);
  }
  function animate(attributes) { return element('animate', attributes); }
  function spawnGravityWave(state, x, y, color = '#b9e3ff') {
    const p = point(state, { x, y });
    const layer = element('g', { class: 'ambient-effects', 'pointer-events': 'none' });
    for (let index = 0; index < 3; index += 1) {
      const ring = element('circle', { cx: p.x, cy: p.y, r: 5, fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0 });
      ring.append(animate({ attributeName: 'r', from: 5, to: 70, dur: '1.7s', begin: `${index * 0.2}s`, fill: 'freeze' }));
      ring.append(animate({ attributeName: 'opacity', values: '0;.55;0', dur: '1.7s', begin: `${index * 0.2}s`, fill: 'freeze' }));
      layer.append(ring);
    }
    svg.append(layer);
    setTimeout(() => layer.remove(), 2300);
  }
  function spawnAppearingStar(state) {
    const freeCrossings = [];
    for (let y = 0; y < state.config.height; y += 1) for (let x = 0; x < state.config.width; x += 1) {
      if (!state.pieces.has(`${x}:${y}`)) freeCrossings.push({ x, y });
    }
    if (!freeCrossings.length) return;
    const star = freeCrossings[Math.floor(Math.random() * freeCrossings.length)];
    const p = point(state, star);
    const layer = element('g', { class: 'ambient-effects', 'pointer-events': 'none' });
    const light = element('circle', { cx: p.x, cy: p.y, r: 4, fill: '#eff8ff', opacity: 0 });
    light.append(animate({ attributeName: 'r', values: '3;9;3', dur: '2.2s', fill: 'freeze' }));
    light.append(animate({ attributeName: 'opacity', values: '0;.95;0', dur: '2.2s', fill: 'freeze' }));
    layer.append(light);
    svg.append(layer);
    setTimeout(() => layer.remove(), 2400);
  }
  function spawnComet(state) {
    const size = canvasSize(state);
    const margin = 90;
    const edges = [
      () => ({ x: -margin, y: Math.random() * size.height }),
      () => ({ x: size.width + margin, y: Math.random() * size.height }),
      () => ({ x: Math.random() * size.width, y: -margin }),
      () => ({ x: Math.random() * size.width, y: size.height + margin })
    ];
    const startEdge = Math.floor(Math.random() * edges.length);
    let endEdge = Math.floor(Math.random() * (edges.length - 1));
    if (endEdge >= startEdge) endEdge += 1;
    const start = edges[startEdge]();
    const end = edges[endEdge]();
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const layer = element('g', { class: 'ambient-effects', 'pointer-events': 'none', opacity: 0 });
    const origin = element('g', { transform: `translate(${start.x} ${start.y}) rotate(${angle})` });
    const mover = element('g');
    mover.append(element('line', { x1: -110, y1: 0, x2: -6, y2: 0, stroke: '#bfe8ff', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: .85 }));
    mover.append(element('circle', { cx: 0, cy: 0, r: 6, fill: '#ffffff' }));
    origin.append(mover);
    layer.append(origin);
    svg.append(layer);
    const distance = Math.hypot(dx, dy);
    const duration = 2800;
    const startedAt = performance.now();
    function animateComet(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      mover.setAttribute('transform', `translate(${distance * eased} 0)`);
      layer.setAttribute('opacity', progress < .1 ? progress * 10 : progress > .88 ? (1 - progress) / .12 : 1);
      if (progress < 1 && layer.isConnected) requestAnimationFrame(animateComet);
      else layer.remove();
    }
    requestAnimationFrame(animateComet);
  }
  function scheduleAmbientEffect(delay = 2800 + Math.random() * 4200) {
    ambientTimer = setTimeout(() => {
      ambientTimer = null;
      if (currentState) {
        if (Math.random() < .75) spawnAppearingStar(currentState);
        else spawnGravityWave(currentState, Math.floor(Math.random() * currentState.config.width), Math.floor(Math.random() * currentState.config.height));
      }
      scheduleAmbientEffect();
    }, delay);
  }
  function scheduleComet() {
    cometTimer = setTimeout(() => {
      cometTimer = null;
      if (currentState) spawnComet(currentState);
      scheduleComet();
    }, 18000 + Math.random() * 12000);
  }
  function startCometCycle() {
    if (cometCycleStarted) return;
    cometCycleStarted = true;
    cometTimer = setTimeout(() => {
      cometTimer = null;
      if (currentState) spawnComet(currentState);
      scheduleComet();
    }, 1200);
  }
  function resetCometCycle() {
    clearTimeout(cometTimer);
    cometTimer = null;
    cometCycleStarted = false;
  }
  function ensureAmbientEffects(state) {
    currentState = state;
    if (!ambientTimer) scheduleAmbientEffect(1200);
  }
  function playBattleEffect(state, effect) {
    if (!effect?.owner) return;
    const p = point(state, effect);
    const color = COLORS[effect.owner];
    const layer = element('g', { class: 'battle-effects', 'pointer-events': 'none' });
    const glow = element('circle', { cx: p.x, cy: p.y, r: 12, fill: color, opacity: 0 });
    glow.append(animate({ attributeName: 'r', from: 12, to: 52, dur: '.95s', fill: 'freeze' }));
    glow.append(animate({ attributeName: 'opacity', values: '0;.42;0', dur: '.95s', fill: 'freeze' }));
    layer.append(glow);
    svg.append(layer);
    spawnGravityWave(state, effect.x, effect.y, color);
    setTimeout(() => layer.remove(), 1200);
  }
  function draw(state) {
    ensureAmbientEffects(state);
    drawGrid(state);
    const links = element('g', { class: 'links' });
    state.links.forEach(link => {
      const a = point(state, state.pieces.get(link.a)); const b = point(state, state.pieces.get(link.b));
      const hitZone = element('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'link-hit', stroke: 'transparent' });
      hitZone.addEventListener('contextmenu', event => {
        event.preventDefault();
        event.stopPropagation();
        globalThis.IntergalactiqueApp.showNetworkValue(link.id);
      });
      links.append(hitZone);
      links.append(element('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'link-visible', stroke: COLORS[link.owner] }));
    });
    svg.append(links);
    const pieces = element('g', { class: 'pieces' });
    state.pieces.forEach(piece => {
      const p = point(state, piece); const group = element('g', { class: `piece ${piece.type} ${piece.owner || 'green'}${state.selectedId === piece.id ? ' selected' : ''}`, transform: `translate(${p.x} ${p.y})`, 'data-id': piece.id });
      const color = COLORS[piece.owner || 'green'];
      // La zone invisible rend la sélection plus confortable sans agrandir le dessin.
      group.append(element('circle', { r: piece.type === 'center' ? centerRingRadius(state) : 28, class: 'zone-selection', fill: 'transparent' }));
      if (piece.type === 'center') {
        group.append(element('circle', { r: centerRingRadius(state), class: 'centre-ring', fill: 'none', stroke: color }));
        group.append(element('path', { d: 'M0,-18 L4,-5 L18,-5 L7,3 L11,16 L0,8 L-11,16 L-7,3 L-18,-5 L-4,-5 Z', fill: color }));
      }
      if (piece.type === 'planet') {
        group.append(element('circle', { r: 16, fill: 'none', stroke: color })); group.append(element('circle', { r: 10, fill: 'none', stroke: color })); group.append(element('circle', { r: 4, fill: color }));
      }
      if (piece.type === 'station') group.append(element('circle', { r: 8, fill: color }));
      let longPressTimer = null;
      let draggingCenter = false;
      group.addEventListener('pointerdown', event => {
        event.stopPropagation();
        group.classList.add('pressed');
        group.setPointerCapture(event.pointerId);
        if (piece.type === 'center') {
          longPressTimer = setTimeout(() => {
            draggingCenter = true;
            group.classList.add('dragging-center');
          }, LONG_PRESS_MS);
        }
      });
      group.addEventListener('pointerup', event => {
        clearTimeout(longPressTimer);
        group.classList.remove('pressed');
        if (!draggingCenter) return;
        draggingCenter = false;
        group.classList.remove('dragging-center');
        group.dataset.ignoreClick = 'true';
        const targetId = crossingAtPointer(state, event);
        if (targetId) globalThis.IntergalactiqueApp.moveCenter(piece.id, targetId);
      });
      group.addEventListener('pointercancel', () => {
        clearTimeout(longPressTimer);
        draggingCenter = false;
        group.classList.remove('pressed', 'dragging-center');
      });
      group.addEventListener('click', event => {
        event.stopPropagation();
        if (group.dataset.ignoreClick === 'true') {
          delete group.dataset.ignoreClick;
          return;
        }
        globalThis.IntergalactiqueApp.selectPiece(piece.id);
      });
      if (piece.type === 'station') {
        group.addEventListener('contextmenu', event => {
          event.preventDefault();
          event.stopPropagation();
          globalThis.IntergalactiqueApp.showStationValue(piece.id);
        });
      }
      pieces.append(group);
    });
    svg.append(pieces);
    const crossings = element('g', { class: 'crossings' });
    for (let y = 0; y < state.config.height; y += 1) for (let x = 0; x < state.config.width; x += 1) {
      if (state.pieces.has(`${x}:${y}`)) continue;
      const p = point(state, { x, y }); const node = element('g', { class: 'crossing', 'data-id': `${x}:${y}` });
      node.append(element('circle', { cx: p.x, cy: p.y, r: 18, class: 'zone-selection', fill: 'transparent' }));
      node.append(element('circle', { cx: p.x, cy: p.y, r: 4, class: 'point-visible' }));
      node.addEventListener('click', event => { event.stopPropagation(); globalThis.IntergalactiqueApp.selectCrossing(`${x}:${y}`); }); crossings.append(node);
    }
    svg.append(crossings);
    drawConstellationStars(state);
  }
  globalThis.GameRenderer = Object.freeze({ draw, playBattleEffect, startCometCycle, resetCometCycle, COLORS });
})();
