(() => {
  const DEFAULT_CONFIG = Object.freeze({
    width: 10,
    height: 10,
    planets: { blue: 3, red: 3, green: 3 },
    values: { center: 5, planet: 3, station: 1 }
  });

  globalThis.IntergalactiqueConfig = Object.freeze({ DEFAULT_CONFIG });
})();
