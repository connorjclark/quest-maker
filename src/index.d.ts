import { QuestMakerApp } from "./quest-maker-app";
import { QuestMakerMode } from "./quest-maker-mode";

declare global {
  namespace QuestMaker {
    interface Screen {
      tiles: { tile: number }[][];
      entities: Entity[];
    }

    interface Entity {
      type: number;
      x: number;
      y: number;
    }

    interface Tile {
      spritesheet: string;
      x: number;
      y: number;
      walkable: boolean;
    }

    interface Quest {
      screens: Screen[][];
      tiles: Tile[];
      misc: {
        HERO_TILE_START: number;
      };
    }

    interface State {
      quest: Quest;
      currentScreen: Screen;
      editor: {
        isPlayTesting: boolean;
        currentTile: number;
        screenX: number;
        screenY: number;
      };
    }

    // Are these used?
    export type App = QuestMakerApp;
    export type Mode = QuestMakerMode;
  }
}
