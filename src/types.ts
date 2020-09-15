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
    }

    type TileType = TileType_;

    interface Tile {
      id: number;
      type: TileType;
      spritesheet: string;
      x: number;
      y: number;
      width: number;
      height: number;
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
      tile: number;
    }

    interface Quest {
      screens: Screen[][];
      enemies: Enemy[];
      weapons: Weapon[];
      tiles: Tile[];
      misc: {
        HERO_TILE_START: number;
        SWORD_TILE_START: number;
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
      };
      screenX: number;
      screenY: number;
    }

    // Are these used?
    export type App = QuestMakerApp;
    export type Mode = QuestMakerMode;
  }
}
