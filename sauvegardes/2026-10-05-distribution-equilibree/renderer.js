(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = { blue: '#45a8ff', red: '#ff6065', green: '#5bd879', neutral: '#334052' };
  const svg = document.getElementById('grille');
  const GRID_STEP = 100;
  const MARGIN = 55;
  const LONG_PRESS_MS = 400;
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
  function draw(state) {
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
  }
  globalThis.GameRenderer = Object.freeze({ draw, COLORS });
})();
