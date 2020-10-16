import { App } from "./engine/app";
import * as PIXIBatchRenderer from 'pixi-batch-renderer';
import { MultiColorReplaceFilter } from "@pixi/filter-multi-color-replace";


const vs = undefined;
// const fs = `
// varying vec2 vTextureCoord;
// uniform sampler2D uSampler;
// uniform sampler2D Palette;

// void main(){vec4 color = texture2D(uSampler, vTextureCoord);
//   if (color.a == 0.0) discard;
//   float red = (color.r*255.0);
//   vec2 coord = vec2(red / (16.0 - 1.0), 0);
//   vec4 indexedColor = texture2D(Palette, coord);
//   gl_FragColor = indexedColor;
// }
// `;
const fs = `
varying vec2 vTextureCoord;
varying vec4 vColor;
varying float vTextureId;
uniform sampler2D uSamplers[%count%];

uniform sampler2D Palette;

void main(){
  vec4 color;
  %forloop%

  if (color.a == 0.0) discard;
  float red = (color.r*255.0);
  vec2 coord = vec2(red / (16.0 - 1.0), 0);
  vec4 indexedColor = texture2D(Palette, coord);
  gl_FragColor = indexedColor;
}
`;

const colors = [
  {
    "r": 0,
    "g": 0,
    "b": 0
  },
  {
    "r": 120,
    "g": 204,
    "b": 100
  },
  {
    "r": 80,
    "g": 168,
    "b": 80
  },
  {
    "r": 44,
    "g": 92,
    "b": 64
  },
  {
    "r": 16,
    "g": 56,
    "b": 28
  },
  {
    "r": 100,
    "g": 144,
    "b": 76
  },
  {
    "r": 64,
    "g": 108,
    "b": 64
  },
  {
    "r": 208,
    "g": 176,
    "b": 140
  },
  {
    "r": 188,
    "g": 148,
    "b": 116
  },
  {
    "r": 184,
    "g": 168,
    "b": 144
  },
  {
    "r": 152,
    "g": 136,
    "b": 112
  },
  {
    "r": 112,
    "g": 96,
    "b": 80
  },
  {
    "r": 72,
    "g": 64,
    "b": 48
  },
  {
    "r": 40,
    "g": 32,
    "b": 24
  },
  {
    "r": 24,
    "g": 16,
    "b": 16
  },
  {
    "r": 0,
    "g": 0,
    "b": 0
  }
];

const REPLACEMENTS = colors.map(({r, g, b}, i) => {
  return [65536 * i + 256 * i + i, 65536 * r + 256 * g + b];
});

const uniforms = {
  Palette: getPallete(colors)
};

// const program = new PIXI.Program(vs, fs);
// const shader = new PIXI.Shader(program, uniforms);


class TestSystem extends PIXI.ObjectRenderer {
  start() {
  }
  stop() {
  }
  render(el: PIXI.Sprite) {
    // console.log(1, this.renderer);
    this.renderer.shader.bind(shader);
    el.pluginName = 'batch';
    this.renderer.render(el);
    el.pluginName = 'indexed';
    // super.render(el);
    // this.renderer.geometry.draw()

    // super.render(el);
  }
}

// @ts-ignore
const oldgenerateShader = PIXI.BatchShaderGenerator.prototype.generateShader;
// @ts-ignore
PIXI.BatchShaderGenerator.prototype.generateShader = function (maxTextures: number) {
  const shader = oldgenerateShader.call(this, maxTextures - 1);
  shader.uniforms.Palette = uniforms.Palette;
  return shader;
};

const oldinitFlushBuffers = PIXI.AbstractBatchRenderer.prototype.initFlushBuffers;
PIXI.AbstractBatchRenderer.prototype.initFlushBuffers = function (this: PIXI.AbstractBatchRenderer) {
  // @ts-ignore
  this.MAX_TEXTURES -= 1;
  console.log(this.MAX_TEXTURES);
  oldinitFlushBuffers.call(this);
};

const IndexedPluginBaseClass: typeof PIXI.AbstractBatchRenderer = PIXI.BatchPluginFactory.create({ fragment: fs });
class IndexedPlugin extends IndexedPluginBaseClass {
  constructor(renderer: PIXI.Renderer) {
    super(renderer);
  }
}
// @ts-ignore
PIXI.Renderer.registerPlugin('indexed', IndexedPlugin);


// Create a shader function from a shader template!
const shaderFunction = new PIXIBatchRenderer.BatchShaderFactory(
  // Vertex Shader
  `
  attribute vec2 aVertex;
  attribute vec2 aTextureCoord;
  attribute float aTextureId;
  
  varying float vTextureId;
  varying vec2 vTextureCoord;
  
  uniform mat3 projectionMatrix;
  
  void main()
  {
      gl_Position = vec4((projectionMatrix * vec3(aVertex.xy, 1)), 1);
      vTextureId = aTextureId;
      vTextureCoord = aTextureCoord;
  }
  `,

  // Fragment Shader
  `
  uniform sampler2D uSamplers[%texturesPerBatch%]; /* %texturesPerBatch% is a macro and will become a number */
  varying float vTextureId;
  varying vec2 vTextureCoord;

  uniform sampler2D Palette;
  
  void main(void){
      vec4 color;
  
      for (int k = 0; k < %texturesPerBatch%; ++k)
      {
          if (int(vTextureId) == k)
              color = texture2D(uSamplers[k], vTextureCoord);
      }
  
      gl_FragColor = color;
  }
  `,
  {}).derive();

