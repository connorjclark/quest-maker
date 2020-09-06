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
  public entities: QuestMaker.Entity[] = [];

  constructor() {
    for (let x = 0; x < screenWidth; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < screenHeight; y++) {
        let tile = 2;
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
  const tiles = [];
  for (let i = 0; i < 48; i++) {
    const x = (i % 6) * (tileSize + 1) + 1;
    const y = Math.floor(i / 6) * (tileSize + 1) + 1;
    let walkable = ![1, 3, 4, 5, 7, 8].includes(i);
    tiles.push({ spritesheet: 'tiles', x, y, walkable });
  }

  const HERO_TILE_START = tiles.length;
  for (let i = 0; i < 6; i++) {
    const x = (i % 6) * (tileSize + 1) + 1;
    const y = Math.floor(i / 6) * (tileSize + 1) + 11;
    tiles.push({ spritesheet: 'link', x, y, walkable: true });
  }

  const screens: Screen[][] = [];
  for (let x = 0; x < 5; x++) {
    screens[x] = [];
    for (let y = 0; y < 5; y++) {
      screens[x].push(new Screen());
    }
  }

  return {
    tiles,
    screens,
    misc: {
      HERO_TILE_START,
    }
  }
}

const quest = createQuest();
const state = {
  quest,
  editor: {
    isPlayTesting: false,
    screenX: 0,
    screenY: 0,
    currentTile: 0,
  },
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
  .load(load);

// @ts-ignore
window.app = app;
