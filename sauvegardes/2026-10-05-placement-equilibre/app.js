(() => {
  const { DEFAULT_CONFIG } = IntergalactiqueConfig;
  let state;
  const status = document.getElementById('statut');
  const activeLabel = document.getElementById('joueur-actif');
  function number(id) { return Number(document.getElementById(id).value); }
  function configFromForm() {
    return { width: Math.floor(number('largeur')), height: Math.floor(number('hauteur')), planets: { blue: Math.floor(number('planetes-blue')), red: Math.floor(number('planetes-red')), green: Math.floor(number('planetes-green')) }, values: { center: number('valeur-centre'), planet: number('valeur-planete'), station: number('valeur-station') } };
  }
  function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
  function validConfig(config) {
    if (config.width < 7 || config.height < 7) return 'La grille doit mesurer au minimum 7 × 7.';
    if (Object.values(config.planets).some(value => !Number.isInteger(value) || value < 0)) return 'Les nombres de planètes doivent être des entiers positifs.';
    if (Object.values(config.values).some(value => !Number.isFinite(value) || value < 0)) return 'Les valeurs doivent être positives ou nulles.';
    return null;
  }
  function addInitialPlanet(state, owner, position) {
    const initialOwner = owner === 'green' ? null : owner;
    GameState.addPiece(state, {
      id: GameState.key(position.x, position.y),
      ...position,
      type: 'planet',
      owner: initialOwner,
      initialOwner,
      created: false
    });
  }
  function takePositions(candidates, count, label) {
    if (candidates.length < count) throw new Error(`Il n’y a pas assez de croisements dans la zone ${label}.`);
    return candidates.splice(0, count);
  }
  function chooseBalancedCenter(state, candidates, planets) {
    const available = candidates.filter(position => !state.pieces.has(GameState.key(position.x, position.y)));
    if (!available.length) throw new Error('Il n’y a pas de croisement disponible pour un Centre galactique.');
    if (!planets.length) return shuffle(available)[0];
    const scored = available.map(position => {
      const distances = planets.map(planet => Math.abs(planet.x - position.x) + Math.abs(planet.y - position.y));
      return {
        position,
        spread: Math.max(...distances) - Math.min(...distances),
        totalDistance: distances.reduce((total, distance) => total + distance, 0)
      };
    });
    const bestSpread = Math.min(...scored.map(item => item.spread));
    const mostBalanced = scored.filter(item => item.spread === bestSpread);
    const shortestDistance = Math.min(...mostBalanced.map(item => item.totalDistance));
    return shuffle(mostBalanced.filter(item => item.totalDistance === shortestDistance).map(item => item.position))[0];
  }
  function populate(state) {
    const { width, height, planets } = state.config; const middle = Math.floor(height / 2);
    const safe = [];
    for (let y = 2; y <= height - 3; y += 1) for (let x = 2; x <= width - 3; x += 1) safe.push({ x, y });
    const blueCenters = safe.filter(p => p.y <= middle - 2); const redCenters = safe.filter(p => p.y >= middle + 2);
    if (!blueCenters.length || !redCenters.length) throw new Error('La grille est trop petite pour placer les Centres.');
    const bluePlanets = takePositions(shuffle(safe.filter(p => p.y < middle)), planets.blue, 'nord pour les Planètes bleues');
    const redPlanets = takePositions(shuffle(safe.filter(p => p.y > middle)), planets.red, 'sud pour les Planètes rouges');
    bluePlanets.forEach(position => addInitialPlanet(state, 'blue', position));
    redPlanets.forEach(position => addInitialPlanet(state, 'red', position));
    const blueCenter = chooseBalancedCenter(state, blueCenters, bluePlanets);
    const redCenter = chooseBalancedCenter(state, redCenters, redPlanets);
    GameState.addPiece(state, { id: GameState.key(blueCenter.x, blueCenter.y), ...blueCenter, type: 'center', owner: 'blue', initialOwner: 'blue', created: false });
    GameState.addPiece(state, { id: GameState.key(redCenter.x, redCenter.y), ...redCenter, type: 'center', owner: 'red', initialOwner: 'red', created: false });
    const positions = shuffle(safe.filter(p => !state.pieces.has(GameState.key(p.x, p.y))));
    takePositions(positions, planets.green, 'restante pour les Planètes vertes').forEach(position => addInitialPlanet(state, 'green', position));
  }
  function update() {
    GameRenderer.draw(state); const scores = NetworkEngine.potentialScores(state);
    document.getElementById('score-blue').value = scores.blue; document.getElementById('score-red').value = scores.red;
    activeLabel.textContent = state.activePlayer === 'blue' ? 'Zarkon de Véga' : 'Kryssar d’Andromède'; activeLabel.className = state.activePlayer;
    status.textContent = state.lastMessage || `Au tour de ${activeLabel.textContent}.`;
  }
  function newGalaxy() {
    const config = configFromForm(); const error = validConfig(config); if (error) { status.textContent = error; return; }
    try { state = GameState.create(config); populate(state); state.lastMessage = 'Nouvelle galaxie créée. Zarkon commence.'; update(); } catch (error) { status.textContent = error.message; }
  }
  function choose(targetId) {
    if (!state.selectedId) { const piece = state.pieces.get(targetId); if (!piece || piece.owner !== state.activePlayer) { state.lastMessage = 'Choisissez une planète, une station ou votre Centre galactique.'; update(); return; } state.selectedId = piece.id; state.lastMessage = 'Choisissez un croisement voisin ou une cible adverse autorisée.'; update(); return; }
    const result = GameRules.performMove(state, state.selectedId, targetId); state.selectedId = null; state.lastMessage = result.message; if (result.ok) state.activePlayer = state.activePlayer === 'blue' ? 'red' : 'blue'; update();
  }
  function selectPiece(id) { choose(id); }
  function selectCrossing(id) { choose(id); }
  function showNetworkValue(linkId) {
    const link = state.links.get(linkId);
    const start = link && state.pieces.get(link.a);
    if (!link || !start) return;
    const network = NetworkEngine.connectedNetwork(state, start.id);
    const owner = network.owner === 'blue' ? 'bleu' : 'rouge';
    state.lastMessage = `Segment ${owner} — valeur du réseau : ${network.value}.`;
    update();
  }
  function showStationValue(pieceId) {
    const station = state.pieces.get(pieceId);
    if (!station || station.type !== 'station') return;
    const values = NetworkEngine.attachments(state, station.id)
      .filter(link => link.owner === station.owner)
      .map(link => state.pieces.get(link.a === station.id ? link.b : link.a))
      .filter(piece => piece?.owner === station.owner)
      .map(piece => NetworkEngine.pieceValue(state, piece));
    const value = NetworkEngine.attachmentsValue(state, station.id);
    const owner = station.owner === 'blue' ? 'bleue' : 'rouge';
    const calculation = values.length ? `${values.join(' + ')} = ${value}` : '0';
    state.lastMessage = `Station ${owner} — ${values.length} attache${values.length > 1 ? 's' : ''} : ${calculation}.`;
    update();
  }
  document.getElementById('nouvelle-galaxie').addEventListener('click', newGalaxy);
  document.getElementById('passer-tour').addEventListener('click', () => { state.selectedId = null; state.activePlayer = state.activePlayer === 'blue' ? 'red' : 'blue'; state.lastMessage = 'Tour passé.'; update(); });
  document.getElementById('effacer-selection').addEventListener('click', () => { state.selectedId = null; state.lastMessage = 'Sélection annulée.'; update(); });
  globalThis.IntergalactiqueApp = Object.freeze({ selectPiece, selectCrossing, showNetworkValue, showStationValue });
  newGalaxy();
})();
