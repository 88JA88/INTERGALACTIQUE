(() => {
  const { key, linkKey } = GameState;

  function centerFor(state, owner) {
    return [...state.pieces.values()].find(piece => piece.type === 'center' && piece.owner === owner) || null;
  }

  function centerThreats(state, owner) {
    const center = centerFor(state, owner);
    if (!center) return { center: null, threats: [] };
    const threats = GameRules.neighbours(state, center)
      .filter(piece => piece.owner && piece.owner !== owner && NetworkEngine.isLinkedToCenter(state, piece.id))
      .map(piece => ({ piece, battle: GameRules.calculateBattle(state, piece, center) }));
    return { center, threats };
  }

  // Nombre de pièces qui seraient séparées de leur Centre si la cible perdait
  // ses attaches. Cette mesure repère les possessions-ponts d'un réseau.
  function detachedFromCenterIfRemoved(state, target) {
    if (!target?.owner || target.type === 'center' || !NetworkEngine.isLinkedToCenter(state, target.id)) return 0;
    const center = centerFor(state, target.owner);
    if (!center || center.id === target.id) return 0;
    const network = NetworkEngine.connectedNetwork(state, target.id);
    const reachable = new Set([center.id]);
    const pending = [center.id];
    while (pending.length) {
      const id = pending.shift();
      NetworkEngine.attachments(state, id).forEach(link => {
        if (link.owner !== target.owner) return;
        const otherId = link.a === id ? link.b : link.a;
        const other = state.pieces.get(otherId);
        if (!other || other.id === target.id || other.owner !== target.owner || reachable.has(otherId)) return;
        reachable.add(otherId);
        pending.push(otherId);
      });
    }
    return network.pieces.filter(piece => piece.id !== target.id && !reachable.has(piece.id)).length;
  }

  function actionCutsThreat(state, target, threats) {
    return threats.some(({ piece }) => piece.id === target.id || detachedFromCenterIfRemoved(state, target) > 0 && !isStillLinkedWithout(state, piece.id, target.id));
  }

  function isStillLinkedWithout(state, pieceId, removedId) {
    const piece = state.pieces.get(pieceId);
    const center = piece && centerFor(state, piece.owner);
    if (!piece || !center || pieceId === removedId) return false;
    const seen = new Set([center.id]);
    const pending = [center.id];
    while (pending.length) {
      const id = pending.shift();
      NetworkEngine.attachments(state, id).forEach(link => {
        if (link.owner !== piece.owner) return;
        const otherId = link.a === id ? link.b : link.a;
        const other = state.pieces.get(otherId);
        if (!other || other.id === removedId || other.owner !== piece.owner || seen.has(otherId)) return;
        seen.add(otherId);
        pending.push(otherId);
      });
    }
    return seen.has(pieceId);
  }

  function defenseBonus(state, player, source, target) {
    const { center, threats } = centerThreats(state, player);
    if (!center || !threats.length) return 0;
    if (target.owner && target.owner !== player && actionCutsThreat(state, target, threats)) return 180000;
    if (source.id === center.id && target.type === 'empty') return 150000;
    if (target.id === center.id && source.owner === player) return 150000;
    return 0;
  }

  function destroyedAttachments(state, target) {
    return NetworkEngine.attachments(state, target.id)
      .filter(link => link.owner === target.owner)
      .length;
  }

  // Une Station ne doit pas être construite seulement parce qu'elle est la
  // première dans l'ordre des coordonnées : elle doit rapprocher le réseau
  // d'un objectif concret.
  function constructionScore(state, player, source, target) {
    const sourceLinked = NetworkEngine.isLinkedToCenter(state, source.id);
    const sourceNetwork = new Set(NetworkEngine.connectedNetwork(state, source.id).pieces.map(piece => piece.id));
    const objectives = [...state.pieces.values()]
      .map(piece => {
        if (piece.id === source.id) return null;
        // Un réseau allié distinct est une cible de construction prioritaire :
        // le rejoindre augmente immédiatement la force et les possibilités.
        if (piece.owner === player && !sourceNetwork.has(piece.id)) return { piece, weight: 5000, kind: 'network' };
        if (piece.owner === null && piece.type === 'planet') return { piece, weight: 3200 };
        if (piece.owner === player && piece.type === 'center' && !sourceLinked) return { piece, weight: 2600 };
        if (piece.owner === player && piece.type === 'planet' && !NetworkEngine.isLinkedToCenter(state, piece.id)) return { piece, weight: 2200 };
        if (piece.owner && piece.owner !== player && piece.type === 'center') return { piece, weight: 2400 };
        if (piece.owner && piece.owner !== player && piece.type === 'planet') return { piece, weight: 1800 };
        return null;
      })
      .filter(Boolean);
    const closestObjective = objectives.length
      ? Math.min(...objectives.map(({ piece }) => Math.abs(piece.x - source.x) + Math.abs(piece.y - source.y)))
      : Infinity;
    // Sans cible utile proche, le milieu du plateau est une position de
    // rassemblement : il rapproche généralement le réseau de plusieurs fronts.
    const hasSeparateNetwork = objectives.some(objective => objective.kind === 'network');
    if (!hasSeparateNetwork && closestObjective > 4) {
      const middleX = (state.config.width - 1) / 2;
      const middleY = (state.config.height - 1) / 2;
      return 1000 - (Math.abs(middleX - target.x) + Math.abs(middleY - target.y)) * 120;
    }
    return Math.max(10, ...objectives.map(({ piece, weight }) => weight - (Math.abs(piece.x - target.x) + Math.abs(piece.y - target.y)) * 220));
  }

  function actionScore(state, source, target) {
    const defense = defenseBonus(state, source.owner, source, target);
    if (target.type === 'empty') return constructionScore(state, source.owner, source, target) + defense;
    if (target.owner === null && target.type === 'planet') return 10000 + defense;
    if (target.owner === source.owner) {
      if (state.links.has(linkKey(source.id, target.id))) return null;
      const sourceNetwork = NetworkEngine.connectedNetwork(state, source.id);
      const base = sourceNetwork.pieces.some(piece => piece.id === target.id) ? 300 : 9000;
      return base + defense;
    }
    const battle = GameRules.calculateBattle(state, source, target);
    if (battle.attack <= battle.defense) return null;
    if (target.type === 'center') return 200000;
    const detached = detachedFromCenterIfRemoved(state, target);
    if (detached) return 30000 + detached * 100 + defense;
    return 1000 + destroyedAttachments(state, target) * 100 + (battle.attack - battle.defense) * 10 + defense;
  }

  function addMove(actions, state, source, target, kind = 'move') {
    const score = actionScore(state, source, target);
    if (score !== null) actions.push({ kind, sourceId: source.id, targetId: target.id, score });
  }

  function possibleActions(state, player) {
    const actions = [];
    const ownedPieces = [...state.pieces.values()].filter(piece => piece.owner === player);
    ownedPieces.forEach(source => {
      GameRules.neighbours(state, source).forEach(target => addMove(actions, state, source, target));
      if (source.type === 'center') {
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([deltaX, deltaY]) => {
          const x = source.x + deltaX;
          const y = source.y + deltaY;
          if (x < 0 || y < 0 || x >= state.config.width || y >= state.config.height) return;
          const target = state.pieces.get(key(x, y)) || { id: key(x, y), x, y, type: 'empty', owner: null };
          addMove(actions, state, source, target);
        });
      }
      if (source.type !== 'center') {
        ownedPieces.forEach(target => {
          if (target.id === source.id || !GameRules.canConnectDiagonalSquare(state, source, target)) return;
          addMove(actions, state, source, target);
        });
      }
    });

    // Face à une menace immédiate, un déplacement vers une case qui n'est plus
    // attaquable par un réseau adverse relié à son Centre devient prioritaire.
    const center = ownedPieces.find(piece => piece.type === 'center');
    if (center) {
      const threatened = centerThreats(state, player).threats.length > 0;
      for (let y = center.y - 1; y <= center.y + 1; y += 1) for (let x = center.x - 1; x <= center.x + 1; x += 1) {
        if ((x === center.x && y === center.y) || x < 0 || y < 0 || x >= state.config.width || y >= state.config.height) continue;
        const targetId = key(x, y);
        if (!state.pieces.has(targetId)) {
          const safe = ![...state.pieces.values()].some(piece => piece.owner && piece.owner !== player && NetworkEngine.isLinkedToCenter(state, piece.id) && Math.abs(piece.x - x) + Math.abs(piece.y - y) === 1);
          actions.push({ kind: 'move-center', sourceId: center.id, targetId, score: threatened && safe ? 140000 : 1 });
        }
      }
    }
    return actions;
  }

  function chooseAction(state, player) {
    const actions = possibleActions(state, player);
    if (!actions.length) return null;
    const bestScore = Math.max(...actions.map(action => action.score));
    const bestActions = actions.filter(action => action.score === bestScore);
    return bestActions[Math.floor(Math.random() * bestActions.length)];
  }

  globalThis.IntergalactiqueAI = Object.freeze({ possibleActions, chooseAction, centerThreats, detachedFromCenterIfRemoved, constructionScore });
})();
