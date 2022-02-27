function bit(flag: number, index: number) {
  return (flag & (1 << index)) !== 0;
}

function read(flagIndex: number, bitIndex: number) {
  return (flags: number[]) => bit(flags[flagIndex], bitIndex);
}

export const ScreenFlags = {
  shutters: read(0, 0),
  /**
   * If not set, item will appear right away.
   * Otherwise only appears after enemies killed / secrets revealed (based on other flags).
   */
  item: read(0, 1),
  dark: read(0, 2),
  roar: read(0, 3),
  whistle: read(0, 4),
  ladder: read(0, 5),
  maze: read(0, 6),
  sea: read(0, 7),

  up: read(1, 0),
  down: read(1, 1),
  left: read(1, 2),
  right: read(1, 3),
  playSecretSfxOnEntry: read(1, 4),
  airCombos: read(1, 5),
  floatTraps: read(1, 6),
  killAllEnemiesForSecrets: read(1, 7),

  holdUpItem: read(2, 0),
  cycleOnInit: read(2, 1),
  invisibleRoom: read(2, 2),
  invisibleHero: read(2, 3),
  noSubscreen: read(2, 4),
  warpFullscreen: read(2, 5),
  noSubscreenOffset: read(2, 6),
  enemiesReturn: read(2, 7),

  overheadText: read(3, 0),
  itemWarp: read(3, 1),
  timedWarpsAreDirect: read(3, 2),
  disableTime: read(3, 3),
  killAllEnemiesForPermamentSecrets: read(3, 4),
  noItemReset: read(3, 5),
  saveRoom: read(3, 6),
  saveOnEntry: read(3, 7),

  // TODO: the rest

  itemIsSecret: read(7, 6),
  pickupItemShowsSecrets: read(7, 7),

  // TODO: the rest
};
