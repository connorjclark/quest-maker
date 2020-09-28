import { QuestMakerApp } from "./quest-maker-app";
import { QuestMakerMode } from "./quest-maker-mode";

export enum TileType {
  DEFAULT = 'default',
  SLOW_WALK = 'slow walk',
  WARP = 'warp',
}
type TileType_ = TileType;

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
      /* top left, top right, bottom left, bottom right */
      walkable: [boolean, boolean, boolean, boolean];
    }

    interface Enemy {
      name: string;
      frames: Record<string, number[]>;
      weaponId?: number;
    }

    interface Weapon {
      id: number;
      name: string;
      graphic: number;
      rotate?: boolean;
    }

    interface Quest {
      screens: Screen[][];
      enemies: Enemy[];
      weapons: Weapon[];
      graphics: Graphic[];
      tiles: Tile[];
      misc: {
        SPAWN_GFX_START: number;
        HERO_GFX_START: number;
        SWORD_GFX_START: number;
      };
    }

    interface State {
      quest: Quest;
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
      screenX: number;
      screenY: number;
    }

    // Are these used?
    export type App = QuestMakerApp;
    export type Mode = QuestMakerMode;
  }
}
