(() => {
  function attachments(state, pieceId) {
    return [...state.links.values()].filter(link => link.a === pieceId || link.b === pieceId);
  }

  function connectedNetwork(state, startId) {
    const start = state.pieces.get(startId);
    if (!start?.owner) return { owner: null, pieces: [], links: [], value: 0 };
    const seenPieces = new Set();
    const seenLinks = new Set();
    const pending = [startId];
    while (pending.length) {
      const id = pending.shift();
      const piece = state.pieces.get(id);
      if (!piece || seenPieces.has(id) || piece.owner !== start.owner) continue;
      seenPieces.add(id);
      attachments(state, id).forEach(link => {
        if (link.owner !== start.owner) return;
        const otherId = link.a === id ? link.b : link.a;
        const other = state.pieces.get(otherId);
        if (!other || other.owner !== start.owner) return;
        seenLinks.add(link.id);
        if (!seenPieces.has(otherId)) pending.push(otherId);
      });
    }
    const pieces = [...seenPieces].map(id => state.pieces.get(id));
    const links = [...seenLinks].map(id => state.links.get(id));
    return { owner: start.owner, pieces, links, value: networkValue(state, pieces) };
  }

  function pieceValue(state, piece) { return state.config.values[piece.type]; }
  function networkValue(state, pieces) {
    return pieces.reduce((total, piece) => total + pieceValue(state, piece), 0);
  }
  // La force d'attaches ne compte que les éléments directement reliés à la pièce.
  function attachmentDetails(state, pieceId) {
    const piece = state.pieces.get(pieceId);
    if (!piece?.owner) return { values: [], virtualCount: 0, value: 0 };
    const values = attachments(state, pieceId)
      .filter(link => link.owner === piece.owner)
      .map(link => {
        const otherId = link.a === pieceId ? link.b : link.a;
        const other = state.pieces.get(otherId);
        return other?.owner === piece.owner ? pieceValue(state, other) : null;
      })
      .filter(value => value !== null);
    const virtualCount = piece.type === 'planet' && values.length === 0 ? 1 : 0;
    if (virtualCount) values.push(state.config.values.station);
    return { values, virtualCount, value: values.reduce((total, value) => total + value, 0) };
  }
  function attachmentsValue(state, pieceId) {
    return attachmentDetails(state, pieceId).value;
  }
  function attachmentCount(state, pieceId) {
    const piece = state.pieces.get(pieceId);
    if (!piece?.owner) return 0;
    return attachments(state, pieceId).filter(link => {
      if (link.owner !== piece.owner) return false;
      const otherId = link.a === pieceId ? link.b : link.a;
      return state.pieces.get(otherId)?.owner === piece.owner;
    }).length;
  }
  function isLinkedToCenter(state, pieceId) {
    const network = connectedNetwork(state, pieceId);
    return network.pieces.some(piece => piece.type === 'center' && piece.owner === network.owner);
  }
  function attackerStationPower(state, pieceId) {
    const network = connectedNetwork(state, pieceId);
    if (isLinkedToCenter(state, pieceId)) return { type: 'network', value: network.value };
    return { type: 'attachments', value: attachmentDetails(state, pieceId).values.length };
  }
  function defenderPlanetPower(state, pieceId) {
    const network = connectedNetwork(state, pieceId);
    if (isLinkedToCenter(state, pieceId)) return { type: 'network', value: network.value };
    return { type: 'attachments', value: attachmentDetails(state, pieceId).values.length };
  }
  function battleAttachmentCount(state, pieceId) {
    return attachmentDetails(state, pieceId).values.length;
  }
  function potentialScores(state) {
    return ['blue', 'red'].reduce((scores, owner) => {
      scores[owner] = [...state.pieces.values()]
        .filter(piece => piece.owner === owner)
        .reduce((total, piece) => total + pieceValue(state, piece), 0);
      return scores;
    }, {});
  }

  globalThis.NetworkEngine = Object.freeze({ attachments, connectedNetwork, pieceValue, networkValue, attachmentDetails, attachmentsValue, attachmentCount, isLinkedToCenter, attackerStationPower, defenderPlanetPower, battleAttachmentCount, potentialScores });
})();
