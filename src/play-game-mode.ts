import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";

const { screenWidth, screenHeight, tileSize } = constants;

interface TextureFrame {
  textures: PIXI.Texture[];
  scale?: { x: number, y: number };
}

// TODO: move to engine/
class EntitySprite extends PIXI.AnimatedSprite {
  private textureFrames: Record<string, TextureFrame> = {};
  private currentTextureFrame?: TextureFrame;

  constructor() {
    super([new PIXI.Texture(new PIXI.BaseTexture())]);
    this.anchor.x = this.anchor.y = 0.5;
  }

  addTextureFrame(name: string, textures: PIXI.Texture[], scale?: { x: number, y: number }) {
    this.textureFrames[name] = { textures, scale };
  }

  setTextureFrame(name: string) {
    const frame = this.textureFrames[name];
    if (!frame || frame === this.currentTextureFrame) return;
    this.currentTextureFrame = frame;

    this.textures = frame.textures;
    this.animationSpeed = 0.15;
    this.textures.length ? this.play() : this.stop();
    this.scale.set(frame.scale ? frame.scale.x : 1, frame.scale ? frame.scale.y : 1);
  }
}

export class PlayGameMode extends QuestMakerMode {
  private heroEntity: QuestMaker.Entity = { type: 0, x: screenWidth * tileSize / 2, y: screenHeight * tileSize / 2 };
  private sprites = new Map<QuestMaker.Entity, EntitySprite>();

