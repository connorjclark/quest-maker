import * as constants from './constants';
import { EditorMode } from './editor-mode';
import { PlayGameMode } from './play-game-mode';
import { QuestMakerApp } from './quest-maker-app';

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
        this.tiles[x][y] = { tile };
      }
    }
  }
}

document.body.onkeydown = (e) => {
  app.keys.down[e.code] = true;
  app.keys.pressed[e.code] = true;
};
document.body.onkeyup = (e) => {
  delete app.keys.down[e.code];
  app.keys.up[e.code] = true;
  app.keys.pressed[e.code] = false;
};

function createQuest(): QuestMaker.Quest {
  // Create tiles from gfx/
  const tiles: QuestMaker.Tile[] = [];

  function makeTile(spritesheet: string, x: number, y: number): QuestMaker.Tile {
    const tile = { id: tiles.length, spritesheet, x, y, walkable: true };
    tiles.push(tile);
    return tile;
  }

  function makeTiles(opts: { spritesheet: string, n: number, tilesInRow?: number, startX?: number, startY?: number, spacing?: number }) {
    const t = [];

    if (!opts.startX) opts.startX = 0;
    if (!opts.startY) opts.startY = 0;
    if (!opts.spacing) opts.spacing = 0;
    if (!opts.tilesInRow) opts.tilesInRow = opts.n;

    for (let i = 0; i < opts.n; i++) {
      const x = (i % opts.tilesInRow) * (tileSize + opts.spacing) + opts.startX;
      const y = Math.floor(i / opts.tilesInRow) * (tileSize + opts.spacing) + opts.startY;
      const tile = makeTile(opts.spritesheet, x, y);
      t.push(tile);
    }

    return t;
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
    tile.walkable = ![1, 3, 4, 5, 7, 8].includes(basicTiles.indexOf(tile));
  }

  const HERO_TILES = makeTiles({
    spritesheet: 'link',
    n: 6,
    startX: 1,
    startY: 11,
    spacing: 1,
  });

  const octorokTiles = makeTiles({
    spritesheet: 'enemies',
    n: 4,
    startX: 1,
    startY: 11,
    spacing: 1,
  });

  const enemies = [];
  enemies.push({
    name: 'Octorok (Red)',
    frames: {
      down: [octorokTiles[0].id, octorokTiles[1].id],
      left: [octorokTiles[2].id, octorokTiles[3].id],
    },
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

  return {
    tiles,
    enemies,
    screens,
    misc: {
      HERO_TILE_START: HERO_TILES[0].id,
    }
  }
}

const quest = createQuest();
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
const editorMode = new EditorMode(app);

function load() {
  pixi.ticker.add(tick);
  app.setMode(editorMode);
}

function tick(dt: number) {
  if (app.keys.down['ShiftLeft'] || app.keys.down['ShiftRight']) {
    if (state.editor.isPlayTesting) {
      app.setMode(editorMode);
    } else {
      app.setMode(new PlayGameMode(app));
    }
    state.editor.isPlayTesting = !state.editor.isPlayTesting;
  }

  app.tick(dt);
}

pixi.loader
  .add('tiles', 'gfx/tiles-overworld.png')
  .add('link', 'gfx/link.png')
  .add('enemies', 'gfx/enemies.png')
  .load(load);

// @ts-ignore
window.app = app;
