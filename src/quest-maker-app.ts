import { App } from "./engine/app";

export class QuestMakerApp extends App<QuestMaker.State> {
  createTileSprite(tileId: number) {
    const tile = this.state.quest.tiles[tileId];
    if (!tile) {
      console.warn('unknown tile', tileId);
      return this.createGraphicSprite(0);
    }

    const graphic = this.state.quest.graphics[tile.graphicId];
    const sprite = this.createGraphicSprite(graphic.id);

    if (tile.flipHorizontal && tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.W;
    } else if (tile.flipHorizontal) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL;
    } else if (tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_VERTICAL;
    }

    return sprite;
  }

  createGraphicSprite(graphicId: number) {
    const graphic = this.state.quest.graphics[graphicId];
    return this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);
  }
};
