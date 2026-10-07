(() => {
  const DEFAULT_CONFIG = Object.freeze({
    width: 11,
    height: 10,
    planets: { blue: 3, red: 3, green: 3 },
    values: { center: 5, planet: 3, station: 1 },
    movesPerTurn: 2,
    playerMode: 'computer'
  });

  globalThis.IntergalactiqueConfig = Object.freeze({ DEFAULT_CONFIG });
})();
