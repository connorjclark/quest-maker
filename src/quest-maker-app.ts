import { App } from "./engine/app";

export class QuestMakerApp extends App<QuestMaker.State> {
  createTileSprite(tileId: number) {
    const tile = this.state.quest.tiles[tileId];
    const graphic = this.state.quest.graphics[tile.graphicId];
    return this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);
  }
};
