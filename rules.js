(() => {
  const { key, linkKey, addPiece, addLink, removeLink } = GameState;

  function neighbours(state, piece) {
    const candidates = [[piece.x - 1, piece.y], [piece.x + 1, piece.y], [piece.x, piece.y - 1], [piece.x, piece.y + 1]];
    return candidates
      .filter(([x, y]) => x >= 0 && y >= 0 && x < state.config.width && y < state.config.height)
      .map(([x, y]) => state.pieces.get(key(x, y)) || { id: key(x, y), x, y, type: 'empty', owner: null });
  }

  function canConnectDiagonalSquare(state, source, target) {
    if (!target || target.owner !== source.owner) return false;
    if (Math.abs(target.x - source.x) !== 1 || Math.abs(target.y - source.y) !== 1) return false;
    const otherCornerA = state.pieces.get(key(source.x, target.y));
    const otherCornerB = state.pieces.get(key(target.x, source.y));
    return otherCornerA?.owner === source.owner && otherCornerB?.owner === source.owner;
  }

  function createStation(state, source, destination) {
    const station = addPiece(state, { id: destination.id, x: destination.x, y: destination.y, type: 'station', owner: source.owner, initialOwner: null, created: true });
    addLink(state, source.id, station.id, source.owner);
    return { ok: true, message: 'Station spatiale construite.' };
  }

  function moveCenter(state, centerId, targetId) {
    const center = state.pieces.get(centerId);
    if (!center || center.type !== 'center' || center.owner !== state.activePlayer) return { ok: false, message: 'Choisissez votre Centre galactique.' };
    if (state.pieces.has(targetId)) return { ok: false, message: 'Ce croisement est déjà occupé.' };
    const [x, y] = targetId.split(':').map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= state.config.width || y >= state.config.height) return { ok: false, message: 'Croisement invalide.' };
    const distanceX = Math.abs(center.x - x);
    const distanceY = Math.abs(center.y - y);
    if ((distanceX === 0 && distanceY === 0) || distanceX > 1 || distanceY > 1) return { ok: false, message: 'Le Centre doit être déplacé sur un croisement immédiatement voisin.' };
    // Le Centre laisse une Station à son point de départ : les anciens
    // segments gardent ainsi exactement leurs deux extrémités, puis la
    // nouvelle liaison prolonge le réseau jusqu'au nouveau Centre.
    addPiece(state, {
      id: center.id,
      x: center.x,
      y: center.y,
      type: 'station',
      owner: center.owner,
      initialOwner: null,
      created: true
    });
    addPiece(state, {
      ...center,
      id: targetId,
      x,
      y
    });
    addLink(state, centerId, targetId, center.owner);
    return { ok: true, message: 'Centre galactique déplacé.' };
  }

  // Règle volontairement isolée : elle pourra évoluer sans toucher au moteur de réseau.
  function conquerNeutralPlanet(state, source, planet) {
    planet.owner = source.owner;
    planet.created = false;
    addLink(state, source.id, planet.id, source.owner);
    return { ok: true, message: 'Planète verte conquise.' };
  }

  function removeOldAttachments(state, target) {
    NetworkEngine.attachments(state, target.id).forEach(link => removeLink(state, link.id));
  }

  function removeOrphanStations(state) {
    const removed = [];
    [...state.pieces.values()].forEach(piece => {
      if (piece.type !== 'station' || NetworkEngine.attachments(state, piece.id).length) return;
      state.pieces.delete(piece.id);
      removed.push(piece);
    });
    return removed;
  }

  function calculateBattle(state, source, target) {
    const attackPower = source.type === 'station'
      ? NetworkEngine.attackerStationPower(state, source.id)
      : { type: 'attachments', value: NetworkEngine.battleAttachmentCount(state, source.id) };
    const defensePower = target.type === 'planet'
      ? NetworkEngine.defenderPlanetPower(state, target.id)
      : { type: 'attachments', value: NetworkEngine.battleAttachmentCount(state, target.id) };
    return {
      attackType: attackPower.type,
      defenseType: defensePower.type,
      attack: attackPower.value,
      defense: defensePower.value
    };
  }

  function connectAllies(state, source, target) {
    if (state.links.has(linkKey(source.id, target.id))) {
      return { ok: false, message: 'Ces deux possessions sont déjà directement reliées.' };
    }
    addLink(state, source.id, target.id, source.owner);
    return { ok: true, message: 'Possessions alliées reliées.' };
  }

  function resolveAttack(state, source, target) {
    const battle = calculateBattle(state, source, target);
    const sourceLinkedToCenter = NetworkEngine.isLinkedToCenter(state, source.id);
    const targetLinkedToCenter = NetworkEngine.isLinkedToCenter(state, target.id);
    const label = `${battle.attackType === 'network' ? 'Réseau' : 'Attaches'} contre ${battle.defenseType === 'network' ? 'réseau' : 'attaches'}`;
    if (battle.attack <= battle.defense) {
      removeOldAttachments(state, source);
      source.owner = target.owner;
      const removedStations = removeOrphanStations(state);
      const disappearance = removedStations.length ? ` ${removedStations.length} Station${removedStations.length > 1 ? 's' : ''} isolée${removedStations.length > 1 ? 's' : ''} ${removedStations.length > 1 ? 'disparaissent' : 'disparaît'}.` : '';
      const winner = source.type === 'center' && targetLinkedToCenter ? target.owner : null;
      const centerCapture = source.type === 'center'
        ? winner ? ' Le Centre galactique attaquant est capturé par un réseau relié à son Centre.' : ' Le Centre galactique attaquant est capturé, mais le réseau vainqueur n’est pas relié à son Centre : la partie continue.'
        : '';
      return { ok: true, winner, visualEffect: { owner: target.owner, x: target.x, y: target.y }, message: `Attaque perdue — ${label} : ${battle.attack} contre ${battle.defense}. La possession attaquante est conquise et perd ses attaches.${centerCapture}${disappearance}` };
    }
    removeOldAttachments(state, target);
    target.owner = source.owner;
    target.created = target.type === 'station' || target.created;
    addLink(state, source.id, target.id, source.owner);
    const removedStations = removeOrphanStations(state);
    const disappearance = removedStations.length ? ` ${removedStations.length} Station${removedStations.length > 1 ? 's' : ''} isolée${removedStations.length > 1 ? 's' : ''} ${removedStations.length > 1 ? 'disparaissent' : 'disparaît'}.` : '';
    const winner = target.type === 'center' && sourceLinkedToCenter ? source.owner : null;
    const centerCapture = target.type === 'center'
      ? winner ? ' Centre galactique adverse capturé par un réseau relié à son Centre.' : ' Centre galactique adverse capturé, mais le réseau attaquant n’est pas relié à son Centre : la partie continue.'
      : '';
    return { ok: true, winner, visualEffect: { owner: source.owner, x: target.x, y: target.y }, message: `Victoire — ${label} : ${battle.attack} contre ${battle.defense}. Les anciennes attaches sont supprimées.${centerCapture}${disappearance}` };
  }

  function performMove(state, sourceId, targetId) {
    const source = state.pieces.get(sourceId);
    if (!source || source.owner !== state.activePlayer) return { ok: false, message: 'Choisissez une possession de votre camp.' };
    const target = neighbours(state, source).find(candidate => candidate.id === targetId);
    if (!target) {
      const diagonalTarget = state.pieces.get(targetId);
      if (canConnectDiagonalSquare(state, source, diagonalTarget)) return connectAllies(state, source, diagonalTarget);
      return { ok: false, message: 'Choisissez un voisin orthogonal, ou une diagonale d’un carré allié complet.' };
    }
    if (target.type === 'empty') return createStation(state, source, target);
    if (target.owner === null && target.type === 'planet') return conquerNeutralPlanet(state, source, target);
    if (target.owner === source.owner) return connectAllies(state, source, target);
    return resolveAttack(state, source, target);
  }

  globalThis.GameRules = Object.freeze({ neighbours, canConnectDiagonalSquare, moveCenter, performMove, conquerNeutralPlanet, calculateBattle, connectAllies, removeOrphanStations, resolveAttack });
})();
