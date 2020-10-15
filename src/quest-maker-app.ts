import { App } from "./engine/app";

export class QuestMakerApp extends App<QuestMaker.State> {
  createTileSprite(tileId: number) {
    const tile = this.state.quest.tiles[tileId];
    if (!tile) {
      console.warn('unknown tile', tileId);
      return this.createGraphicSprite(0);
    }

    if (tile.numFrames && tile.numFrames > 1) {
      // TODO: improve API so we don't just ignore a newly created Sprite.
      const textures = Array.from(Array(tile.numFrames))
        .map((_, i) => this._createSpriteForTileFrame(tile, i).texture);
      const sprite = new PIXI.AnimatedSprite(textures);
      sprite.play();
      // TODO: 128 is just a guess.
      sprite.animationSpeed = (tile.speed || 0) / 128;
      return sprite;
    } else {
      return this._createSpriteForTileFrame(tile, 0);
    }
  }

  _createSpriteForTileFrame(tile: QuestMaker.Tile, frame: number) {
    const sprite = this.createGraphicSprite(tile.graphicId + frame);

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
