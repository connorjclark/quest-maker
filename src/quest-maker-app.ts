import { App } from "./engine/app";
import { MultiColorReplaceFilter } from "@pixi/filter-multi-color-replace";
// @ts-ignore
import Timidity from 'timidity';
import { makeUI } from "./ui/QuestMaker";

const audioBufferCache = new Map<string, AudioBuffer>();

// This is for Safari.
function unlockAudioContext(audioContext: AudioContext) {
  if (audioContext.state !== 'suspended') return audioContext;

  const b = document.body;
  const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
  events.forEach(e => b.addEventListener(e, unlock, false));
  function unlock() { audioContext.resume().then(clean); }
  function clean() { events.forEach(e => b.removeEventListener(e, unlock)); }

  return audioContext;
}

class SoundManager {
  private midiPlayer = new Timidity(location.pathname);
  private currentSongId = -1;
  private enabled = !window.IS_DEV;
  private audioContext = unlockAudioContext(this.midiPlayer._audioContext);

  constructor(private app: QuestMakerApp) {
    this.midiPlayer.on('ended', () => {
      this.midiPlayer.seek(0);
      this.midiPlayer.play();
    });
  }

  playSfx(id: number, volume = 1) {
    if (!id) return;
    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    // @ts-expect-error
    const sfxUrl = this.app.state.quest.getSfx(id - 1);
    if (!sfxUrl) {
      console.error('invalid sfx:', id);
      return;
    }

    // This was simple (just used new Audio(sfxUrl).play()), but Safari has a huge lag
    // with Audio (and <audio>) and only allows one sound to play at a time, so must use
    // new WebAudio api.

    const play = () => {
      const buffer = audioBufferCache.get(sfxUrl);
      if (!buffer) return;

      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = buffer;
      // sourceNode.connect(this.audioContext.destination);

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;
      sourceNode.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      sourceNode.start();
      sourceNode.addEventListener('ended', () => sourceNode.disconnect());
    };

    if (audioBufferCache.has(sfxUrl)) {
      play();
    } else {
      fetch(sfxUrl)
        .then(resp => resp.arrayBuffer())
        .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          audioBufferCache.set(sfxUrl, buffer);
          play();
        });
    }
  }

  playSong(id: number) {
    if (!this.enabled) return;
    if (id === this.currentSongId) return;

    let url;
    // @ts-expect-error
    if (this.app.state.quest.getMidi) {
      // @ts-expect-error
      url = this.app.state.quest.getMidi(id);
    } else {
      url = `${this.app.questBasePath}/midi${id}.mid`;
    }
    if (!url) return;

    this.currentSongId = id;
    this.midiPlayer.load(url);
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

  constructor(pixi: PIXI.Application, state: QuestMaker.State, public ui: ReturnType<typeof makeUI>) {
    super(pixi, state);

    // @ts-expect-error
    window.createDebugGraphic = (id: number, cset: number) => {
      const sprite = this.createGraphicSprite(id, cset);
      // @ts-expect-error
      if (this.debugSprite) this.pixi.stage.removeChild(this.debugSprite);
      // @ts-expect-error
      this.debugSprite = sprite;
      this.pixi.stage.addChild(sprite);
    };
  }

  updateUrl() {
    const url = new URL(location.href);
    const searchParams = new URLSearchParams();

    searchParams.set('quest', String(url.searchParams.get('quest')));
    if (this.state.dmapIndex === -1) {
      searchParams.set('map', String(this.state.mapIndex));
      searchParams.delete('dmap');
    } else {
      searchParams.set('dmap', String(this.state.dmapIndex));
      searchParams.delete('map');
    }
    searchParams.set('x', String(this.state.screenX));
    searchParams.set('y', String(this.state.screenY));
    if (url.searchParams.get('dev')) searchParams.set('dev', '');

    url.search = searchParams.toString();
    if (this.state.mode === 'play') url.search += '&play';
    history.replaceState({}, '', url);
  }

  resize() {
    this.pixi.stage.scale.set(this.pixi.renderer.width / this.pixi.stage.getLocalBounds().width);
  }

  getCurrentPaletteIndex() {
    return this.getPaletteIndex(this.state.currentDMap, this.state.currentScreen);
  }

  getPaletteIndex(dmap: QuestMaker.DMap | undefined, screen: QuestMaker.Screen) {
    let paletteIndex = 0;
    if (dmap) paletteIndex = dmap.color + 1;
    if (screen.color) paletteIndex = screen.color + 1;
    return paletteIndex;
  }

  createItemSprite(id: number) {
    const { tile, cset } = this.state.quest.items[id];
    return this.createGraphicSprite(tile, -1, cset);
  }

  createTileSprite(screenTile: QuestMaker.ScreenTile, paletteIndex = -1) {
    const tile = this.state.quest.tiles[screenTile.tile];
    if (!tile) {
      console.warn('unknown tile', screenTile.tile);
      return this.createGraphicSprite(0, paletteIndex, 0);
    }

    let cset = screenTile.cset ?? 3;
    if (screenTile.cset !== undefined && screenTile.cset > 0) {
      cset = screenTile.cset;
    }

    if (tile.numFrames && tile.numFrames > 1) {
      // TODO: improve API so we don't just ignore a newly created Sprite.
      const textures = Array.from(Array(tile.numFrames))
        .map((_, i) => this._createSpriteForTileFrame(tile, i, paletteIndex, cset).texture);
      const sprite = new PIXI.AnimatedSprite(textures);
      sprite.animationSpeed = tile.speed || 1 / 60;
      sprite.play();
      return sprite;
    } else {
      return this._createSpriteForTileFrame(tile, 0, paletteIndex, cset);
    }
  }

  _createSpriteForTileFrame(tile: QuestMaker.Tile, frame: number, paletteIndex: number, cset: number) {
    const sprite = this.createGraphicSprite(tile.graphicId + frame, paletteIndex, cset, tile.extraCset);

    if (tile.flipHorizontal && tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.W;
    } else if (tile.flipHorizontal) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL;
    } else if (tile.flipVertical) {
      sprite.texture.rotate = PIXI.groupD8.MIRROR_VERTICAL;
    }

    return sprite;
  }

  createGraphicSprite(graphicId: number, paletteIndex = -1, cset = 0, extraCset?: QuestMaker.Tile['extraCset']) {
    if (paletteIndex === -1) paletteIndex = this.getCurrentPaletteIndex();

    const graphic = this.state.quest.graphics[graphicId];
    if (!graphic) {
      console.error('bad graphic:', graphicId);
    }

    const sprite = this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);
    if (!this.state.quest.color) {
      return sprite;
    }

    // TODO: Probably not very performant?
    // Might be cause of lag on screen transition.

    try {
      if (extraCset) {
        const replacements1 = this._getColorReplacementsForCset(paletteIndex, cset);
        const replacements2 = this._getColorReplacementsForCset(paletteIndex, cset + extraCset.offset);
        return this._multiColorReplaceTwoCsetsSpriteCopy(sprite, extraCset.quadrants, replacements1, replacements2, 0.0001);
      }

      return this._multiColorReplaceSpriteCopy(sprite, this._getColorReplacementsForCset(paletteIndex, cset), 0.0001);
    } catch (err) {
      // TODO
      console.error({ graphicId, cset }, err);
      return sprite;
    }
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
  _getColorReplacementsForCset(paletteIndex: number, cset: number) {
    if (!this.state.quest.color) {
      throw new Error('quest has no color data');
    }

    if (cset < 0 || cset > 15) {
      console.error('got bad cset, resetting to 0', cset);
      cset = 0;
    }

    const palette = this.state.quest.color.palettes[paletteIndex];
    cset = palette.csets[cset];

    let replacements = this.replacementsCache.get(cset);
    if (replacements) return replacements;

    if (!this.state.quest.color.csets[cset]) debugger;
    const { colors } = this.state.quest.color.csets[cset];
    replacements = colors.map(({ r, g, b }, i) => {
      return [i, 65536 * r + 256 * g + b];
    });
    this.replacementsCache.set(cset, replacements);

    return replacements;
  }
};
