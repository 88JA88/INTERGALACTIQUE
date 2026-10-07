(() => {
  function key(x, y) { return `${x}:${y}`; }
  function linkKey(a, b) { return [a, b].sort().join('|'); }

  function create(config) {
    return {
      config,
      pieces: new Map(),
      links: new Map(),
      activePlayer: 'blue',
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

  globalThis.GameState = Object.freeze({ key, linkKey, create, addPiece, addLink, removeLink });
})();
