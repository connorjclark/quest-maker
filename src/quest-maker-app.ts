import { App } from "./engine/app";
import { MultiColorReplaceFilter } from "@pixi/filter-multi-color-replace";

export class QuestMakerApp extends App<QuestMaker.State> {
  createTileSprite(tileId: number, cset = 3) {
    const tile = this.state.quest.tiles[tileId];
    if (!tile) {
      console.warn('unknown tile', tileId);
      return this.createGraphicSprite(0, 0);
    }

    if (tile.numFrames && tile.numFrames > 1) {
      // TODO: improve API so we don't just ignore a newly created Sprite.
      const textures = Array.from(Array(tile.numFrames))
        .map((_, i) => this._createSpriteForTileFrame(tile, i, cset).texture);
      const sprite = new PIXI.AnimatedSprite(textures);
      sprite.play();
      // TODO: 128 is just a guess.
      sprite.animationSpeed = (tile.speed || 0) / 128;
      return sprite;
    } else {
      return this._createSpriteForTileFrame(tile, 0, cset);
    }
  }

  _createSpriteForTileFrame(tile: QuestMaker.Tile, frame: number, cset: number) {
    const sprite = this.createGraphicSprite(tile.graphicId + frame, cset);

    if (tile.flipHorizontal && tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.W;
    } else if (tile.flipHorizontal) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL;
    } else if (tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_VERTICAL;
    }

    return sprite;
  }

  createGraphicSprite(graphicId: number, cset = 0) {
    const graphic = this.state.quest.graphics[graphicId];
    const sprite = this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);

    if (this.state.quest.csets.length === 0) {
      return sprite;
    }

    // TODO: Probably not very performant?
    return this._multiColorReplaceSpriteCopy(sprite, this._getColorReplacementsForCset(cset), 0.0001);
  }

  _multiColorReplaceSpriteCopy(sprite: PIXI.Sprite, replacements: number[][], epsilon: number) {
    const container = new PIXI.Container();
    const filter = new MultiColorReplaceFilter(replacements, epsilon);
    container.addChild(sprite);
    container.filters = [filter];
    const brt = new PIXI.BaseRenderTexture({width: sprite.width, height: sprite.height});
    const rt = new PIXI.RenderTexture(brt);
    const spriteCopy = new PIXI.Sprite(rt);
    this.pixi.renderer.render(container, rt);
    return spriteCopy;
  }

  private replacementsCache = new Map<number, number[][]>();
  _getColorReplacementsForCset(cset: number) {
    let replacements = this.replacementsCache.get(cset);
    if (replacements) return replacements;

    const { colors } = this.state.quest.csets[cset];
    replacements = colors.map(({ r, g, b }, i) => {
      return [i, 65536 * r + 256 * g + b];
    });
    this.replacementsCache.set(cset, replacements);

    return replacements;
  }
};
