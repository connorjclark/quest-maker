import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";

const { screenWidth, screenHeight, tileSize } = constants;

interface TextureFrame {
  textures: PIXI.Texture[];
}

let paused = false;

const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];

const inBounds = (x: number, y: number, width: number, height: number) => x >= 0 && y >= 0 && x < width && y < height;

// TODO: move to engine/
class EntitySpriteBase extends PIXI.AnimatedSprite {
  private textureFrames: Record<string, TextureFrame> = {};
  private currentTextureFrame?: TextureFrame;

  constructor() {
    super([new PIXI.Texture(new PIXI.BaseTexture())]);
  }

  addTextureFrame(name: string, textures: PIXI.Texture[], rotate?: PIXI.GD8Symmetry) {
    this.textureFrames[name] = { textures };

    if (rotate) {
      for (const texture of textures) {
        texture.rotate = rotate;
      }
    }
  }

  setTextureFrame(name: string) {
    const frame = this.textureFrames[name];
    if (!frame || frame === this.currentTextureFrame) return;
    this.currentTextureFrame = frame;

    this.textures = frame.textures;
    this.animationSpeed = 0.15;
    this.textures.length ? this.play() : this.stop();
  }
}

abstract class QuestEntitySpriteBase extends EntitySpriteBase {
  abstract tick(mode: PlayGameMode, dt: number): any;
}

class QuestProjectileSprite extends QuestEntitySpriteBase {
  public speed = 1;
  public delta = { x: 0, y: 0 };

  tick(mode: PlayGameMode, dt: number) {
    const speed = this.speed * dt;
    this.x += this.delta.x * speed;
    this.y += this.delta.y * speed;

    if (Math.abs(mode.heroSprite.x - this.x) < 8 && Math.abs(mode.heroSprite.y - this.y) < 8) {
      console.log('ouch'); // TODO
    }

    if (this.x < 0 || this.y < 0) {
      // mode.removeEntity(this);
    }
  }
}

class QuestEntitySprite extends QuestEntitySpriteBase {
  public delta = { x: 0, y: 0 };
  public speed = 1;
  public homingFactor = 64 / 255;
  public directionChangeFactor = 4 / 16;
  public haltFactor = 3 / 16;
  public isHero = false;

  private haltTimer: number | null = null;

  tick(mode: PlayGameMode, dt: number) {
    const speed = this.speed * dt;

    if (!this.isHero) {
      // Every tile moved stats this algorithm.
      const currentTile = { x: Math.floor(this.x / tileSize), y: Math.floor(this.y / tileSize) };
      const nextTile = { x: Math.floor((this.x + this.delta.x * speed) / tileSize), y: Math.floor((this.y + this.delta.y * speed) / tileSize) };
      const notMoving = this.delta.x === 0 && this.delta.y === 0;

      if (this.haltTimer !== null) {
        this.haltTimer -= dt;
        if (this.haltTimer <= 0) this.haltTimer = null;
        return;
      }

      if (notMoving || currentTile.x !== nextTile.x || currentTile.y !== nextTile.y) {
        if (Math.random() < this.haltFactor) {
          this.haltTimer = 30;
          mode.createProjectile({ x: Math.sign(this.delta.x), y: Math.sign(this.delta.y) }, nextTile.x, nextTile.y, 2);
          return;
        }

        if (Math.random() < this.homingFactor) {
          // TODO
          this.delta = directions[Math.floor(Math.random() * 4)];
        } else if (Math.random() < this.directionChangeFactor || !notMoving) {
          this.delta = directions[Math.floor(Math.random() * 4)];
        }
      }
    }

    const dx = this.delta.x;
    const dy = this.delta.y;
    if (dx !== 0 || dy !== 0) {
      let direction = 'down';
      if (dx === 1) direction = 'right';
      else if (dx === -1) direction = 'left';
      else if (dy === -1) direction = 'up';
      else if (dy === 1) direction = 'down';

      this.play();
      this.setTextureFrame(direction);
      this.x += dx * speed;
      this.y += dy * speed;

      // Align with half-axis if moving in other direction.
      const halfSize = tileSize / 2;
      const quarterSize = tileSize / 4;
      if (dx === 0) {
        let diff = this.x % halfSize;
        if (diff !== 0) {
          this.x += this.speed * Math.sign(diff - quarterSize);
          this.x = Math.round(this.x); // TODO: lil choppy.
        }
      } else if (dy === 0) {
        let diff = this.y % halfSize;
        if (diff !== 0) {
          this.y += this.speed * Math.sign(diff - quarterSize);
          this.y = Math.round(this.y);
        }
      }
    } else {
      this.stop();
    }
  }
}

