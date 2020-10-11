import { App } from "./engine/app";

export class QuestMakerApp extends App<QuestMaker.State> {
  createTileSprite(tileId: number) {
    const tile = this.state.quest.tiles[tileId];
    if (!tile) {
      console.warn('unknown tile', tileId);
      return this.createGraphicSprite(0);
    }

    const graphic = this.state.quest.graphics[tile.graphicId];
    return this.createGraphicSprite(graphic.id);
  }

  createGraphicSprite(graphicId: number) {
    const graphic = this.state.quest.graphics[graphicId];
    return this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);
  }
};