  show() {
    super.show();
    const state = this.app.state;

    this.container.scale.x = this.container.scale.y = 2;
    this.container.removeChildren();
    this.sprites.clear();

    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        const { tile } = state.currentScreen.tiles[x][y];
        const sprite = this.app.createTileSprite(tile);
        sprite.x = x * tileSize;
        sprite.y = y * tileSize;
        this.container.addChild(sprite);
      }
    }

    const heroSprite = new EntitySprite();
    heroSprite.addTextureFrame('down', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 1).texture,
    ]);
    heroSprite.addTextureFrame('up', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 4).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 5).texture,
    ]);
    heroSprite.addTextureFrame('right', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 2).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 3).texture,
    ]);
    heroSprite.addTextureFrame('left', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 2).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 3).texture,
    ], { x: -1, y: 1 });

    heroSprite.x = this.heroEntity.x;
    heroSprite.y = this.heroEntity.y

    heroSprite.setTextureFrame('down');

    this.container.addChild(heroSprite);
    this.sprites.set(this.heroEntity, heroSprite);
  }

  tick(dt: number) {
    const heroSprite = this.sprites.get(this.heroEntity);
    if (!heroSprite) throw new Error('...');

    let dx = 0, dy = 0;
    if (this.app.keys.pressed['ArrowLeft']) dx -= 1;
    else if (this.app.keys.pressed['ArrowRight']) dx += 1;
    else if (this.app.keys.pressed['ArrowUp']) dy -= 1;
    else if (this.app.keys.pressed['ArrowDown']) dy += 1;

    if (dx !== 0 || dy !== 0) {
      let direction = 'down';
      if (dx === 1) direction = 'right';
      else if (dx === -1) direction = 'left';
      else if (dy === -1) direction = 'up';
      else if (dy === 1) direction = 'down';

      const speed = 1.5 * dt;
      heroSprite.play();
      heroSprite.setTextureFrame(direction);
      heroSprite.x += dx * speed;
      heroSprite.y += dy * speed;

      const sidePoints: Record<string, {x: number, y: number}> = {
        bottomLeft: {
          x: heroSprite.x - heroSprite.anchor.x * heroSprite.width,
          y: heroSprite.y + heroSprite.anchor.y * heroSprite.height - 1,
        },
        bottomRight: {
          x: heroSprite.x + heroSprite.anchor.x * heroSprite.width - 1,
          y: heroSprite.y + heroSprite.anchor.y * heroSprite.height - 1,
        },
        topLeft: {
          x: heroSprite.x - heroSprite.anchor.x * heroSprite.width,
          y: heroSprite.y,
        },
        topRight: {
          x: heroSprite.x + heroSprite.anchor.x * heroSprite.width - 1,
          y: heroSprite.y,
        },
      };

      const sideTiles: Record<string, {x: number, y: number}> = {};
      for (const [name, point] of Object.entries(sidePoints)) {
        sideTiles[name] = {
          x: Math.floor(point.x / tileSize),
          y: Math.floor(point.y / tileSize),
        };
      }

      const correctionVectors = [];
      for (const name of Object.keys(sideTiles)) {
        const tile = sideTiles[name];
        if (tile.x < 0 || tile.y < 0 || tile.x >= screenWidth || tile.y >= screenHeight) continue;

        const tileNumber = this.app.state.currentScreen.tiles[tile.x][tile.y].tile;
        const isSolid = !this.app.state.quest.tiles[tileNumber].walkable;
        if (!isSolid) continue;

        const point = sidePoints[name];
        const isRight = heroSprite.x < point.x;
        const isTop = heroSprite.y === point.y;

        if (isRight) {
          correctionVectors.push({
            x: -point.x % 16,
            y: 0,
          });
        } else {
          correctionVectors.push({
            x: 16 - point.x % 16,
            y: 0,
          });
        }

        if (isTop) {
          correctionVectors.push({
            x: 0,
            y: 16 - point.y % 16,
          });
        } else {
          correctionVectors.push({
            x: 0,
            y: -point.y % 16,
          });
        }
      }

      let smallestCorrectionVector = null;
      const dist = ({ x, y }: {x: number; y: number}) => Math.abs(x) + Math.abs(y);
      for (const correctionVector of correctionVectors) {
        if (!smallestCorrectionVector || dist(smallestCorrectionVector) > dist(correctionVector)) {
          smallestCorrectionVector = correctionVector;
        }
      }

      if (smallestCorrectionVector) {
        heroSprite.x += smallestCorrectionVector.x;
        heroSprite.y += smallestCorrectionVector.y;
      }

      // @ts-ignore
      if (window.debug) {
        for (const name of Object.keys(sidePoints)) {
          const sideTile = sideTiles[name];
          const debug = this.app.debug(`sideTile ${name}`);
          debug.alpha = 0.3;
          debug.x = sideTile.x * tileSize;
          debug.y = sideTile.y * tileSize;
          debug.clear();
          debug.lineStyle(1, 0xff0000);
          debug.beginFill();
          debug.drawRect(0, 0, tileSize, tileSize);
          debug.endFill();
          this.container.addChild(debug);
        }

        for (const name of Object.keys(sidePoints)) {
          const sidePoint = sidePoints[name];
          const debug = this.app.debug(`sidePoint ${name}`);
          debug.x = sidePoint.x;
          debug.y = sidePoint.y;
          debug.clear();
          debug.lineStyle(1, 0x00ff00);
          debug.beginFill();
          debug.drawRect(-1, -1, 2, 2);
          debug.endFill();
          this.container.addChild(debug);
        }
      }

      // Align with half-axis if moving in other direction.
      const halfSize = tileSize / 2;
      const quarterSize = tileSize / 4;
      if (dx === 0) {
        let diff = heroSprite.x % halfSize;
        if (diff !== 0) {
          heroSprite.x += speed * Math.sign(diff - quarterSize);
          heroSprite.x = Math.round(heroSprite.x); // TODO: lil choppy.
        }
      } else if (dy === 0) {
        let diff = heroSprite.y % halfSize;
        if (diff !== 0) {
          heroSprite.y += speed * Math.sign(diff - quarterSize);
          heroSprite.y = Math.round(heroSprite.y);
        }
      }
    } else {
      heroSprite.stop();
    }
  }
}
