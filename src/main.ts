import 'regenerator-runtime/runtime' // ??? why is this needed now?

import * as constants from './constants';
import { EditorMode } from './editor-mode';
import { PlayGameMode } from './play-game-mode';
import { QuestMakerApp } from './quest-maker-app';
import { TileType, EnemyType, ItemType } from './types';
import makeQuest from './make-quest';
import { makeUI } from './ui/QuestMaker';
import { readZCQst } from './read-zc-qst';
import { convertZCQst } from './convert-zc-qst';
import { createLandingPage } from './ui/LandingPage';

const { screenWidth, screenHeight, tileSize } = constants;

const searchParams = new URLSearchParams(location.search);
const searchParamsObj = {
  quest: searchParams.get('quest'),
  dev: searchParams.has('dev'),
  zcdebug: searchParams.get('zcdebug'),
  map: searchParams.has('map') ? Number(searchParams.get('map')) : null,
  dmap: searchParams.has('dmap') ? Number(searchParams.get('dmap')) : null,
  x: searchParams.has('x') ? Number(searchParams.get('x')) : null,
  y: searchParams.has('y') ? Number(searchParams.get('y')) : null,
}
window.IS_DEV = searchParamsObj.dev;
window.IS_LOCALHOST = location.hostname === 'localhost';

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// TODO: why is this a class?
class Screen {
  public tiles: { tile: number }[][] = [];
  public layers = [];
  public enemies: QuestMaker.Screen['enemies'] = [];
  public color = 0;
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
    id: 1,
    cset: 0,
    type: ItemType.SWORD,
    tile: swordGraphics[0].id,
    name: 'Sword',
    pickupSound: 0,
    useSound: 0,
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
    { name: 'Overworld', map: 0, color: 0, song: 0, continueScreenX: 7, continueScreenY: 7, xoff: 0 },
  ];

  return quest;
}

// TODO: real quest loading/saving.
async function loadQuest(path: string): Promise<QuestMaker.Quest> {
  if (path.endsWith('.qst')) {
    return await convertZCQst(await readZCQst(path, window.IS_DEV || window.IS_LOCALHOST));
  }

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
  // @ts-expect-error
  window.pixi = pixi;

  // @ts-expect-error
  window.getZcScreen = () => window.qstData.MAP.maps[app.state.mapIndex].screens[app.state.screenX + app.state.screenY * screenWidth];

  // Find images to load.
  const images = new Set<string>();
  for (const graphic of quest.graphics) {
    images.add(graphic.file);
  }

  console.log({ images });
  for (const image of images) {
    if (image.startsWith('blob:') || image.startsWith('data:')) {
      pixi.loader.add(image, image);
    } else {
      pixi.loader.add(image, `${questBasePath}/${image}`);
    }
  }
  await new Promise(resolve => pixi.loader.load(resolve));

  const initialDmap = searchParamsObj.dmap ?? quest.misc.START_DMAP;
  const initialMap = searchParamsObj.map ?? quest.dmaps[initialDmap].map;
  const initialScreenX = searchParamsObj.x ?? quest.dmaps[initialDmap].continueScreenX;
  const initialScreenY = searchParamsObj.y ?? quest.dmaps[initialDmap].continueScreenY;

  window.addEventListener('unload', () => {
    const { mapIndex, screenX, screenY } = state;
    const lastStateByQuest = getLocalStorage();
    lastStateByQuest[questBasePath] = { mapIndex, screenX, screenY };
    saveLocalStorage(lastStateByQuest);
  });

  const state: QuestMaker.State = {
    quest,
    editor: {
      isPlayTesting: false,
      currentTile: 0,
      selectedLayer: 0,
      visibleLayers: [true, true, true, true, true, true, true],
    },
    game: {
      screenStates: new Map(),
      inventory: [],
      equipped: [null, null],
    },
    dmapIndex: initialDmap,
    mapIndex: initialMap, // TODO: should this be a getter too, based on dmap?
    screenX: initialScreenX,
    screenY: initialScreenY,
    get currentDMap() {
      return quest.dmaps[state.dmapIndex];
    },
    get currentMap() {
      return quest.maps[state.mapIndex];
    },
    get currentScreen() {
      return quest.maps[state.mapIndex].screens[state.screenX][state.screenY];
    },
  };

  const swordIndex = quest.items.findIndex(item => item.name.includes('Sword'));
  if (swordIndex !== -1) {
    state.game.inventory[0] = { item: swordIndex };
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

  ui = makeUI(document.body, {
    mode: 'edit',
    quest,
    currentMapIndex: initialMap,
    screenX: initialScreenX,
    screenY: initialScreenY,
    selectedLayer: state.editor.selectedLayer,
    visibleLayers: state.editor.visibleLayers,
  });

  ui.subscribe((state) => {
    app.state.mapIndex = state.currentMapIndex;
    app.state.dmapIndex = quest.dmaps.findIndex(dmap => dmap.map === state.currentMapIndex);
    app.state.screenX = state.screenX;
    app.state.screenY = state.screenY;
    app.state.editor.currentTile = state.selectedTile?.id || 0;
    app.state.editor.selectedLayer = state.selectedLayer;
    app.state.editor.visibleLayers = state.visibleLayers;
    updateUrl(app.state);
  });
  updateUrl(app.state);

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
      ui.actions.setCurrentMapIndex(app.state.mapIndex);
      ui.actions.setMode('edit');
    } else {
      app.destroyChildren(app.pixi.stage);
      app.state.game.screenTransition = app.state.game.warpReturnTransition = undefined;

      // Bit of a hack.
      const matchingDmapIndex = app.state.quest.dmaps.findIndex(dmap => dmap.map === app.state.mapIndex);
      if (matchingDmapIndex !== -1) {
        app.state.dmapIndex = matchingDmapIndex;
        app.state.mapIndex = app.state.quest.dmaps[matchingDmapIndex].map;
      }

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

function updateUrl(state: QuestMaker.State) {
  const url = new URL(location.href);
  const searchParams = new URLSearchParams();

  searchParams.set('quest', String(url.searchParams.get('quest')));
  if (state.dmapIndex === -1) {
    searchParams.set('map', String(state.mapIndex));
    searchParams.delete('dmap');
  } else {
    searchParams.set('dmap', String(state.dmapIndex));
    searchParams.delete('map');
  }
  searchParams.set('x', String(state.screenX));
  searchParams.set('y', String(state.screenY));
  if (url.searchParams.get('dev')) searchParams.set('dev', 'true');

  url.search = searchParams.toString();
  history.replaceState({}, '', url);
}

async function selectQuest(questPath: string) {
  const quest = await loadQuest(questPath);
  await load(quest, questPath);
}

let ui: ReturnType<typeof makeUI>;

if (searchParamsObj.quest) {
  selectQuest(searchParamsObj.quest);
} else if (searchParamsObj.zcdebug) {
  readZCQst(searchParamsObj.zcdebug);
} else {
  const el = createLandingPage();
  document.body.append(el);
}
