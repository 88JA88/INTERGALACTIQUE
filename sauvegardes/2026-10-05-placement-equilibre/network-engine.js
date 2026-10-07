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
  function attachmentsValue(state, pieceId) {
    const piece = state.pieces.get(pieceId);
    if (!piece?.owner) return 0;
    return attachments(state, pieceId)
      .filter(link => link.owner === piece.owner)
      .reduce((total, link) => {
        const otherId = link.a === pieceId ? link.b : link.a;
        const other = state.pieces.get(otherId);
        return total + (other?.owner === piece.owner ? pieceValue(state, other) : 0);
      }, 0);
  }
  function powerForBattle(state, pieceId) {
    const network = connectedNetwork(state, pieceId);
    const linkedToCenter = network.pieces.some(piece => piece.type === 'center' && piece.owner === network.owner);
    if (linkedToCenter) return { type: 'network', value: network.value };
    return { type: 'attachments', value: attachmentsValue(state, pieceId) };
  }
  function potentialScores(state) {
    return ['blue', 'red'].reduce((scores, owner) => {
      scores[owner] = [...state.pieces.values()]
        .filter(piece => piece.owner === owner)
        .reduce((total, piece) => total + pieceValue(state, piece), 0);
      return scores;
    }, {});
  }

  globalThis.NetworkEngine = Object.freeze({ attachments, connectedNetwork, pieceValue, networkValue, attachmentsValue, powerForBattle, potentialScores });
})();
