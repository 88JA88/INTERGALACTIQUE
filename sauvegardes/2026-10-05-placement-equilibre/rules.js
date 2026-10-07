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

  function calculateBattle(state, source, target) {
    const attackPower = NetworkEngine.powerForBattle(state, source.id);
    const defensePower = NetworkEngine.powerForBattle(state, target.id);
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
    const label = `${battle.attackType === 'network' ? 'Réseau' : 'Attaches'} contre ${battle.defenseType === 'network' ? 'réseau' : 'attaches'}`;
    if (battle.attack <= battle.defense) {
      removeOldAttachments(state, source);
      source.owner = target.owner;
      return { ok: true, message: `Attaque perdue — ${label} : ${battle.attack} contre ${battle.defense}. La possession attaquante est conquise et perd ses attaches.` };
    }
    removeOldAttachments(state, target);
    target.owner = source.owner;
    target.created = target.type === 'station' || target.created;
    addLink(state, source.id, target.id, source.owner);
    return { ok: true, message: `Victoire — ${label} : ${battle.attack} contre ${battle.defense}. Les anciennes attaches sont supprimées.` };
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

  globalThis.GameRules = Object.freeze({ neighbours, canConnectDiagonalSquare, performMove, conquerNeutralPlanet, calculateBattle, connectAllies, resolveAttack });
})();
