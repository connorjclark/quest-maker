import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";

const { screenWidth, screenHeight, tileSize } = constants;

interface TextureFrame {
  textures: PIXI.Texture[];
  scale?: { x: number, y: number };
}

const inBounds = (x: number, y: number, width: number, height: number) => x >= 0 && y >= 0 && x < width && y < height;

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
  private entities: QuestMaker.Entity[] = [];
  private sprites = new Map<QuestMaker.Entity, EntitySprite>();

  show() {
    super.show();
    const state = this.app.state;

    this.container.removeChildren();
    this.sprites.clear();
    this.container.scale.x = this.container.scale.y = 2;

    const mask = new PIXI.Graphics();
    mask.beginFill(0);
    mask.drawRect(0, 0, tileSize * screenWidth * this.container.scale.x, tileSize * screenHeight * this.container.scale.y);
    mask.endFill();
    this.container.mask = mask;

    this.container.addChild(this.createScreenContainer(state.screenX, state.screenY));

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

    this.onEnterScreen();
  }

  onEnterScreen() {
    // Hardcode an enemy.
    let enemy = this.app.state.quest.enemies[0];

    let x = 2;
    let y = 2;

    const entity: QuestMaker.Entity = {
      type: 0,
      x: x * tileSize,
      y: y * tileSize,
    };
    this.entities.push(entity);
    const entitySprite = new EntitySprite();

    for (const [name, frames] of Object.entries(enemy.frames)) {
      const textures = frames.map(f => this.app.createTileSprite(f).texture);
      entitySprite.addTextureFrame(name, textures);
    }
    entitySprite.setTextureFrame(Object.keys(enemy.frames)[0]);

    this.sprites.set(entity, entitySprite);
    entitySprite.x = entity.x;
    entitySprite.y = entity.y;
    this.container.addChild(entitySprite);
  }

  tick(dt: number) {
    const state = this.app.state;

    const heroSprite = this.sprites.get(this.heroEntity);
    if (!heroSprite) throw new Error('...');

    let transition = state.game.screenTransition;
    if (transition) {
      if (transition.frames === 0) {
        this.container.addChildAt(transition.newScreenContainer, 0);
        transition.newScreenContainer.x = screenWidth * tileSize * Math.sign(transition.screenDelta.x);
        transition.newScreenContainer.y = screenHeight * tileSize * Math.sign(transition.screenDelta.y);
      }

      const duration = 50;
      this.container.position.x = (transition.frames / duration) * screenWidth * tileSize * this.container.scale.x * Math.sign(-transition.screenDelta.x);
      this.container.position.y = (transition.frames / duration) * screenHeight * tileSize * this.container.scale.y * Math.sign(-transition.screenDelta.y);

      transition.frames += dt;
      if (transition.frames >= duration) {
        state.screenX = transition.screen.x;
        state.screenY = transition.screen.y;
        state.currentScreen = state.quest.screens[state.screenX][state.screenY];
        delete state.game.screenTransition;
        this.container.position.x = 0;
        this.container.position.y = 0;

        this.heroEntity.x = heroSprite.x;
        this.heroEntity.y = heroSprite.y;
        if (Math.sign(transition.screenDelta.x) === 1) this.heroEntity.x = 0;
        else if (Math.sign(transition.screenDelta.x) === -1) this.heroEntity.x = tileSize * screenWidth;
        else if (Math.sign(transition.screenDelta.y) === 1) this.heroEntity.y = 0;
        else if (Math.sign(transition.screenDelta.y) === -1) this.heroEntity.y = tileSize * screenHeight;

        this.show();
      }

      this.onEnterScreen();
      return;
    }

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

      const sidePoints: Record<string, { x: number, y: number }> = {
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

      const sideTiles: Record<string, { x: number, y: number }> = {};
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
      const dist = ({ x, y }: { x: number; y: number }) => Math.abs(x) + Math.abs(y);
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

    // Handle enemies.
    for (let entity of this.entities) {
      const sprite = this.sprites.get(entity);
      if (!sprite) continue;

      entity.x += 1 * dt;

      sprite.x = entity.x;
      sprite.y = entity.y;
    }

    // Transition screen when hero enters edge.
    let transitionX = 0;
    let transitionY = 0;

    if (heroSprite.x > tileSize * screenWidth) {
      transitionX = 1;
    } else if (heroSprite.x < 0) {
      transitionX = -1;
    } else if (heroSprite.y < 0) {
      transitionY = -1;
    } else if (heroSprite.y > tileSize * screenHeight) {
      transitionY = 1;
    }

    if (transitionX !== 0 || transitionY !== 0) {
      if (inBounds(state.screenX + transitionX, state.screenY + transitionY, state.quest.screens.length, state.quest.screens[0].length)) {
        state.game.screenTransition = {
          frames: 0,
          screen: { x: state.screenX + transitionX, y: state.screenY + transitionY },
          screenDelta: { x: transitionX, y: transitionY },
          newScreenContainer: this.createScreenContainer(state.screenX + transitionX, state.screenY + transitionY),
        };
      }
    }
  }

  createScreenContainer(sx: number, sy: number) {
    const container = new PIXI.Container();
    const state = this.app.state;
    const screen = state.quest.screens[sx][sy];

    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        const { tile } = screen.tiles[x][y];
        const sprite = this.app.createTileSprite(tile);
        sprite.x = x * tileSize;
        sprite.y = y * tileSize;
        container.addChild(sprite);
      }
    }

    return container;
  }
}
