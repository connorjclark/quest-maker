import 'regenerator-runtime/runtime' // ??? why is this needed now?

import * as constants from './constants';
import { EditorMode } from './editor-mode';
import { PlayGameMode } from './play-game-mode';
import { QuestMakerApp } from './quest-maker-app';
import { TileType, EnemyType } from './types';
import makeQuest from './make-quest';
import { State } from 'pixi.js';

const { screenWidth, screenHeight, tileSize } = constants;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const pixi = new PIXI.Application();
pixi.renderer.backgroundColor = 0xaaaaaa;
document.body.appendChild(pixi.view);

// TODO: why is this a class?
class Screen {
  public tiles: { tile: number }[][] = [];
  public enemies: QuestMaker.Screen['enemies'] = [];
  public warps = {};

  constructor() {
    for (let x = 0; x < screenWidth; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < screenHeight; y++) {
        let tile = 0;
        if (Math.random() > 0.8 && x * y != 0 && x !== screenWidth - 1 && y !== screenHeight - 1) tile = 1;
        if (x > screenWidth / 2 - 2 && x < screenWidth / 2 + 2 && y > screenHeight / 2 - 2 && y < screenHeight / 2 + 2) tile = 0;
        this.tiles[x][y] = { tile };
      }
    }

    // Hardcode enemies.
    const num = 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < num; i++) {
      const enemyId = Math.floor(Math.random() * 5);
      this.enemies.push({ enemyId });
    }
  }
}

function createQuest(): QuestMaker.Quest {
  const { make, makeAdvanced, makeEnemy, makeGraphic, makeTile, makeWeapon, quest } = makeQuest();

  const basicTiles = make({
    tile: true,
    file: 'tiles.png',
    n: 48,
    tilesInRow: 6,
    startX: 1,
    startY: 1,
    spacing: 1,
  }).tiles;
  for (const tile of basicTiles) {
    if ([1, 3, 4, 5, 7, 8].includes(basicTiles.indexOf(tile))) {
      tile.walkable = [false, false, false, false];
    } else {
      tile.walkable = [true, true, true, true];
    }
  }

  const HERO_BASIC_GFX = make({
    tile: false,
    file: 'link.png',
    n: 6,
    startX: 1,
    startY: 11,
    spacing: 1,
  }).graphics;
  const HERO_USE_ITEM_GFX = make({
    tile: false,
    file: 'link.png',
    n: 3,
    startX: 107,
    startY: 11,
    spacing: 1,
  }).graphics;

  const swordGraphics = makeAdvanced({
    tile: false,
    file: 'link.png',
    n: 3 * 4,
    width: [tileSize / 2, tileSize, tileSize / 2],
    height: [tileSize],
    startX: 1,
    startY: 154,
    spacing: 1,
  }).graphics;

  makeWeapon({
    name: 'Sword',
    graphic: swordGraphics[0].id,
  });

  const spawnGraphics = make({
    tile: false,
    file: 'link.png',
    n: 3,
    startX: 138,
    startY: 185,
    spacing: 1,
  }).graphics;

  const enemyGraphics = make({
    tile: false,
    file: 'enemies.png',
    n: 19 * 13,
    tilesInRow: 19,
  }).graphics;

  enemyGraphics[4].width = tileSize / 2;
  const rockWeapon = makeWeapon({
    name: 'Rock',
    graphic: enemyGraphics[4].id,
  });

  const arrowWeapon = makeWeapon({
    name: 'Arrow',
    graphic: enemyGraphics[9].id,
    rotate: true,
  });

  const subarray = <T>(arr: T[], start: number, num: number) => arr.slice(start, start + num);

  let gfx = subarray(enemyGraphics, 0, 4);
  makeEnemy({
    name: 'Octorok (Red)',
    attributes: {
      'enemy.halt': 3 / 16,
      'enemy.weapon': rockWeapon.id,
    },
    frames: {
      down: [gfx[0].id, gfx[1].id],
      left: [gfx[2].id, gfx[3].id],
    },
  });

  gfx = subarray(enemyGraphics, 19, 4);
  makeEnemy({
    name: 'Octorok (Blue)',
    attributes: {
      'enemy.halt': 5 / 16,
      'enemy.directionChange': 6 / 16,
      'enemy.homing': 128 / 255,
      'enemy.speed': 1,
      'enemy.weapon': rockWeapon.id,
    },
    frames: {
      down: [gfx[0].id, gfx[1].id],
      left: [gfx[2].id, gfx[3].id],
    },
  });

  gfx = subarray(enemyGraphics, 5, 4);
  makeEnemy({
    name: 'Moblin',
    attributes: {
      'enemy.halt': 3 / 16,
      'enemy.weapon': arrowWeapon.id,
    },
    frames: {
      down: [gfx[0].id],
      up: [gfx[1].id],
      right: [gfx[2].id, gfx[3].id],
    },
  });

  gfx = subarray(enemyGraphics, 3 * 19, 5);
  makeEnemy({
    name: 'Leever',
    type: EnemyType.LEEVER,
    attributes: {
      'enemy.homing': 0,
      'enemy.directionChange': 0,
      'enemy.leever.emergeStyle': 'in-place',
    },
    frames: {
      moving: [gfx[3].id, gfx[4].id],
      emerging: [gfx[0].id, gfx[1].id, gfx[2].id],
    },
  });

  gfx = subarray(enemyGraphics, 4 * 19, 5);
  const prevEmerging = quest.enemies[quest.enemies.length - 1].frames.emerging;
  makeEnemy({
    name: 'Blue Leever',
    type: EnemyType.LEEVER,
    attributes: {
      'enemy.homing': 0,
      'enemy.directionChange': 0,
      'enemy.leever.emergeStyle': 'in-place',
    },
    frames: {
      moving: [gfx[3].id, gfx[4].id],
      emerging: [prevEmerging[0], prevEmerging[1], gfx[2].id],
    },
  });

  quest.maps.push({ screens: [] });
  for (let x = 0; x < 16; x++) {
    quest.maps[0].screens[x] = [];
    for (let y = 0; y < 9; y++) {
      quest.maps[0].screens[x].push(new Screen());
    }
  }

  // Make ground tile first.
  let temp = quest.tiles[0];
  quest.tiles[0] = quest.tiles[2];
  quest.tiles[2] = temp;

  // Set ids manually (fixes manually swapped tile ids)
  for (let i = 0; i < quest.tiles.length; i++) quest.tiles[i].id = i;

  // Stairs.
  quest.tiles[2].type = TileType.WARP;

  quest.maps[0].screens[0][0].tiles[9][7].tile = 2;

  quest.tiles = [...quest.tiles, ...quest.tiles, ...quest.tiles, ...quest.tiles];

  quest.misc.SPAWN_GFX_START = spawnGraphics[0].id;
  const heroGraphicId = HERO_BASIC_GFX[0].id;

  // TODO: handle directions better?
  quest.misc.HERO_FRAMES = {
    down: { graphicIds: [heroGraphicId, heroGraphicId + 1] },
    up: { graphicIds: [heroGraphicId + 4, heroGraphicId + 5] },
    right: { graphicIds: [heroGraphicId + 2, heroGraphicId + 3] },
    left: { graphicIds: [heroGraphicId + 2, heroGraphicId + 3], flip: true },
    'useItem-down': { graphicIds: [heroGraphicId + 6] },
    'useItem-right': { graphicIds: [heroGraphicId + 7] },
    'useItem-left': { graphicIds: [heroGraphicId + 7], flip: true },
    'useItem-up': { graphicIds: [heroGraphicId + 8], flip: true },
  };

  quest.dmaps = [
    { name: 'Overworld', map: 0, color: 0, song: 0 },
  ];

  return quest;
}