export class PlayGameMode extends QuestMakerMode {
  public heroSprite = new QuestEntitySprite();
  private entities: Array<{ sprite: QuestEntitySpriteBase }> = [];

  private entityLayer = new PIXI.Container();
  private tileLayer = new PIXI.Container();

  init() {
    super.init();
    const state = this.app.state;

    this.container.scale.x = this.container.scale.y = 2;
    this.container.addChild(this.tileLayer);
    this.container.addChild(this.entityLayer);

    this.heroSprite.x = screenWidth * tileSize / 2;
    this.heroSprite.y = screenHeight * tileSize / 2;
    this.heroSprite.isHero = true;
    this.heroSprite.speed = 1.5;

    this.heroSprite.addTextureFrame('down', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 1).texture,
    ]);
    this.heroSprite.addTextureFrame('up', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 4).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 5).texture,
    ]);
    this.heroSprite.addTextureFrame('right', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 2).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 3).texture,
    ]);
    this.heroSprite.addTextureFrame('left', [
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 2).texture,
      this.app.createTileSprite(state.quest.misc.HERO_TILE_START + 3).texture,
    ], PIXI.groupD8.MIRROR_HORIZONTAL);

    this.heroSprite.setTextureFrame('down');
  }

  show() {
    super.show();
    const state = this.app.state;

    this.tileLayer.removeChildren();
    this.entityLayer.removeChildren();

    this.entities = [];
    this.entities.push({ sprite: this.heroSprite });

    const mask = new PIXI.Graphics();
    mask.beginFill(0);
    mask.drawRect(0, 0, tileSize * screenWidth * this.container.scale.x, tileSize * screenHeight * this.container.scale.y);
    mask.endFill();
    this.container.mask = mask;

    this.tileLayer.addChild(this.createScreenContainer(state.screenX, state.screenY));
    this.entityLayer.addChild(this.heroSprite);

    this.onEnterScreen();
  }

  tick(dt: number) {
    const state = this.app.state;
    const heroSprite = this.heroSprite;

    if (this.app.keys.up['Space']) {
      paused = !paused;
    }
    if (paused) return;

    let transition = state.game.screenTransition;
    if (transition) {
      if (transition.frames === 0) {
        this.tileLayer.addChildAt(transition.newScreenContainer, 0);
        transition.newScreenContainer.x = screenWidth * tileSize * Math.sign(transition.screenDelta.x);
        transition.newScreenContainer.y = screenHeight * tileSize * Math.sign(transition.screenDelta.y);
      }

      const duration = 50;
      this.container.x = (transition.frames / duration) * screenWidth * tileSize * this.container.scale.x * Math.sign(-transition.screenDelta.x);
      this.container.y = (transition.frames / duration) * screenHeight * tileSize * this.container.scale.y * Math.sign(-transition.screenDelta.y);

      transition.frames += dt;
      if (transition.frames >= duration) {
        state.screenX = transition.screen.x;
        state.screenY = transition.screen.y;
        state.currentScreen = state.quest.screens[state.screenX][state.screenY];
        delete state.game.screenTransition;
        this.container.x = 0;
        this.container.y = 0;

        if (Math.sign(transition.screenDelta.x) === 1) this.heroSprite.x = 0;
        else if (Math.sign(transition.screenDelta.x) === -1) this.heroSprite.x = (tileSize - 1) * screenWidth;
        else if (Math.sign(transition.screenDelta.y) === 1) this.heroSprite.y = 0;
        else if (Math.sign(transition.screenDelta.y) === -1) this.heroSprite.y = (tileSize - 1) * screenHeight - 5; // ?

        this.show();
      }

      return;
    }

    let dx = 0, dy = 0;
    if (this.app.keys.pressed['ArrowLeft']) dx -= 1;
    else if (this.app.keys.pressed['ArrowRight']) dx += 1;
    else if (this.app.keys.pressed['ArrowUp']) dy -= 1;
    else if (this.app.keys.pressed['ArrowDown']) dy += 1;
    heroSprite.delta.x = dx;
    heroSprite.delta.y = dy;

    for (let data of this.entities.values()) {
      data.sprite.tick(this, dt);
    }

    if (dx !== 0 || dy !== 0) {
      const sidePoints: Record<string, { x: number, y: number }> = {
        bottomLeft: {
          x: heroSprite.x,
          y: heroSprite.y + heroSprite.height - 1,
        },
        bottomRight: {
          x: heroSprite.x + heroSprite.width - 1,
          y: heroSprite.y + heroSprite.height - 1,
        },
        topLeft: {
          x: heroSprite.x,
          y: heroSprite.y + heroSprite.height / 2,
        },
        topRight: {
          x: heroSprite.x + heroSprite.width - 1,
          y: heroSprite.y + heroSprite.height / 2,
        },
      };

      const sideTiles: Record<string, { x: number, y: number }> = {};
      for (const [name, point] of Object.entries(sidePoints)) {
        sideTiles[name] = {
          x: Math.floor(point.x / tileSize),
          y: Math.floor(point.y / tileSize),
        };
      }

      const correctionVectors: Array<{ x: number, y: number }> = [];
      const isSolid = (x: number, y: number) => {
        const tileNumber = this.app.state.currentScreen.tiles[x][y].tile;
        return !this.app.state.quest.tiles[tileNumber].walkable;
      };

      for (const name of Object.keys(sideTiles)) {
        const tile = sideTiles[name];
        if (tile.x < 0 || tile.y < 0 || tile.x >= screenWidth || tile.y >= screenHeight) continue;
        if (!isSolid(tile.x, tile.y)) continue;

        const point = sidePoints[name];
        const isRight = name.includes('Right'); // lol
        const isTop = name.includes('top'); // lol

        if (isRight) {
          correctionVectors.push({ x: -point.x % 16, y: 0 });
        } else {
          correctionVectors.push({ x: 16 - point.x % 16, y: 0 });
        }

        if (isTop) {
          correctionVectors.push({ x: 0, y: 16 - point.y % 16 });
        } else {
          correctionVectors.push({ x: 0, y: -point.y % 16 });
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
    }

    // Transition screen when hero enters edge.
    let transitionX = 0;
    let transitionY = 0;

    if (heroSprite.x + heroSprite.width / 2 > tileSize * screenWidth) {
      transitionX = 1;
    } else if (heroSprite.x + heroSprite.width / 2 < 0) {
      transitionX = -1;
    } else if (heroSprite.y + heroSprite.height / 2 < 0) {
      transitionY = -1;
    } else if (heroSprite.y + heroSprite.height / 2 > tileSize * screenHeight) {
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

  createEntityFromEnemy(enemy: QuestMaker.Enemy, x: number, y: number) {
    const entitySprite = new QuestEntitySprite();
    entitySprite.x = x * tileSize;
    entitySprite.y = y * tileSize;

    for (const [name, frames] of Object.entries(enemy.frames)) {
      const textures = frames.map(f => this.app.createTileSprite(f).texture);
      entitySprite.addTextureFrame(name, textures);
    }
    if (enemy.frames.left && !enemy.frames.right) {
      const textures = enemy.frames.left.map(f => this.app.createTileSprite(f).texture);
      entitySprite.addTextureFrame('right', textures, PIXI.groupD8.MIRROR_HORIZONTAL);
    }
    if (enemy.frames.down && !enemy.frames.up) {
      const textures = enemy.frames.down.map(f => this.app.createTileSprite(f).texture);
      entitySprite.addTextureFrame('up', textures, PIXI.groupD8.MIRROR_VERTICAL);
    }
    entitySprite.setTextureFrame(Object.keys(enemy.frames)[0]);

    this.entities.push({ sprite: entitySprite });
    this.entityLayer.addChild(entitySprite);
    return entitySprite;
  }

  createProjectile(delta: { x: number, y: number }, x: number, y: number, speed: number) {
    const entitySprite = new QuestProjectileSprite();
    entitySprite.x = x * tileSize;
    entitySprite.y = y * tileSize;
    entitySprite.delta = delta;
    entitySprite.speed = speed;

    const textures = [7].map(f => this.app.createTileSprite(f).texture);
    entitySprite.addTextureFrame('default', textures);
    entitySprite.setTextureFrame('default');

    this.entities.push({ sprite: entitySprite });
    this.entityLayer.addChild(entitySprite);

    return entitySprite;
  }

  removeEntity() {
    // TODO
  }

  onEnterScreen() {
    // Hardcode an enemy.
    let enemy = this.app.state.quest.enemies[0];
    let x = 5;
    let y = 5;
    let entity = this.createEntityFromEnemy(enemy, x, y);
    entity.speed = 0.75;
  }
}
