import { QuestMakerApp } from "./quest-maker-app";
import { QuestMakerMode } from "./quest-maker-mode";

export enum TileType {
  DEFAULT = 'default',
  SLOW_WALK = 'slow walk',
  WARP = 'warp',
}
type TileType_ = TileType;

export enum EnemyType {
  NORMAL = 'normal',
  LEEVER = 'leever',
}
type EnemyType_ = EnemyType;

// TODO strings.
export enum ItemType {
  SWORD = 0,
}

declare global {
  namespace QuestMaker {
    interface ScreenTile {
      tile: number;
      cset?: number;
    }

    interface Screen {
      tiles: ScreenTile[][];
      enemies: Array<{
        enemyId: number;
      }>;
      warps: {
        /** Position hero goes to for warps to this screen. */
        arrival?: {
          x: number;
          y: number;
        };
        data?: Warp[];
      };
    }

    type Warp = {
      type: 'special-room';
      guy: number;
      string: number;
      /** Position hero goes to when returning from a special room warp. */
      return: {
        x: number;
        y: number;
      };
      // guy?: number;
      item?: number;
    } | {
      type: 'screen',
      dmap?: number;
      screenX: number;
      screenY: number;
      x?: number;
      y?: number;
    };

    interface Graphic {
      id: number;
      file: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }

    type TileType = TileType_;

    interface Tile {
      id: number;
      type: TileType;
      graphicId: number;
      extraCset?: {
        quadrants: boolean[];
        offset: number;
      };
      numFrames?: number;
      /** Higher is faster, lower is slower. */
      speed?: number;
      flipHorizontal?: boolean;
      flipVertical?: boolean;
      /** top left, top right, bottom left, bottom right */
      walkable: [boolean, boolean, boolean, boolean];
    }

    type Attributes = EnemyAttributes & ScreenAttributes;

    type EntityAttributes = EnemyAttributes & {
      'item.id': number;
    };

    interface EnemyAttributes {
      'enemy.cset': number;
      'enemy.directionChange': number;
      'enemy.halt': number;
      'enemy.homing': number;
      /** Pixels per frame. */
      'enemy.speed': number;
      'enemy.leever.emergedState': 'submerged' | 'emerged' | 'submerging';
      'enemy.leever.emergedStateTimeChanged': number;
      'enemy.leever.emergeStyle': 'hero-path' | 'in-place';
      'enemy.weapon': number;
      'enemy.weapon.sprite': number;
    }

    interface ScreenAttributes {
      'screen.leever.lastEmergedTime': number;
    }

    interface Enemy {
      id: number;
      name: string;
      type: EnemyType_;
      frames: Record<string, number[]>;
      attributes: Partial<EnemyAttributes>;
    }

    interface Item {
      name: string;
      type: ItemType;
      tile: number;
    }

    interface Weapon {
      id: number;
      name: string;
      graphic: number;
      cset?: number;
      rotate?: boolean;
    }

    // TODO: Better name for Map / DMap ?
    interface DMap {
      name: string;
      map: number;
      color: number;
      song: number;
    }

    interface Map_ {
      screens: Screen[][];
    }

    interface Color {
      r: number;
      g: number;
      b: number;
    }

    interface Cset {
      colors: Color[];
    }

    interface Quest {
      dmaps: DMap[];
      maps: Map_[];
      enemies: Enemy[];
      items: Item[];
      weapons: Weapon[];
      graphics: Graphic[];
      color?: {
        csets: Cset[];
        palettes: Array<{ name: string, csets: number[] }>;
      };
      tiles: Tile[];
      misc: {
        SPAWN_GFX_START: number;
        HERO_FRAMES: Record<string, { graphicIds: number[], flip?: boolean }>;
        START_X: number;
        START_Y: number;
      };
    }

    // TODO: make a ScreenLocation type that have all of: map, screen, and hero x/y?

    type ScreenTransitionType = 'direct' | 'scroll';

    interface ScreenTransition {
      type: ScreenTransitionType;
      frames: number;
      dmap?: number;
      item?: number;
      screen: { x: number, y: number };
      position?: { x: number, y: number };
      screenDelta: { x: number, y: number };
      newScreenContainer: PIXI.Container;
    }

    interface State {
      quest: Quest;
      currentMap: Map_;
      currentScreen: Screen;
      editor: {
        isPlayTesting: boolean;
        currentTile: number;
      };
      game: {
        screenTransition?: ScreenTransition;
        /** Pending transition for when hero leaves a special room. */
        warpReturnTransition?: ScreenTransition;
        moveFreeze?: number;
        screenStates: Map<Screen, {
          enemiesKilled: number
        }>;
        inventory: Array<{ item: number }>;
        equipped: [number | null, number | null];
      };
      dmapIndex: number;
      mapIndex: number;
      screenX: number;
      screenY: number;
    }

    // Are these used?
    export type App = QuestMakerApp;
    export type Mode = QuestMakerMode;
  }
}