async function load1stQuest() {
  const questResp = await fetch('/quests/1st/quest.json');
  const quest = await questResp.json();
  questBasePath = '/quests/1st';
  return quest;
}

// TODO: real quest loading/saving.
async function loadQuest(): Promise<QuestMaker.Quest> {
  if (window.location.search.includes('1st')) {
    return load1stQuest();
  }

  if (window.location.search.includes('fresh')) return createQuest();
  if (window.location.search.includes('basic')) return createQuest();

  return load1stQuest();

  // Disabled until there is UI.
  // const json = localStorage.getItem('quest');
  // if (json) {
  //   // return JSON.parse(json);
  //   return createQuest();
  // } else {
  //   return createQuest();
  // }
}

function deleteQuest() {
  localStorage.clear();
  // @ts-ignore
  window.app.state.quest = createQuest();
  window.location.reload();
}

function saveQuest(quest: QuestMaker.Quest) {
  return; // Disabled until there is UI.

  if (window.location.search.includes('fresh')) return;
  localStorage.setItem('quest', JSON.stringify(quest));
}
// @ts-ignore
window.save = () => saveQuest(window.app.state.quest);
// @ts-ignore
window.deleteQuest = deleteQuest;
// @ts-ignore
// window.addEventListener('unload', window.save);
// @ts-ignore
// setInterval(window.save, 1000 * 60);

let questBasePath = '/quests/debug';
async function load() {
  const quest = await loadQuest();

  // Find images to load.
  const images = new Set<string>();
  for (const graphic of quest.graphics) {
    images.add(graphic.file);
  }

  for (const image of images) {
    pixi.loader.add(image, `${questBasePath}/${image}`);
  }
  await new Promise(resolve => pixi.loader.load(resolve));

  const initialDmap = 0;
  const initialMap = quest.dmaps[initialDmap].map;
  const state: QuestMaker.State = {
    quest,
    editor: {
      isPlayTesting: false,
      currentTile: 0,
    },
    game: {
      screenStates: new Map(),
      inventory: [],
      equipped: [null, null],
    },
    dmapIndex: initialDmap,
    mapIndex: initialMap,
    screenX: quest.misc.START_X,
    screenY: quest.misc.START_Y,
    currentMap: quest.maps[initialMap],
    currentScreen: quest.maps[initialMap].screens[quest.misc.START_X][quest.misc.START_Y],
  };

  const app = new QuestMakerApp(pixi, state);
  editorMode = new EditorMode(app);
  app.questBasePath = questBasePath;

  // TODO: move to engine.
  document.body.onkeydown = (e) => {
    app.keys.down[e.code] = true;
    app.keys.pressed[e.code] = true;
  };
  document.body.onkeyup = (e) => {
    delete app.keys.down[e.code];
    app.keys.up[e.code] = true;
    app.keys.pressed[e.code] = false;
  };

  pixi.ticker.add(dt => tick(app, dt));
  app.setMode(editorMode);

  // @ts-ignore
  window.app = app;
}

let editorMode: EditorMode;
function tick(app: QuestMaker.App, dt: number) {
  if (app.keys.down['ShiftLeft'] || app.keys.down['ShiftRight']) {
    if (app.state.editor.isPlayTesting) {
      app.setMode(editorMode);
    } else {
      // Bit of a hack.
      const matchingDmapIndex = app.state.quest.dmaps.findIndex(dmap => dmap.map === app.state.mapIndex);
      if (matchingDmapIndex !== -1) app.state.dmapIndex = matchingDmapIndex;

      app.setMode(new PlayGameMode(app));
    }
    app.state.editor.isPlayTesting = !app.state.editor.isPlayTesting;
  }

  app.tick(dt);
}

load();
