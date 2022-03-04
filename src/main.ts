import 'regenerator-runtime/runtime' // ??? why is this needed now?

import * as constants from './constants';
import { EditorMode } from './editor-mode';
import { PlayGameMode } from './play-game-mode';
import { QuestMakerApp } from './quest-maker-app';
import { ItemType } from './types';
import { makeUI } from './ui/QuestMaker';
import { readZCQst } from './read-zc-qst';
import { convertZCQst } from './convert-zc-qst';
import { createLandingPage } from './ui/LandingPage';
import { QuestRules } from './quest-rules';
import { ScreenFlags } from './screen-flags';
import { TileFlag } from './tile-flags';
import { EnemyFlags } from './enemy-flags';

const { screenWidth, screenHeight } = constants;

const searchParams = new URLSearchParams(location.search);
const searchParamsObj = {
  quest: searchParams.get('quest'),
  play: searchParams.has('play'),
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
  public secretTiles: { tile: number }[] = [];
  public layers = [];
  public enemies: QuestMaker.Screen['enemies'] = [];
  public enemyFlags = 0;
  public color = 0;
  public warps: any = {};
  public flags = [];

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

// TODO: real quest loading/saving.
async function loadQuest(path: string): Promise<QuestMaker.Quest> {
  if (path.endsWith('.qst')) {
    const result = await convertZCQst(await readZCQst(path, true));
    return result.quest;
  }

  throw new Error('invalid quest path');

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
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
  const pixi = new PIXI.Application({
    transparent: true,
    width: 800,
    height: 600,
  });
  pixi.view.classList.add('main-canvas');
  // @ts-expect-error
  window.pixi = pixi;

  // @ts-expect-error
  window.getZcScreen = () => window.qstData.MAP.maps[app.state.mapIndex].screens[app.state.screenX + app.state.screenY * screenWidth];

  pixi.view.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

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
    mode: searchParamsObj.play ? 'play' : 'edit',
    quest,
    editor: {
      currentTile: { tile: 0 },
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
  window.app = app;
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

  ui = makeUI(document.body, {
    ...app.state,
  });
  app.ui = ui;

  ui.subscribe((state) => {
    app.state = {
      ...state,
      get currentDMap() {
        return quest.dmaps[app.state.dmapIndex];
      },
      get currentMap() {
        return quest.maps[app.state.mapIndex];
      },
      get currentScreen() {
        return quest.maps[app.state.mapIndex].screens[app.state.screenX][app.state.screenY];
      },
    };
    app.updateUrl();
  });

  window.addEventListener('resize', () => {
    app.resize()
  });
  app.resize();

  if (searchParamsObj.play) {
    enterPlayGameMode(app);
  } else {
    enterEditorMode(app);
  }
}

let editorMode: EditorMode;
function enterEditorMode(app: QuestMaker.App) {
  editorMode = editorMode || new EditorMode(app);
  app.setMode(editorMode);
  ui.actions.setState({ ...app.state, mode: 'edit' });
  app.updateUrl();
}

function enterPlayGameMode(app: QuestMaker.App) {
  // Bit of a hack.
  // TODO This is acually quite wrong because multiple dmaps can be on the same map.
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
  ui.actions.setState({ ...app.state, mode: 'play' });
}

function tick(app: QuestMaker.App, dt: number) {
  if (app.keys.down['ShiftLeft'] || app.keys.down['ShiftRight']) {
    app.destroyChildren(app.pixi.stage);

    if (app.getMode() instanceof PlayGameMode) {
      enterEditorMode(app);
    } else {
      app.destroyChildren(app.pixi.stage);
      app.state.game.screenTransition = app.state.game.warpReturnTransition = undefined;
      enterPlayGameMode(app);
    }
  }

  app.tick(dt);
}

// @ts-expect-error
window.debug = () => {
  if (!window.app) return;

  // @ts-expect-error
  window.debugQuestRules();
  // @ts-expect-error
  window.debugScreen();
};

// @ts-expect-error
window.debugScreen = () => {
  if (!window.app) return;

  // @ts-expect-error
  window.debugScreenFlags();
  // @ts-expect-error
  window.debugEnemyFlags();
  // @ts-expect-error
  window.debugTileFlags();
  // @ts-expect-error
  console.log(window.getZcScreen());
};

// @ts-expect-error
window.debugQuestRules = () => {
  console.log('===== Quest rules =====');
  for (const name of Object.keys(QuestRules)) {
    const enabled = QuestRules[name as keyof typeof QuestRules](window.app?.state.quest.misc.rules || []);
    if (enabled) console.log(name);
  }
}

// @ts-expect-error
window.debugScreenFlags = () => {
  console.log('===== Screen flags =====');
  for (const name of Object.keys(ScreenFlags)) {
    const enabled = ScreenFlags[name as keyof typeof ScreenFlags](window.app?.state.currentScreen.flags || []);
    if (enabled) console.log(name);
  }
}

// @ts-expect-error
window.debugEnemyFlags = () => {
  console.log('===== Enemy flags =====');
  for (const name of Object.keys(EnemyFlags)) {
    const enabled = EnemyFlags[name as keyof typeof EnemyFlags](window.app?.state.currentScreen.enemyFlags || 0);
    if (enabled) console.log(name);
  }
}

// @ts-expect-error
window.debugTileFlags = () => {
  // @ts-expect-error
  const screen = getZcScreen();

  let grid = '';
  const seen = new Set<TileFlag>();
  for (let y = 0; y < screenHeight; y++) {
    for (let x = 0; x < screenWidth; x++) {
      const flag = screen.sflag[x + y * screenWidth];
      seen.add(flag);
      grid += flag.toString().padEnd(3, ' ') + ' ';
    }
    grid += '\n';
  }

  console.log('===== Tile flags =====');
  for (const flag of [...seen].sort((a, b) => a - b)) {
    console.log(flag, TileFlag[flag]);
  }
  console.log(grid);
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
