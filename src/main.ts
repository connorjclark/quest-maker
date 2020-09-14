import * as constants from './constants';
import { EditorMode } from './editor-mode';
import { PlayGameMode } from './play-game-mode';
import { QuestMakerApp } from './quest-maker-app';
import { TileType } from './types';

const { screenWidth, screenHeight, tileSize } = constants;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const pixi = new PIXI.Application();
pixi.renderer.backgroundColor = 0xaaaaaa;
document.body.appendChild(pixi.view);

class Screen {
  public tiles: { tile: number }[][] = [];

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
  }
}

function createQuest(): QuestMaker.Quest {
  // Create tiles from gfx/
  const tiles: QuestMaker.Tile[] = [];

  function makeTile(opts: Omit<QuestMaker.Tile, 'id' | 'type' | 'walkable'>): QuestMaker.Tile {
    const tile = {
      id: tiles.length,
      type: 'default' as QuestMaker.TileType,
      walkable: [true, true, true, true] as QuestMaker.Tile['walkable'],
      ...opts,
    };
    tiles.push(tile);
    return tile;
  }

  function makeTiles(opts: { spritesheet: string, n: number, tilesInRow?: number, startX?: number, startY?: number, spacing?: number, width?: number, height?: number }) {
    const t = [];

    if (!opts.width) opts.width = tileSize;
    if (!opts.height) opts.height = tileSize;
    if (!opts.startX) opts.startX = 0;
    if (!opts.startY) opts.startY = 0;
    if (!opts.spacing) opts.spacing = 0;
    if (!opts.tilesInRow) opts.tilesInRow = opts.n;

    for (let i = 0; i < opts.n; i++) {
      const x = (i % opts.tilesInRow) * (opts.width + opts.spacing) + opts.startX;
      const y = Math.floor(i / opts.tilesInRow) * (opts.height + opts.spacing) + opts.startY;
      const tile = makeTile({
        spritesheet: opts.spritesheet,
        x,
        y,
        width: opts.width,
        height: opts.height,
      });
      t.push(tile);
    }

    return t;
  }

  const weapons: QuestMaker.Weapon[] = [];
  function makeWeapon(weapon: Omit<QuestMaker.Weapon, 'id'>) {
    weapons.push({ id: weapons.length + 1, ...weapon });
  }

  const basicTiles = makeTiles({
    spritesheet: 'tiles',
    n: 48,
    tilesInRow: 6,
    startX: 1,
    startY: 1,
    spacing: 1,
  });
  for (const tile of basicTiles) {
    if ([1, 3, 4, 5, 7, 8].includes(basicTiles.indexOf(tile))) {
      tile.walkable = [false, false, false, false];
    } else {
      tile.walkable = [true, true, true, true];
    }
  }

  const HERO_BASIC_TILES = makeTiles({
    spritesheet: 'link',
    n: 6,
    startX: 1,
    startY: 11,
    spacing: 1,
  });
  const HERO_USE_ITEM_TILES = makeTiles({
    spritesheet: 'link',
    n: 3,
    startX: 107,
    startY: 11,
    spacing: 1,
  });

  const octorokTiles = makeTiles({
    spritesheet: 'enemies',
    n: 5,
    startX: 1,
    startY: 11,
    spacing: 1,
  });

  const enemies: QuestMaker.Enemy[] = [];
  enemies.push({
    name: 'Octorok (Red)',
    weaponId: 1,
    frames: {
      down: [octorokTiles[0].id, octorokTiles[1].id],
      left: [octorokTiles[2].id, octorokTiles[3].id],
    },
  });

  octorokTiles[octorokTiles.length - 1].width = tileSize / 2;
  makeWeapon({
    name: 'Rock',
    tile: octorokTiles[octorokTiles.length - 1].id,
  });

  const screens: Screen[][] = [];
  for (let x = 0; x < 5; x++) {
    screens[x] = [];
    for (let y = 0; y < 5; y++) {
      screens[x].push(new Screen());
    }
  }

  // Make ground tile first.
  let temp = tiles[0];
  tiles[0] = tiles[2];
  tiles[2] = temp;

  // Set ids manually (fixes manually swapped tile ids)
  for (let i = 0; i < tiles.length; i++) tiles[i].id = i;

  // Stairs.
  tiles[2].type = TileType.WARP;

  screens[0][0].tiles[9][7].tile = 2;

  return {
    tiles: [...tiles, ...tiles, ...tiles, ...tiles],
    enemies,
    weapons,
    screens,
    misc: {
      HERO_TILE_START: HERO_BASIC_TILES[0].id,
    }
  }
}

// TODO: real quest loading/saving.
function loadQuest(): QuestMaker.Quest {
  if (window.location.search.includes('fresh')) return createQuest();

  const json = localStorage.getItem('quest');
  if (json) {
    return JSON.parse(json);
  } else {
    return createQuest();
  }
}

function deleteQuest() {
  localStorage.clear();
  // @ts-ignore
  window.app.state.quest = createQuest();
  window.location.reload();
}

function saveQuest(quest: QuestMaker.Quest) {
  localStorage.setItem('quest', JSON.stringify(quest));
}
// @ts-ignore
window.save = () => saveQuest(window.app.state.quest);
// @ts-ignore
window.deleteQuest = deleteQuest;
// @ts-ignore
window.addEventListener('unload', window.save);
// @ts-ignore
setInterval(window.save, 1000 * 60);

function load() {
  const quest = loadQuest();
  const state = {
    quest,
    editor: {
      isPlayTesting: false,
      currentTile: 0,
    },
    game: {},
    screenX: 0,
    screenY: 0,
    currentScreen: quest.screens[0][0],
  };

  const app = new QuestMakerApp(pixi, state);
  editorMode = new EditorMode(app);

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
      app.setMode(new PlayGameMode(app));
    }
    app.state.editor.isPlayTesting = !app.state.editor.isPlayTesting;
  }

  app.tick(dt);
}

pixi.loader
  .add('tiles', 'gfx/tiles-overworld.png')
  .add('link', 'gfx/link.png')
  .add('enemies', 'gfx/enemies.png')
  .load(load);
