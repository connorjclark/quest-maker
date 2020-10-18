import { App } from "./engine/app";
import { MultiColorReplaceFilter } from "@pixi/filter-multi-color-replace";
// @ts-ignore
import Timidity from 'timidity';

class SoundManager {
  private midiPlayer = new Timidity('/midi');
  private currentSongId = -1;
  private enabled = !new URLSearchParams(window.location.search).has('dev');

  constructor(private app: QuestMakerApp) {
  }

  playSong(id: number) {
    if (!this.enabled) return;
    if (id === this.currentSongId) return;

    this.currentSongId = id;
    this.midiPlayer.load(`${this.app.questBasePath}/midi${id}.mid`);
    this.midiPlayer.play();
  }

  pauseSong() {
    if (!this.enabled) return;

    this.currentSongId = -1;
    this.midiPlayer.pause();
  }
}

export class QuestMakerApp extends App<QuestMaker.State> {
  public questBasePath = '';
  public soundManager = new SoundManager(this);

  // constructor(pixi: PIXI.Application, state: QuestMaker.State) {
  //   super(pixi, state);
  // }

  createTileSprite(screenTile: QuestMaker.ScreenTile) {
    const tile = this.state.quest.tiles[screenTile.tile];
    if (!tile) {
      console.warn('unknown tile', screenTile.tile);
      return this.createGraphicSprite(0, 0);
    }

    let cset = screenTile.cset ?? 3;
    if (screenTile.cset !== undefined && screenTile.cset > 0) {
      cset = screenTile.cset;
    }

    if (tile.numFrames && tile.numFrames > 1) {
      // TODO: improve API so we don't just ignore a newly created Sprite.
      const textures = Array.from(Array(tile.numFrames))
        .map((_, i) => this._createSpriteForTileFrame(tile, i, cset).texture);
      const sprite = new PIXI.AnimatedSprite(textures);
      sprite.animationSpeed = tile.speed || 1 / 60;
      sprite.play();
      return sprite;
    } else {
      return this._createSpriteForTileFrame(tile, 0, cset);
    }
  }

  _createSpriteForTileFrame(tile: QuestMaker.Tile, frame: number, cset: number) {
    const sprite = this.createGraphicSprite(tile.graphicId + frame, cset, tile.extraCset);

    if (tile.flipHorizontal && tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.W;
    } else if (tile.flipHorizontal) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL;
    } else if (tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_VERTICAL;
    }

    return sprite;
  }

  createGraphicSprite(graphicId: number, cset = 0, extraCset?: QuestMaker.Tile['extraCset']) {
    const graphic = this.state.quest.graphics[graphicId];
    const sprite = this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);

    if (this.state.quest.csets.length === 0 || !this.state.quest.csets[cset]) {
      return sprite;
    }

    if (extraCset && !this.state.quest.csets[cset + extraCset.offset]) {
      return sprite;
    }

    // TODO: Probably not very performant?
    // Might be cause of lag on screen transition.

    if (extraCset) {
      const replacements1 = this._getColorReplacementsForCset(cset);
      const replacements2 = this._getColorReplacementsForCset(cset + extraCset.offset);
      return this._multiColorReplaceTwoCsetsSpriteCopy(sprite, extraCset.quadrants, replacements1, replacements2, 0.0001);
    }

    return this._multiColorReplaceSpriteCopy(sprite, this._getColorReplacementsForCset(cset), 0.0001);
  }

  _multiColorReplaceSpriteCopy(sprite: PIXI.Sprite, replacements: number[][], epsilon: number) {
    const container = new PIXI.Container();
    const filter = new MultiColorReplaceFilter(replacements, epsilon);
    container.addChild(sprite);
    container.filters = [filter];
    const brt = new PIXI.BaseRenderTexture({ width: sprite.width, height: sprite.height });
    const rt = new PIXI.RenderTexture(brt);
    const spriteCopy = new PIXI.Sprite(rt);
    this.pixi.renderer.render(container, rt);
    return spriteCopy;
  }

  _multiColorReplaceTwoCsetsSpriteCopy(sprite: PIXI.Sprite, quadrants: boolean[], replacements1: number[][], replacements2: number[][], epsilon: number) {
    const container = new PIXI.Container();

    const sprite1 = new PIXI.Sprite(sprite.texture);
    container.addChild(sprite1);
    sprite1.filters = [
      new MultiColorReplaceFilter(replacements1, epsilon),
    ];
    const mask1 = new PIXI.Graphics();
    sprite1.mask = mask1;
    mask1.beginFill(0);
    for (let i = 0; i < 4; i++) {
      if (quadrants[i]) continue;
      mask1.drawRect(i % 2 ? 0 : 8, i >= 2 ? 8 : 0, 8, 8);
    }
    mask1.endFill();

    const sprite2 = new PIXI.Sprite(sprite.texture);
    container.addChild(sprite2);
    sprite2.filters = [
      new MultiColorReplaceFilter(replacements2, epsilon),
    ];
    const mask2 = new PIXI.Graphics();
    sprite2.mask = mask2;
    mask2.beginFill(0);
    for (let i = 0; i < 4; i++) {
      if (!quadrants[i]) continue;
      mask2.drawRect(i % 2 ? 0 : 8, i >= 2 ? 8 : 0, 8, 8);
    }
    mask2.endFill();

    const brt = new PIXI.BaseRenderTexture({ width: sprite.width, height: sprite.height });
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
