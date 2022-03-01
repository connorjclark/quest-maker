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

  randomTimedWarp: read(4, 0),
  damageWithBoots: read(4, 1),
  directAWarp: read(4, 2),
  directSWarp: read(4, 3),
  tempSecrets: read(4, 4),
  // skipped
  toggleDiving: read(4, 6),
  noFFCarryover: read(4, 7),

  caveRoom: read(5, 0),
  dungeonRoom: read(5, 1),
  triggerFPerm: read(5, 2),
  continueHere: read(5, 3),
  noContinueHereAfterWarp: read(5, 4),
  triggerF16_31: read(5, 5),
  toggleRingDamage: read(5, 6),
  wrapAroundFF: read(5, 7),

  layer3Background: read(6, 0),
  layer2Background: read(6, 1),
  itemFalls: read(6, 2),
  sideView: read(6, 3),
  noHeroMarker: read(6, 4),
  specialItemMarker: read(6, 5),
  whistlePalette: read(6, 6),
  whistleWater: read(6, 7),

  itemIsSecret: read(7, 6),
  pickupItemShowsSecrets: read(7, 7),

  itemSecretPerm: read(8, 0),
  itemReturn: read(8, 1),
  belowReturn: read(8, 2),
  darkDither: read(8, 3),
  darkTrans: read(8, 4),
  disableMirror: read(8, 5),
};
