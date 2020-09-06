import { App } from "./engine/app";

export class QuestMakerApp extends App<QuestMaker.State> {
  createTileSprite(tileNumber: number) {
    const tile = this.state.quest.tiles[tileNumber];
    return this.createSprite(tile.spritesheet, tile.x, tile.y, 16);
  }
};
