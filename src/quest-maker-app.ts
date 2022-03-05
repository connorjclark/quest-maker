import { App } from "./engine/app.js";
// @ts-ignore
import Timidity from 'timidity';
import { makeUI } from "./ui/QuestMaker.js";
import { tileSize } from "./constants.js";

const audioBufferCache = new Map<string, AudioBuffer>();

const SONG_VOLUME = 0.4;
const SFX_VOLUME = 0.6;

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
    // The songs are quite loud, so turn down the volume.
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = SONG_VOLUME;
    gainNode.connect(this.audioContext.destination);
    this.midiPlayer._node.disconnect(this.audioContext.destination)
    this.midiPlayer._node.connect(gainNode);

    // Loop.
    this.midiPlayer.on('ended', () => {
      this.midiPlayer.seek(0);
      this.midiPlayer.play();
    });
  }

  playSfx(id: number) {
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
      gainNode.gain.value = SFX_VOLUME;
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
  private _textureCache = new Map<string, PIXI.Texture>();

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

  createTileSprite(screenTile: QuestMaker.ScreenTile, paletteIndex: number) {
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
      return new PIXI.Sprite();
    }

    const texture = this._getGraphicTexture(graphicId, paletteIndex, cset, extraCset);
    if (texture) return new PIXI.Sprite(new PIXI.Texture(texture.baseTexture, texture.frame));
    return new PIXI.Sprite();
  }

  _getGraphicTexture(graphicId: number, paletteIndex: number, cset: number, extraCset?: QuestMaker.Tile['extraCset']) {
    // @ts-expect-error
    const format = window.qstData.TILE.tiles[graphicId].format;

    let key = `${graphicId},${paletteIndex},${cset},${format}`;
    if (extraCset) key += `,${extraCset.offset},${extraCset.quadrants.map(q => q ? '1' : '0')}`;
    let texture = this._textureCache.get(key);
    if (texture) return texture;

    // @ts-expect-error
    const pixels: number[] = window.qstData.TILE.tiles[graphicId].pixels;
    const tileData = new Uint8Array(pixels.length);
    const tileValDivisor = format === 2 ? 255 : 15;
    for (let x = 0; x < tileSize; x++) {
      for (let y = 0; y < tileSize; y++) {
        const i = x + y * tileSize;
        tileData[i] = pixels[i] * (255 / tileValDivisor);
      }
    }
    const tileTexture = PIXI.Texture.fromBuffer(tileData, tileSize, tileSize, { format: PIXI.FORMATS.ALPHA });

    const makeSprite = (csetToUse: number) => {
      const myfilter = new PIXI.Filter('', `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform sampler2D Palette;
      void main()
      {
          float index = texture2D(uSampler, vTextureCoord).a;
          if (index == 0.0) discard;
          vec2 coord = vec2(index, 0);
          gl_FragColor = vec4(texture2D(Palette, coord).rgb, 1.0);
      }
      `);

      const colors = this._getColorsForCset(format, paletteIndex, csetToUse);
      const colorData = new Uint8Array(colors.length * 3);
      for (let i = 0; i < colors.length; i++) {
        colorData[i * 3 + 0] = colors[i].r;
        colorData[i * 3 + 1] = colors[i].g;
        colorData[i * 3 + 2] = colors[i].b;
      }
      const colorTexture = PIXI.Texture.fromBuffer(colorData, colors.length, 1, { format: PIXI.FORMATS.RGB });
      colorTexture.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
      myfilter.uniforms.Palette = colorTexture;

      const sprite = new PIXI.Sprite(tileTexture);
      sprite.filters = [myfilter];
      return sprite;
    };

    let displayObject;
    let spritesToCleanUp = [];
    if (extraCset) {
      const sprite1 = makeSprite(cset);
      const sprite2 = makeSprite(cset + extraCset.offset);
      spritesToCleanUp.push(sprite1);
      spritesToCleanUp.push(sprite2);
      displayObject = this._maskSpritesWithQuadrants(sprite1, sprite2, extraCset.quadrants);
    } else {
      displayObject = makeSprite(cset);
      spritesToCleanUp.push(displayObject);
    }

    // After all that work, the result is cached into a texture.
    const brt = new PIXI.BaseRenderTexture({ width: displayObject.width, height: displayObject.height });
    const rt = new PIXI.RenderTexture(brt);
    rt.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
    this.pixi.renderer.render(displayObject, rt);
    this._textureCache.set(key, rt);

    // Maybe not necessary...
    for (const sprite of spritesToCleanUp) {
      sprite.filters = [];
    }

    return rt;
  }

  _maskSpritesWithQuadrants(sprite1: PIXI.Sprite, sprite2: PIXI.Sprite, quadrants: boolean[]) {
    const container = new PIXI.Container();

    container.addChild(sprite1);
    const mask1 = new PIXI.Graphics();
    sprite1.mask = mask1;
    mask1.beginFill(0);
    for (let i = 0; i < 4; i++) {
      if (quadrants[i]) continue;
      mask1.drawRect(i % 2 ? 0 : 8, i >= 2 ? 8 : 0, 8, 8);
    }
    mask1.endFill();

    container.addChild(sprite2);
    const mask2 = new PIXI.Graphics();
    sprite2.mask = mask2;
    mask2.beginFill(0);
    for (let i = 0; i < 4; i++) {
      if (!quadrants[i]) continue;
      mask2.drawRect(i % 2 ? 0 : 8, i >= 2 ? 8 : 0, 8, 8);
    }
    mask2.endFill();

    return container;
  }

  _getColorsForCset(format: number, paletteIndex: number, cset: number) {
    if (!this.state.quest.color) {
      throw new Error('quest has no color data');
    }

    const palette = this.state.quest.color.palettes[paletteIndex];

    let colors;
    if (format === 2) {
      // 8 bit. `cset` will do nothing.
      if (cset < 0 || cset > 255) {
        console.error('got bad cset, resetting to 0', cset);
        cset = 0;
      }
      colors = [];
      for (let c = 0; c < 15; c++) {
        colors.push(...this.state.quest.color.csets[palette.csets[c]].colors);
      }
      // I don't know why... but I need 16 more colors here to make the shader work.
      // Randomly picking the first cset.
      // I haven't seen an 8bit tile use a higher index than 240 yet... but if there is
      // on then this will have the wrong colors.
      colors.push(...this.state.quest.color.csets[palette.csets[0]].colors);
    } else {
      // 4 bit.
      if (cset < 0 || cset > 15) {
        console.error('got bad cset, resetting to 0', cset);
        cset = 0;
      }
      cset = palette.csets[cset];
      colors = this.state.quest.color.csets[cset].colors;
    }

    return colors;
  }
};
