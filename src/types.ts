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

declare global {
  namespace QuestMaker {
    interface Screen {
      tiles: { tile: number }[][];
      enemies: Array<{
        enemyId: number;
      }>;
      warps: {
        a?: {
          screenX: number;
          screenY: number;
          x?: number;
          y?: number;
        };
      };
    }

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
      numFrames?: number;
      speed?: number;
      flipHorizontal?: boolean;
      flipVertical?: boolean;
      /** top left, top right, bottom left, bottom right */
      walkable: [boolean, boolean, boolean, boolean];
    }

    type Attributes = EnemyAttributes & ScreenAttributes;

    interface EnemyAttributes {
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

    interface Weapon {
      id: number;
      name: string;
      graphic: number;
      rotate?: boolean;
    }

    interface Map_ {
      screens: Screen[][];
    }

    interface Quest {
      maps: Map_[];
      enemies: Enemy[];
      weapons: Weapon[];
      graphics: Graphic[];
      tiles: Tile[];
      misc: {
        SPAWN_GFX_START: number;
        HERO_FRAMES: Record<string, { graphicIds: number[], flip?: boolean }>;
        START_X: number;
        START_Y: number;
      };
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
        screenTransition?: {
          type: 'direct' | 'scroll';
          frames: number;
          screen: { x: number, y: number };
          screenDelta: { x: number, y: number };
          newScreenContainer: PIXI.Container;
        };
        moveFreeze?: number;
        screenStates: Map<Screen, {
          enemiesKilled: number
        }>;
      };
      mapIndex: number;
      screenX: number;
      screenY: number;
    }

    // Are these used?
    export type App = QuestMakerApp;
    export type Mode = QuestMakerMode;
  }
}