// Create batch renderer class
// const Indexed2Plugin = PIXIBatchRenderer.BatchRendererPluginFactory.from({
//   attribSet: [],
//   // indexProperty: "indices",
//   textureProperty: "texture",
//   texIDAttrib: "aTextureId", // this will be used to locate the texture in the fragment shader later
//   shaderFunction
// });
// @ts-ignore
// PIXI.Renderer.registerPlugin('indexed2', Indexed2Plugin);

let palleteTexture: PIXI.Texture;
function getPallete(colors: QuestMaker.Color[]) {
  if (palleteTexture) return palleteTexture;

  const numbers = [];
  for (const color of colors) {
    numbers.push(color.r);
    numbers.push(color.g);
    numbers.push(color.b);
    numbers.push(255);
  }
  const data = new Uint8Array(256 * 4);
  function setPalette(index: number, r: number, g: number, b: number, a: number) {
    data[index * 4 + 0] = r;
    data[index * 4 + 1] = g;
    data[index * 4 + 2] = b;
    data[index * 4 + 3] = a;
  }
  for (const color of colors) {
    const i = colors.indexOf(color);
    if (i === 0) {
      setPalette(i, 0, 0, 0, 0);
    } else {
      setPalette(i, color.r, color.g, color.b, 255);
    }
  }

  palleteTexture = PIXI.Texture.fromBuffer(data, 16, 16);
  palleteTexture.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
  return palleteTexture;
}

class PaletteSwap extends PIXI.Filter {
  constructor(paletteTexture: PIXI.Texture) {
    const vs = undefined;
    const fs = 'varying vec2 vTextureCoord;' +
      'uniform sampler2D uSampler;' +
      'uniform sampler2D Palette;' +
      'void main()' +
      '{' +
      'vec4 color = texture2D(uSampler, vTextureCoord);' +
      'if (color.a == 0.0) discard;' +
      'float red = (color.r*255.0);' +
      'vec2 coord = vec2(red / (16.0 - 1.0), 0);' +
      'vec4 indexedColor = texture2D(Palette, coord);' +
      'gl_FragColor = indexedColor;' +
      '}';
    super(vs, fs);

    this.uniforms.Palette = paletteTexture;
  }
}

export class QuestMakerApp extends App<QuestMaker.State> {
  private texCache: Record<string, PIXI.Texture> = {};

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
      const sprite = this._createSpriteForTileFrame(tile, 0);

      // sprite.pluginName = 'indexed';

      // if (Math.random() > 0.95) {
      // sprite.filters = [
      //   new MultiColorReplaceFilter(
      //     [
      //       [0, 0x00FF00],
      //       [0x010101, 0xFFFFFF],
      //     ], 0.2)
      //   ];
      // }
      if (window.app && !window.app.currentMode.container.filters) {
        // window.app.currentMode.container.filters = [new PaletteSwap(getPallete(this.state.quest.colors))];
        // this.applyPaletteFilter(window.app.currentMode.container);
      }
      // if (Math.random() > 0.15) {
      // sprite.filters = [new PaletteSwap(getPallete(this.state.quest.colors))];
      // sprite.pluginName = 'indexed';
      // console.log(sprite.width)
      // sprite.filterArea = new PIXI.Rectangle(0, 0, 16, 16);
      // BatchPluginFactory
      // }
      return sprite;
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
    const sprite = this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);
    // sprite.pluginName = 'indexed2';

    return this._multiColorReplaceSpriteCopy(this.pixi.renderer, sprite, REPLACEMENTS, 0.0001);

    // return sprite;
  }

  // _createTextureForGraphic(graphicId: number, cset = 0) {
  //   const index = graphicId + ',' + 1;
  //   if (this.texCache[index]) return this.texCache[index];

  //   const graphic = this.state.quest.graphics[graphicId];

  //   let renderer = PIXI.autoDetectRenderer();
  //   let renderTexture = PIXI.RenderTexture.create({ width: 16, height: 16 });

  //   const sprite = this.createSprite(graphic.file, graphic.x, graphic.y, graphic.width, graphic.height);
  //   // sprite.position.x = 800/2;
  //   // sprite.position.y = 600/2;
  //   // sprite.anchor.x = 0.5;
  //   // sprite.anchor.y = 0.5;

  //   renderer.render(sprite, renderTexture);

  //   renderTexture.destroy();

  //   this.texCache[index] = sprite.texture;
  //   return sprite.texture;
  // }

  _multiColorReplaceSpriteCopy(renderer, sprite, replacements, epsilon) {
    let container = new PIXI.Container();
    let filter = new MultiColorReplaceFilter(replacements, epsilon);
    container.addChild(sprite);
    container.filters = [filter];
    let brt = new PIXI.BaseRenderTexture(sprite.width, sprite.height);
    let rt = new PIXI.RenderTexture(brt);
    var sprite_copy = new PIXI.Sprite(rt);
    renderer.render(container, rt);
    return sprite_copy;
  }

  applyPaletteFilter(sprite: PIXI.DisplayObject) {
    // if (!sprite.filters) sprite.filters = [];
    // sprite.filters.push(new PaletteSwap(getPallete(this.state.quest.colors)));
  }
};
