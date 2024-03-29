import 'regenerator-runtime/runtime' // ??? why is this needed now?

import * as constants from './constants';
import { EditorMode } from './editor-mode';
import { PlayGameMode } from './play-game-mode';
import { QuestMakerApp } from './quest-maker-app';
import { TileType, EnemyType, ItemType } from './types';
import makeQuest from './make-quest';
import { makeUI } from './ui/QuestMaker';

const { screenWidth, screenHeight, tileSize } = constants;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

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
  quest.items.push({
    type: ItemType.SWORD,
    tile: swordGraphics[0].id,
    name: 'Sword',
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
  const prevEmerging = quest.enemies[quest.enemies.length - 1].frames?.emerging || [];
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
    walk: [
      {
        gfxs: [heroGraphicId + 4, heroGraphicId + 5],
        flip: 0,
      },
      {
        gfxs: [heroGraphicId, heroGraphicId + 1],
        flip: 0,
      },
      {
        gfxs: [heroGraphicId + 2, heroGraphicId + 3],
        flip: 1,
      },
      {
        gfxs: [heroGraphicId + 2, heroGraphicId + 3],
        flip: 0,
      },
    ],
    stab: [
      {
        gfxs: [heroGraphicId + 8],
        flip: 0,
      },
      {
        gfxs: [heroGraphicId + 6],
        flip: 0,
      },
      {
        gfxs: [heroGraphicId + 7],
        flip: 1,
      },
      {
        gfxs: [heroGraphicId + 7],
        flip: 0,
      },
    ],
    // down: { graphicIds: [heroGraphicId, heroGraphicId + 1] },
    // up: { graphicIds: [heroGraphicId + 4, heroGraphicId + 5] },
    // right: { graphicIds: [heroGraphicId + 2, heroGraphicId + 3] },
    // left: { graphicIds: [heroGraphicId + 2, heroGraphicId + 3], flip: true },
    // 'useItem-down': { graphicIds: [heroGraphicId + 6] },
    // 'useItem-right': { graphicIds: [heroGraphicId + 7] },
    // 'useItem-left': { graphicIds: [heroGraphicId + 7], flip: true },
    // 'useItem-up': { graphicIds: [heroGraphicId + 8], flip: true },
  };

  quest.dmaps = [
    { name: 'Overworld', map: 0, color: 0, song: 0 },
  ];

  return quest;
}

// TODO: real quest loading/saving.
async function loadQuest(path: string): Promise<QuestMaker.Quest> {
  if (path === 'quests/debug') return createQuest();

  const questResp = await fetch(`${path}/quest.json`);
  const quest = await questResp.json();
  return quest;

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

}
// @ts-ignore
window.save = () => saveQuest(window.app.state.quest);
// @ts-ignore
window.deleteQuest = deleteQuest;
// @ts-ignore
// window.addEventListener('unload', window.save);
// @ts-ignore
// setInterval(window.save, 1000 * 60);

function getLocalStorage() {
  const json = localStorage.getItem('lastState');
  if (!json) return {};

  const lastStateByQuest = JSON.parse(json);
  const isObject = (obj: any) => obj && obj.constructor && obj.constructor === Object;
  if (!isObject(lastStateByQuest)) return {};

  return lastStateByQuest;
}

function saveLocalStorage(data: any) {
  localStorage.setItem('lastState', JSON.stringify(data));
}

