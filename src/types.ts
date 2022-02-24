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
  WIZARD = 'wizard',
}
type EnemyType_ = EnemyType;

// TODO strings.
export enum ItemType {
  SWORD = 0,
}

declare global {
  interface Window {
    IS_DEV: boolean;
    app?: QuestMakerApp;
  }

  namespace QuestMaker {
    interface ScreenTile {
      tile: number;
      cset?: number;
    }

    interface Screen {
      tiles: ScreenTile[][];
      layers: Array<{ map: number; x: number; y: number } | null>;
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

    // TODO: write comments for each.
    type EnemyAnimationType = |
      'none' |
      'flip' |
      'unused1' |
      '2frm' |
      'unused2' |
      'octo' |
      'tek' |
      'lev' |
      'walk' |
      'zora' |
      'newzora' |
      'ghini' |
      'armos' |
      'rope' |
      'wallm' |
      'newwallm' |
      'dwalk' |
      'vire' |
      '3frm' |
      'wizz' |
      'aqua' |
      'dongo' |
      'manhan' |
      'gleeok' |
      'dig' |
      'ghoma' |
      'lanm' |
      '2frmpos' |
      '4frm4eye' |
      '4frm8eye' |
      '4frm4dirf' |
      '4frm4dir' |
      '4frm8dirf' |
      'armos4' |
      '4frmpos4dir' |
      '4frmpos8dir' |
      'unused3' |
      '4frm8dirb' |
      'newtek' |
      '3frm4dir' |
      '2frm4dir' |
      'newlev' |
      '2frm4eye' |
      'newwizz' |
      'newdongo' |
      'dongobs' |
      '4frmpos8dirf' |
      '4frmpos4dirf' |
      '4frmnodir' |
      'ganon' |
      '2frmb';

    interface EnemyAttributes {
      'enemy.animation.graphics': number;
      'enemy.animation.numGraphics': number;
      'enemy.animation.type': EnemyAnimationType;
      'enemy.cset': number; // TODO: move to animation?
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
      /** enemy.animation.* preferred. Should probably remove this. */
      frames?: Record<string, number[]>;
      attributes: Partial<EnemyAttributes>;
    }

    interface Item {
      id: number;
      name: string;
      type: ItemType;
      tile: number;
      cset: number;
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
      continueScreenX: number;
      continueScreenY: number;
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
      name: string;
      dmaps: DMap[];
      maps: Map_[];
      enemies: Enemy[];
      items: Item[];
      weapons: Weapon[];
      // Rename to gfx?
      graphics: Graphic[];
      color?: {
        csets: Cset[];
        palettes: Array<{ name: string, csets: number[] }>;
      };
      tiles: Tile[];
      misc: {
        SPAWN_GFX_START: number;
        // Type -> Array [up, down, left, right]
        HERO_FRAMES: Record<string, Array<{
          gfxs: number[],
          flip: number | number[],
        }>>;
        START_X: number;
        START_Y: number;
        START_DMAP: number;
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
