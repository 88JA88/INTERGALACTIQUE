(() => {
  function key(x, y) { return `${x}:${y}`; }
  function linkKey(a, b) { return [a, b].sort().join('|'); }

  function create(config) {
    return {
      config,
      pieces: new Map(),
      links: new Map(),
      activePlayer: 'blue',
      movesPlayed: 0,
      selectedId: null,
      lastMessage: ''
    };
  }

  function addPiece(state, piece) { state.pieces.set(piece.id, piece); return piece; }
  function addLink(state, a, b, owner) {
    const id = linkKey(a, b);
    state.links.set(id, { id, a, b, owner });
    return state.links.get(id);
  }
  function removeLink(state, id) { state.links.delete(id); }
  function movePiece(state, pieceId, x, y) {
    const piece = state.pieces.get(pieceId);
    const nextId = key(x, y);
    if (!piece || state.pieces.has(nextId)) return null;
    const oldLinks = [...state.links.values()]
      .filter(link => link.a === pieceId || link.b === pieceId)
      .map(link => ({ ...link }));
    oldLinks.forEach(link => removeLink(state, link.id));
    state.pieces.delete(pieceId);
    piece.id = nextId;
    piece.x = x;
    piece.y = y;
    state.pieces.set(nextId, piece);
    oldLinks.forEach(link => addLink(state, link.a === pieceId ? nextId : link.a, link.b === pieceId ? nextId : link.b, link.owner));
    return piece;
  }

  globalThis.GameState = Object.freeze({ key, linkKey, create, addPiece, addLink, removeLink, movePiece });
})();
