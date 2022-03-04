import { EnemyType } from './types';

export default function () {
  const graphics: QuestMaker.Graphic[] = [];
  const tiles: QuestMaker.Tile[] = [];

  function makeGraphic(opts: Omit<QuestMaker.Graphic, 'id'>) {
    const graphic = {
      id: graphics.length,
      format: opts.format,
      pixels: opts.pixels,
    };
    graphics.push(graphic);
    return graphic;
  }

  function makeTile(opts: Omit<QuestMaker.Tile, 'id' | 'walkable'> & Partial<Pick<QuestMaker.Tile, 'walkable'>>): QuestMaker.Tile {
    const tile = {
      id: tiles.length,
      walkable: [true, true, true, true] as QuestMaker.Tile['walkable'],
      ...opts,
    };
    tiles.push(tile);

    return tile;
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
      rules: [],
      strings: [],
    }
  };

  return {
    quest,
    makeGraphic,
    makeTile,
    makeWeapon,
    makeEnemy,
  }
}