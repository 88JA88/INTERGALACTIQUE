(() => {
  const { DEFAULT_CONFIG } = IntergalactiqueConfig;
  let state;
  let campaignEnded = false;
  let aiTimer = null;
  const status = document.getElementById('statut');
  const activeLabel = document.getElementById('joueur-actif');
  function number(id) { return Number(document.getElementById(id).value); }
  function configFromForm() {
    return { width: Math.floor(number('largeur')), height: Math.floor(number('hauteur')), planets: { blue: Math.floor(number('planetes-blue')), red: Math.floor(number('planetes-red')), green: Math.floor(number('planetes-green')) }, values: { center: number('valeur-centre'), planet: number('valeur-planete'), station: number('valeur-station') }, movesPerTurn: Math.floor(number('coups-par-tour')), playerMode: document.getElementById('mode-jeu').value };
  }
  function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
  function validConfig(config) {
    if (config.width < 3 || config.height < 3) return 'La grille doit mesurer au minimum 3 × 3.';
    if (config.width % 2 === 0) return 'La largeur de la grille doit être impaire pour centrer les Centres galactiques.';
    if (Object.values(config.planets).some(value => !Number.isInteger(value) || value < 0)) return 'Les nombres de planètes doivent être des entiers positifs.';
    if (Object.values(config.values).some(value => !Number.isFinite(value) || value < 0)) return 'Les valeurs doivent être positives ou nulles.';
    if (!Number.isInteger(config.movesPerTurn) || config.movesPerTurn < 1) return 'Le nombre de coups par tour doit être un entier supérieur ou égal à 1.';
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
  function populate(state) {
    const { width, height, planets } = state.config;
    const centerX = Math.floor(width / 2);
    const redCenter = { x: centerX, y: 0 };
    const blueCenter = { x: centerX, y: height - 1 };
    const northPositions = [];
    const southPositions = [];
    for (let y = 1; y <= height - 2; y += 1) for (let x = 1; x <= width - 2; x += 1) {
      const distanceRed = Math.abs(x - redCenter.x) + Math.abs(y - redCenter.y);
      const distanceBlue = Math.abs(x - blueCenter.x) + Math.abs(y - blueCenter.y);
      if (distanceRed < 2 || distanceBlue < 2) continue;
      const northSide = y < height / 2;
      (northSide ? northPositions : southPositions).push({ x, y });
    }
    const required = planets.blue + planets.red + planets.green;
    const northCount = Math.floor(required / 2);
    const southCount = Math.ceil(required / 2);
    if (northPositions.length < northCount || southPositions.length < southCount) {
      throw new Error('Il n’y a pas assez de croisements au nord et au sud pour répartir les planètes à parts égales.');
    }
    const shuffled = [
      ...shuffle(northPositions).slice(0, northCount),
      ...shuffle(southPositions).slice(0, southCount)
    ];
    const owners = shuffle([
      ...Array(planets.blue).fill('blue'),
      ...Array(planets.red).fill('red'),
      ...Array(planets.green).fill('green')
    ]);
    GameState.addPiece(state, { id: GameState.key(redCenter.x, redCenter.y), ...redCenter, type: 'center', owner: 'red', initialOwner: 'red', created: false });
    GameState.addPiece(state, { id: GameState.key(blueCenter.x, blueCenter.y), ...blueCenter, type: 'center', owner: 'blue', initialOwner: 'blue', created: false });
    shuffled.forEach((position, index) => addInitialPlanet(state, owners[index], position));
  }
  function update() {
    GameRenderer.draw(state); const scores = NetworkEngine.potentialScores(state);
    document.getElementById('score-blue').value = scores.blue; document.getElementById('score-red').value = scores.red;
    document.getElementById('coups-restants').value = state.config.movesPerTurn - state.movesPlayed;
    activeLabel.textContent = state.activePlayer === 'blue' ? 'Zarkon de Véga' : 'Kryssar d’Andromède'; activeLabel.className = state.activePlayer;
    status.textContent = state.lastMessage || `Au tour de ${activeLabel.textContent}.`;
    const computerTurn = isComputerTurn();
    document.getElementById('passer-tour').disabled = campaignEnded || computerTurn;
    document.getElementById('effacer-selection').disabled = campaignEnded || computerTurn;
    document.getElementById('evaluer-campagne').disabled = campaignEnded || computerTurn;
  }
  function isComputerTurn() { return !campaignEnded && state?.config.playerMode === 'computer' && state.activePlayer === 'red'; }
  function scheduleComputerMove() {
    if (!isComputerTurn() || aiTimer) return;
    state.lastMessage = 'Kryssar prépare son coup…';
    update();
    aiTimer = setTimeout(() => {
      aiTimer = null;
      playComputerMove();
    }, 450);
  }
  function passTurn(message = 'Tour passé.') {
    state.selectedId = null;
    state.activePlayer = state.activePlayer === 'blue' ? 'red' : 'blue';
    state.movesPlayed = 0;
    state.lastMessage = message;
    update();
    scheduleComputerMove();
  }
  function playComputerMove() {
    if (!isComputerTurn()) return;
    const action = IntergalactiqueAI.chooseAction(state, 'red');
    if (!action) { passTurn('Kryssar ne dispose d’aucune action et passe son tour.'); return; }
    const result = action.kind === 'move-center'
      ? GameRules.moveCenter(state, action.sourceId, action.targetId)
      : GameRules.performMove(state, action.sourceId, action.targetId);
    if (!result.ok) { passTurn('Kryssar ne peut pas réaliser son action et passe son tour.'); return; }
    finishAction(result);
  }
  function newGalaxy() {
    clearTimeout(aiTimer); aiTimer = null;
    GameRenderer.resetCometCycle();
    const config = configFromForm(); const error = validConfig(config); if (error) { status.textContent = error; return; }
    try {
      state = GameState.create(config);
      campaignEnded = false;
      populate(state);
      state.lastMessage = 'Nouvelle galaxie créée. Zarkon commence.';
      update();
      GameRenderer.startCometCycle();
    } catch (error) { status.textContent = error.message; }
  }
  function finishAction(result) {
    state.selectedId = null;
    state.lastMessage = result.message;
    if (result.ok) {
      GameRenderer.startCometCycle();
      if (result.winner) {
        clearTimeout(aiTimer); aiTimer = null;
        campaignEnded = true;
        state.movesPlayed = 0;
        const winnerName = result.winner === 'blue' ? 'Zarkon de Véga' : 'Kryssar d’Andromède';
        state.lastMessage += ` ${winnerName} remporte la partie.`;
        update();
        GameRenderer.playBattleEffect(state, result.visualEffect);
        showVictory(result.winner);
        return;
      }
      state.movesPlayed += 1;
      if (state.movesPlayed >= state.config.movesPerTurn) {
        state.activePlayer = state.activePlayer === 'blue' ? 'red' : 'blue';
        state.movesPlayed = 0;
        state.lastMessage += ` Tour de ${state.activePlayer === 'blue' ? 'Zarkon de Véga' : 'Kryssar d’Andromède'}.`;
      } else {
        state.lastMessage += ` ${state.config.movesPerTurn - state.movesPlayed} coup restant.`;
      }
    }
    update();
    GameRenderer.playBattleEffect(state, result.visualEffect);
    scheduleComputerMove();
  }
  function showVictory(winner) {
    const winnerName = winner === 'blue' ? 'Zarkon de Véga' : 'Kryssar d’Andromède';
    document.getElementById('titre-decision-campagne').textContent = `Victoire de ${winnerName}`;
    const text = document.getElementById('texte-decision-campagne');
    text.textContent = `${winnerName} a capturé le Centre galactique adverse. La partie est terminée.`;
    text.hidden = false;
    document.getElementById('actions-decision-campagne').hidden = true;
    document.getElementById('bilan-campagne').hidden = true;
    document.getElementById('actions-bilan-campagne').hidden = false;
    document.getElementById('fermer-bilan').textContent = 'Voir la grille finale';
    document.getElementById('decision-campagne').showModal();
  }
  function choose(targetId) {
    if (campaignEnded) return;
    if (isComputerTurn()) { state.lastMessage = 'Kryssar joue actuellement.'; update(); return; }
    if (!state.selectedId) { const piece = state.pieces.get(targetId); if (!piece || piece.owner !== state.activePlayer) { state.lastMessage = 'Choisissez une planète, une station ou votre Centre galactique.'; update(); return; } state.selectedId = piece.id; state.lastMessage = 'Choisissez un croisement voisin ou une cible adverse autorisée.'; update(); return; }
    finishAction(GameRules.performMove(state, state.selectedId, targetId));
  }
  function selectPiece(id) { choose(id); }
  function selectCrossing(id) { choose(id); }
  function moveCenter(centerId, targetId) { if (!campaignEnded && !isComputerTurn()) finishAction(GameRules.moveCenter(state, centerId, targetId)); }
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
  function finishCampaign() {
    clearTimeout(aiTimer); aiTimer = null;
    campaignEnded = true;
    state.selectedId = null;
    const scores = NetworkEngine.potentialScores(state);
    const difference = Math.abs(scores.blue - scores.red);
    const leader = scores.blue === scores.red ? 'Égalité au score potentiel' : `${scores.blue > scores.red ? 'Zarkon de Véga' : 'Kryssar d’Andromède'} mène de ${difference} point${difference === 1 ? '' : 's'}`;
    const countPieces = (owner, type) => [...state.pieces.values()].filter(piece => piece.owner === owner && piece.type === type).length;
    const originalPlanets = [...state.pieces.values()].filter(piece => piece.type === 'planet');
    const blueCaptured = originalPlanets.filter(piece => piece.initialOwner !== 'blue' && piece.owner === 'blue').length;
    const redCaptured = originalPlanets.filter(piece => piece.initialOwner !== 'red' && piece.owner === 'red').length;
    const blueLost = originalPlanets.filter(piece => piece.initialOwner === 'blue' && piece.owner !== 'blue').length;
    const redLost = originalPlanets.filter(piece => piece.initialOwner === 'red' && piece.owner !== 'red').length;
    const blueCenter = [...state.pieces.values()].find(piece => piece.type === 'center' && piece.initialOwner === 'blue');
    const redCenter = [...state.pieces.values()].find(piece => piece.type === 'center' && piece.initialOwner === 'red');
    const ownerName = owner => owner === 'blue' ? 'Zarkon' : owner === 'red' ? 'Kryssar' : 'aucun camp';
    const summary = [
      leader,
      `Score potentiel : Zarkon ${scores.blue} — Kryssar ${scores.red}.`,
      `Planètes possédées : Zarkon ${countPieces('blue', 'planet')} (conquises ${blueCaptured}, perdues ${blueLost}) ; Kryssar ${countPieces('red', 'planet')} (conquises ${redCaptured}, perdues ${redLost}).`,
      `Stations possédées : Zarkon ${countPieces('blue', 'station')} ; Kryssar ${countPieces('red', 'station')}.`,
      `Centres galactiques : Centre de Zarkon détenu par ${ownerName(blueCenter?.owner)} ; Centre de Kryssar détenu par ${ownerName(redCenter?.owner)}.`
    ];
    const report = document.getElementById('bilan-campagne');
    report.replaceChildren();
    const note = document.createElement('p');
    note.textContent = 'Bilan de situation — la victoire s’obtient par la capture du Centre galactique adverse.';
    report.append(note);
    const list = document.createElement('ul');
    summary.forEach(line => { const item = document.createElement('li'); item.textContent = line; list.append(item); });
    report.append(list);
    document.getElementById('titre-decision-campagne').textContent = 'Bilan de la campagne';
    document.getElementById('texte-decision-campagne').hidden = true;
    document.getElementById('actions-decision-campagne').hidden = true;
    report.hidden = false;
    document.getElementById('actions-bilan-campagne').hidden = false;
    state.lastMessage = 'Campagne terminée — bilan affiché.';
    update();
  }
  function openCampaignPrompt() {
    if (campaignEnded || isComputerTurn()) return;
    document.getElementById('titre-decision-campagne').textContent = 'Évaluer la campagne ?';
    document.getElementById('texte-decision-campagne').hidden = false;
    document.getElementById('actions-decision-campagne').hidden = false;
    document.getElementById('bilan-campagne').hidden = true;
    document.getElementById('actions-bilan-campagne').hidden = true;
    document.getElementById('fermer-bilan').textContent = 'Fermer le bilan';
    document.getElementById('decision-campagne').showModal();
  }
  document.getElementById('nouvelle-galaxie').addEventListener('click', newGalaxy);
  document.getElementById('evaluer-campagne').addEventListener('click', openCampaignPrompt);
  document.getElementById('continuer-campagne').addEventListener('click', () => document.getElementById('decision-campagne').close());
  document.getElementById('terminer-campagne').addEventListener('click', finishCampaign);
  document.getElementById('fermer-bilan').addEventListener('click', () => document.getElementById('decision-campagne').close());
  document.getElementById('passer-tour').addEventListener('click', () => { if (campaignEnded || isComputerTurn()) return; passTurn(); });
  document.getElementById('effacer-selection').addEventListener('click', () => { state.selectedId = null; state.lastMessage = 'Sélection annulée.'; update(); });
  globalThis.IntergalactiqueApp = Object.freeze({ selectPiece, selectCrossing, moveCenter, showNetworkValue, showStationValue });
  newGalaxy();
})();