async function load(quest: QuestMaker.Quest, questBasePath: string) {
  const pixi = new PIXI.Application({
    transparent: true,
  });

  // Find images to load.
  const images = new Set<string>();
  for (const graphic of quest.graphics) {
    images.add(graphic.file);
  }

  for (const image of images) {
    pixi.loader.add(image, `${questBasePath}/${image}`);
  }
  await new Promise(resolve => pixi.loader.load(resolve));

  let initialDmap = 0;
  let initialScreenX = quest.misc.START_X;
  let initialScreenY = quest.misc.START_Y;

  // Simple code to quickly persist last screen position.
  if (localStorage.getItem('lastState')) {
    const lastStateByQuest = getLocalStorage();
    const lastState = lastStateByQuest[questBasePath];
    if (lastState && 'dmapIndex' in lastState && quest.dmaps[lastState.dmapIndex] && quest.dmaps[lastState.dmapIndex]) {
      initialDmap = lastState.dmapIndex;
      initialScreenX = lastState.screenX;
      initialScreenY = lastState.screenY;
    }
  }
  window.addEventListener('unload', () => {
    const { dmapIndex, screenX, screenY } = state;
    const lastStateByQuest = getLocalStorage();
    lastStateByQuest[questBasePath] = { dmapIndex, screenX, screenY };
    saveLocalStorage(lastStateByQuest);
  });

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
    screenX: initialScreenX,
    screenY: initialScreenY,
    // TODO: make these getters.
    currentMap: quest.maps[initialMap],
    currentScreen: quest.maps[initialMap].screens[initialScreenX][initialScreenY],
  };

  if (questBasePath === 'quests/debug') {
    const swordIndex = quest.items.findIndex(item => item.name === 'Sword');
    state.game.inventory[0] = {item: swordIndex};
    state.game.equipped[1] = 0;
  }

  const app = new QuestMakerApp(pixi, state, ui);
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

  window.app = app;

  ui.actions.setQuest(quest);
  ui.actions.setCurrentScreen(state.screenX, state.screenY);
  ui.actions.setCurrentMap(state.currentMap);

  ui.subscribe((state) => {
    if (state.currentMap) app.state.currentMap = state.currentMap;
    app.state.screenX = state.screenX;
    app.state.screenY = state.screenY;
    app.state.currentScreen = app.state.currentMap.screens[app.state.screenX][app.state.screenY];
    app.state.editor.currentTile = state.selectedTile?.id || 0;
  });

  window.addEventListener('resize', () => app.resize());
  app.resize();
}

let editorMode: EditorMode;
function tick(app: QuestMaker.App, dt: number) {
  if (app.keys.down['ShiftLeft'] || app.keys.down['ShiftRight']) {
    app.destroyChildren(app.pixi.stage);

    if (app.state.editor.isPlayTesting) {
      app.setMode(editorMode);
      ui.actions.setCurrentScreen(app.state.screenX, app.state.screenY);
      ui.actions.setCurrentMap(app.state.currentMap);
      ui.actions.setMode('edit');
    } else {
      app.destroyChildren(app.pixi.stage);
      app.state.game.screenTransition = app.state.game.warpReturnTransition = undefined;

      // Bit of a hack.
      const matchingDmapIndex = app.state.quest.dmaps.findIndex(dmap => dmap.map === app.state.mapIndex);
      if (matchingDmapIndex !== -1) app.state.dmapIndex = matchingDmapIndex;

      const mode = new PlayGameMode(app);
      if (window.IS_DEV) {
        const swordId = app.state.quest.items.findIndex(item => item.type === ItemType.SWORD);
        if (swordId !== -1) mode.pickupItem(swordId);
      }
      app.setMode(mode);
      ui.actions.setMode('play');
    }

    app.state.editor.isPlayTesting = !app.state.editor.isPlayTesting;
  }

  app.tick(dt);
}

window.IS_DEV = new URLSearchParams(window.location.search).has('dev');
// @ts-ignore
window.debugScreen = () => {
  if (!window.app) return;

  const app = window.app;
  const state = app.state;
  console.log({ map: state.mapIndex, x: state.screenX, y: state.screenY });
  console.log({
    ...state.currentScreen,
    enemies: state.currentScreen.enemies.map(e => state.quest.enemies[e.enemyId]),
  });
};

async function selectQuest(questPath: string) {
  const quest = await loadQuest(questPath);
  const url = new URL(location.href);
  url.search = `quest=${questPath}`;
  history.replaceState({}, '', url.toString());
  // selectQuestEl.value = questPath;
  load(quest, questPath);
}

const searchParams = new URLSearchParams(location.search);
const searchParamsObj = {
  quest: searchParams.get('quest'),
}
selectQuest(searchParamsObj.quest || 'quests/1st');

const ui = makeUI(document.body);
