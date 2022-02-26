import * as constants from './constants';
import { EnemyType } from './types';

const { tileSize } = constants;

export default function () {
  const graphics: QuestMaker.Graphic[] = [];
  const tiles: QuestMaker.Tile[] = [];

  function makeGraphic(opts: Omit<QuestMaker.Graphic, 'id'>) {
    const graphic = {
      id: graphics.length,
      file: opts.file,
      x: opts.x,
      y: opts.y,
      width: opts.width,
      height: opts.height,
    };
    graphics.push(graphic);
    return graphic;
  }

  function makeTile(opts: Omit<QuestMaker.Tile, 'id' | 'type' | 'walkable'> & Partial<Pick<QuestMaker.Tile, 'walkable'>>): QuestMaker.Tile {
    const tile = {
      id: tiles.length,
      type: 'default' as QuestMaker.TileType,
      walkable: [true, true, true, true] as QuestMaker.Tile['walkable'],
      ...opts,
    };
    tiles.push(tile);

    return tile;
  }

  function make(opts: { tile: boolean, file: string, n: number, tilesInRow?: number, startX?: number, startY?: number, spacing?: number, width?: number, height?: number }) {
    const graphics: QuestMaker.Graphic[] = [];
    const tiles: QuestMaker.Tile[] = [];

    if (!opts.width) opts.width = tileSize;
    if (!opts.height) opts.height = tileSize;
    if (!opts.startX) opts.startX = 0;
    if (!opts.startY) opts.startY = 0;
    if (!opts.spacing) opts.spacing = 0;
    if (!opts.tilesInRow) opts.tilesInRow = opts.n;

    for (let i = 0; i < opts.n; i++) {
      const x = (i % opts.tilesInRow) * (opts.width + opts.spacing) + opts.startX;
      const y = Math.floor(i / opts.tilesInRow) * (opts.height + opts.spacing) + opts.startY;

      const graphic = makeGraphic({
        file: opts.file,
        x,
        y,
        width: opts.width,
        height: opts.height,
      });
      graphics.push(graphic);

      if (opts.tile) {
        const tile = makeTile({
          graphicId: graphic.id,
        });
        tiles.push(tile);
      }
    }

    return { graphics, tiles };
  }

  function makeAdvanced(opts: { tile: boolean, file: string, n: number, startX?: number, startY?: number, spacing?: number, width?: number[], height?: number[] }) {
    const graphics: QuestMaker.Graphic[] = [];
    const tiles: QuestMaker.Tile[] = [];

    if (!opts.startX) opts.startX = 0;
    if (!opts.startY) opts.startY = 0;
    if (!opts.spacing) opts.spacing = 0;

    let x = opts.startX;
    let y = opts.startY;
    for (let i = 0; i < opts.n; i++) {
      const width = opts.width ? opts.width[i % opts.width.length] : tileSize;
      const height = opts.height ? opts.height[i % opts.height.length] : tileSize;
      const graphic = makeGraphic({
        file: opts.file,
        x,
        y,
        width,
        height,
      });
      graphics.push(graphic);

      if (opts.tile) {
        const tile = makeTile({
          graphicId: graphic.id,
        });
        tiles.push(tile);
      }

      x += width + opts.spacing;
    }

    return { graphics, tiles };
  }

  const weapons: QuestMaker.Weapon[] = [];
  function makeWeapon(weapon: Omit<QuestMaker.Weapon, 'id'>) {
    weapons.push({ id: weapons.length + 1, ...weapon });
    return weapons[weapons.length - 1];
  }

  const enemies: QuestMaker.Enemy[] = [];
  function makeEnemy(opts: Pick<QuestMaker.Enemy, 'name' | 'frames' | 'attributes'> & { type?: EnemyType }) {
    const enemy = {
      id: enemies.length,
      type: EnemyType.NORMAL,
      speed: 50 / 100,
      homingFactor: 64 / 255,
      directionChangeFactor: 4 / 16,
      haltFactor: 3 / 16,
      ...opts,
    };
    enemies.push(enemy);
  }

  const quest: QuestMaker.Quest = {
    name: 'debug',
    graphics,
    tiles,
    enemies,
    items: [],
    weapons,
    dmaps: [],
    maps: [],
    misc: {
      SPAWN_GFX_START: 0,
      HERO_FRAMES: {},
      START_DMAP: 0,
    }
  };

  return {
    quest,
    make,
    makeGraphic,
    makeTile,
    makeAdvanced,
    makeWeapon,
    makeEnemy,
  }
}