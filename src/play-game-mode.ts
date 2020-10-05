import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";
import { TileType, EnemyType } from './types';
import 'pixi-plugin-bump';
import * as Utils from './utils';

const { screenWidth, screenHeight, tileSize } = constants;

interface TextureFrame {
  textures: PIXI.Texture[];
}

const DEFAULT_HERO_SPEED = 1.5;

let paused = false;

const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];

const inBounds = (x: number, y: number, width: number, height: number) => x >= 0 && y >= 0 && x < width && y < height;

const isIntersecting = (r1: PIXI.Rectangle, r2: PIXI.Rectangle) => {
  return !(r2.x > (r1.x + r1.width) ||
    (r2.x + r2.width) < r1.x ||
    r2.y > (r1.y + r1.height) ||
    (r2.y + r2.height) < r1.y);
}

const isSolid = (state: QuestMaker.State, x: number, y: number, quadrant?: number) => {
  if (!inBounds(x, y, screenWidth, screenHeight)) return true;

  const tileNumber = state.currentScreen.tiles[x][y].tile;
  if (quadrant === undefined) {
    return !state.quest.tiles[tileNumber].walkable.every(b => b);
  } else {
    return !state.quest.tiles[tileNumber].walkable[quadrant];
  }
};

function pointToQuadrant(x: number, y: number) {
  let quadrant = 0;
  if (x % tileSize > tileSize / 2) quadrant += 1;
  if (y % tileSize > tileSize / 2) quadrant += 2;
  return quadrant;
}

// TODO: move to engine/
class EntityBase extends PIXI.AnimatedSprite {
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

abstract class QuestEntityBase extends EntityBase {
  public life = 3;
  public speed = 1;
  public vx = 0;
  public vy = 0;

  public hitDirection?: { x: number, y: number };
  public hitTimer = 0;

  abstract tick(mode: PlayGameMode, dt: number): any;

  hit(direction: { x: number, y: number }) {
    if (this.hitDirection) return;

    this.life -= 1;
    this.hitDirection = direction;
    this.hitTimer = 10;
  }
}

class QuestProjectileEntity extends QuestEntityBase {
  public delta = { x: 0, y: 0 };

  tick(mode: PlayGameMode, dt: number) {
    const speed = this.speed * dt;

    this.vx = this.delta.x * speed;
    this.vy = this.delta.y * speed;

    this.x += this.vx;
    this.y += this.vy;

    const shouldRemove = !inBounds(this.x + this.width / 2, this.y + this.height / 2, (screenWidth + 1) * tileSize, (screenHeight + 1) * tileSize);
    if (shouldRemove) mode.removeEntity(this);
  }
}

class MiscBag<A extends Record<string, any>> {
  private data: Partial<A> = {};

  get<T extends keyof A>(id: T): A[T] {
    // @ts-ignore
    return this.data[id];
  }

  set<T extends keyof A>(id: T, value: A[T]) {
    this.data[id] = value;
  }

  clear() {
    this.data = {};
  }
}

class QuestEntity extends QuestEntityBase {
  public type = EnemyType.NORMAL;
  public direction = { ...directions[Math.floor(Math.random() * directions.length)] };
  public moving = true;
  public isHero = false;
  public misc = new MiscBag<QuestMaker.EnemyAttributes>();

  private haltTimer: number | null = null;

  constructor(attributes: Partial<QuestMaker.EnemyAttributes>) {
    super();
    for (const [id, value] of Object.entries(attributes)) {
      // @ts-ignore
      this.misc.set(id, value);
    }

    this.speed = this.misc.get('enemy.speed') || 0.5;
  }

  tick(mode: PlayGameMode, dt: number) {
    const speed = this.speed * dt;

    if (!this.isHero && this.life) {
      if (this.type === EnemyType.NORMAL) {
        this._normalMovement(mode, speed);
      } else if (this.type === EnemyType.LEEVER) {
        this._leeverMovement(mode, speed);
      }
    }

    let dx = 0;
    let dy = 0;

    if (this.hitDirection) {
      dx += this.hitDirection.x * 4;
      dy += this.hitDirection.y * 4;

      this.alpha = Math.floor(this.hitTimer * 1.5) % 2;

      if (this.hitTimer-- <= 0) {
        this.hitTimer = 0;
        this.alpha = 1;
        delete this.hitDirection;

        if (this.life <= 0) {
          mode.removeEntity(this);
          console.log('die');
          mode.getScreenState().enemiesKilled += 1;
          return;
        }
      }
    }

    if (this.moving && !this.hitDirection) {
      let canMove = true;
      if (!this.isHero && this.haltTimer !== null) {
        this.haltTimer -= dt;
        if (this.haltTimer <= 0) this.haltTimer = null;
        canMove = false;
      }

      if (canMove) {
        dx += this.direction.x * speed;
        dy += this.direction.y * speed;
      }
    }

    this.vx = dx;
    this.vy = dy;

    if (dx !== 0 || dy !== 0) {
      this.x += dx;
      this.y += dy;

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
    }

    if (this.moving) {
      this.setTextureFrame(this.getDirectionName());
      this.play();
    } else {
      this.stop();
    }
  }

  _normalMovement(mode: PlayGameMode, speed: number) {
    const weaponId = this.misc.get('enemy.weapon');
    const homingFactor = this.misc.get('enemy.homing');
    const directionChangeFactor = this.misc.get('enemy.directionChange');
    const haltFactor = this.misc.get('enemy.halt');

    let shouldChangeDirection = false;

    let hitPoint = { x: this.x, y: this.y };
    if (this.direction.x === 1) hitPoint.x += this.width;
    if (this.direction.y === 1) hitPoint.y += this.height;

    const currentTile = { x: Math.floor(hitPoint.x / tileSize), y: Math.floor(hitPoint.y / tileSize) };
    const nextTile = { x: Math.floor((hitPoint.x + this.direction.x * speed) / tileSize), y: Math.floor((hitPoint.y + this.direction.y * speed) / tileSize) };

    // @ts-ignore
    if (window.debug) {
      const debug = mode.app.debug(`nextTile ${mode.entities.findIndex(e => e.sprite === this)}`);
      debug.alpha = 0.5;
      debug.x = nextTile.x * tileSize;
      debug.y = nextTile.y * tileSize;
      debug.clear();
      debug.lineStyle(1, 0x00ff00);
      debug.beginFill();
      debug.drawRect(0, 0, tileSize, tileSize);
      debug.endFill();
      // @ts-ignore
      mode.container.addChild(debug);
    }

    if (this.haltTimer === null) {
      if (isSolid(mode.app.state, nextTile.x, nextTile.y)) {
        shouldChangeDirection = true;
      }

      if (shouldChangeDirection || currentTile.x !== nextTile.x || currentTile.y !== nextTile.y) {
        if (Math.random() < haltFactor) {
          this.haltTimer = 30;
          if (weaponId) {
            mode.createProjectile(weaponId, { x: Math.sign(this.direction.x), y: Math.sign(this.direction.y) }, currentTile.x, currentTile.y, 2);
          }
          return;
        }

        let availableDirections = directions.filter(d => {
          return !isSolid(mode.app.state, currentTile.x + d.x, currentTile.y + d.y);
        });
        if (!availableDirections.length) availableDirections = directions;

        if (Math.random() < homingFactor) {
          // TODO
          this.direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
          shouldChangeDirection = false;
        } else if (Math.random() < directionChangeFactor) {
          shouldChangeDirection = true;
        }

        if (shouldChangeDirection) {
          this.direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
        }
      }
    }
  }

  _leeverMovement(mode: PlayGameMode, speed: number) {
    // TODO: have init step.
    // TODO: no hit if not emerged.
    if (!this.misc.get('enemy.leever.emergedState')) {
      this.misc.set('enemy.leever.emergedState', 'submerged');
    }

    const emergedState = this.misc.get('enemy.leever.emergedState');
    const emergedStyle = this.misc.get('enemy.leever.emergeStyle');
    const timeSinceStateChange = Date.now() - (this.misc.get('enemy.leever.emergedStateTimeChanged') || 0);
    const timeSinceLastEmerge = Date.now() - (mode.screenAttributes.get('screen.leever.lastEmergedTime') || 0);

    if (emergedState === 'submerged') {
      this.haltTimer = 100;
      this.visible = false;

      const numberEmergedLeevers = mode.entities.reduce((acc, cur) => {
        const entity = cur.sprite as QuestEntity;
        if (entity.misc) {
          const state = entity.misc.get('enemy.leever.emergedState');
          if (!state) return acc;
          return acc + (state === 'submerged' ? 0 : 1);
        }
        return acc;
      }, 0);

      if (numberEmergedLeevers < 2 && timeSinceLastEmerge > 500 && timeSinceStateChange > 1000) {
        this.misc.set('enemy.leever.emergedState', 'emerged');
        this.misc.set('enemy.leever.emergedStateTimeChanged', Date.now());
        mode.screenAttributes.set('screen.leever.lastEmergedTime', Date.now());

        if (emergedStyle === 'hero-path') {
          const pos = {
            x: Math.round(mode.heroEntity.x / tileSize),
            y: Math.round(mode.heroEntity.y / tileSize),
          };
          if (mode.heroEntity.direction.x !== 0) {
            pos.x += Math.sign(mode.heroEntity.direction.x) * 3;
          } else {
            pos.y += Math.sign(mode.heroEntity.direction.y) * 3;
          }
          this.x = pos.x * tileSize;
          this.y = pos.y * tileSize;

          this.direction = { ...mode.heroEntity.direction };
          this.direction.x *= -1;
          this.direction.y *= -1;
        } else {
          this.direction = { ...directions[Utils.random(0, directions.length)] };
        }

        this.setTextureFrame('emerging');
        this.loop = false;
        this.onComplete = () => {
          this.setTextureFrame('moving');
          this.haltTimer = 0;
          this.loop = true;
          delete this.onComplete;
        };
      }
    } else if (emergedState === 'emerged') {
      this.visible = true;

      if (timeSinceStateChange > 1000 * 2) {
        this.misc.set('enemy.leever.emergedState', 'submerging');
        this.misc.set('enemy.leever.emergedStateTimeChanged', Date.now());

        this.setTextureFrame('submerging');
        this.loop = false;
        this.onComplete = () => {
          this.misc.set('enemy.leever.emergedState', 'submerged');
          this.misc.set('enemy.leever.emergedStateTimeChanged', Date.now());
          delete this.onComplete;
        };
      }
    }
  }

  getDirectionName() {
    const dx = this.direction.x;
    const dy = this.direction.y;

    let direction = 'down';
    if (dx === 1) direction = 'right';
    else if (dx === -1) direction = 'left';
    else if (dy === -1) direction = 'up';
    else if (dy === 1) direction = 'down';

    return direction;
  }
}

class HitTest {
  public sections: Record<string, { color: number, objects: PIXI.DisplayObject[] }> = {};
  public container = new PIXI.Container();
  private bump = new PIXI.extras.Bump();

  addSection(name: string, color: number) {
    this.sections[name] = { color, objects: [] };
  }

  clear() {
    this.sections = {};
    this.container.removeChildren();
  }

  add(sectionName: string, x: number, y: number, width: number, height: number) {
    const section = this.sections[sectionName];
    const gfx = new PIXI.Graphics();
    gfx.x = x;
    gfx.y = y;
    gfx.beginFill(section.color, 0.5);
    gfx.drawRect(0, 0, width, height);
    gfx.endFill();

    section.objects.push(gfx);
    this.container.addChild(gfx);
  }

  hit(object: PIXI.DisplayObject, objects: PIXI.DisplayObject[]): string | false {
    let result: string | false = false;
    this.bump.hit(object, objects, true, false, false, (collision: string | false) => {
      result = collision;
    });
    return result;
  }

  test(object: PIXI.DisplayObject, objects: PIXI.DisplayObject[]) {
    let result = false;
    this.bump.hit(object, objects, false, false, false, (collision: boolean) => {
      result = collision;
    });
    return result;
  }
}

export class PlayGameMode extends QuestMakerMode {
  public heroEntity = new QuestEntity({});
  public entities: Array<{ sprite: QuestEntityBase }> = [];
  public screenAttributes = new MiscBag<QuestMaker.ScreenAttributes>();

  private entityLayer = new PIXI.Container();
  private tileLayer = new PIXI.Container();
  private layers: PIXI.Container[] = [
    new PIXI.Container(),
    this.tileLayer,
    new PIXI.Container(),
    this.entityLayer,
    new PIXI.Container(),
  ];

  private swordSprite = this.app.createGraphicSprite(this.app.state.quest.misc.SWORD_GFX_START);
  private hitTest = new HitTest();

  init() {
    super.init();
    const state = this.app.state;

    state.game.screenStates.clear();
    this.screenAttributes.clear();

    this.container.scale.x = this.container.scale.y = 2;
    for (const layer of this.layers) {
      this.container.addChild(layer);
    }

    this.layers[2].addChild(this.swordSprite);
    this.swordSprite.alpha = 0;

    this.heroEntity.x = screenWidth * tileSize / 2;
    this.heroEntity.y = screenHeight * tileSize / 2;
    this.heroEntity.isHero = true;
    this.heroEntity.life = Number.MAX_SAFE_INTEGER;

    this.heroEntity.speed = DEFAULT_HERO_SPEED;

    this.heroEntity.addTextureFrame('down', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START).texture,
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 1).texture,
    ]);
    this.heroEntity.addTextureFrame('up', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 4).texture,
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 5).texture,
    ]);
    this.heroEntity.addTextureFrame('right', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 2).texture,
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 3).texture,
    ]);
    this.heroEntity.addTextureFrame('left', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 2).texture,
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 3).texture,
    ], PIXI.groupD8.MIRROR_HORIZONTAL);
    this.heroEntity.addTextureFrame('useItem-down', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 6).texture,
    ]);
    this.heroEntity.addTextureFrame('useItem-right', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 7).texture,
    ]);
    this.heroEntity.addTextureFrame('useItem-left', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 7).texture,
    ], PIXI.groupD8.MIRROR_HORIZONTAL);
    this.heroEntity.addTextureFrame('useItem-up', [
      this.app.createGraphicSprite(state.quest.misc.HERO_GFX_START + 8).texture,
    ], PIXI.groupD8.MIRROR_HORIZONTAL);

    this.heroEntity.setTextureFrame('down');
  }

  show() {
    super.show();
    const state = this.app.state;

    this.tileLayer.removeChildren();
    this.entityLayer.removeChildren();

    this.entities = [];
    this.entities.push({ sprite: this.heroEntity });

    const mask = new PIXI.Graphics();
    mask.beginFill(0);
    mask.drawRect(0, 0, tileSize * screenWidth * this.container.scale.x, tileSize * screenHeight * this.container.scale.y);
    mask.endFill();
    this.container.mask = mask;

    this.tileLayer.addChild(this.createScreenContainer(state.screenX, state.screenY));
    this.entityLayer.addChild(this.heroEntity);

    this.hitTest.clear();
    this.createScreenHitAreas();
    // @ts-ignore
    if (window.debug) {
      this.layers[4].addChild(this.hitTest.container);
    }

    this.onEnterScreen();
  }

  tick(dt: number) {
    const state = this.app.state;
    const heroEntity = this.heroEntity;

    if (this.app.keys.up['Space']) {
      paused = !paused;
    }
    if (paused) return;

    let transition = state.game.screenTransition;
    if (transition) {
      this.performScreenTransition(transition);
      return;
    }

    let dx = 0, dy = 0;
    if (this.app.keys.pressed['ArrowLeft']) dx -= 1;
    else if (this.app.keys.pressed['ArrowRight']) dx += 1;
    else if (this.app.keys.pressed['ArrowUp']) dy -= 1;
    else if (this.app.keys.pressed['ArrowDown']) dy += 1;

    if (dx !== 0 || dy !== 0) {
      heroEntity.direction.x = dx;
      heroEntity.direction.y = dy;

      // TODO: this can skip thru walls if there is lag (see Bump).
      heroEntity.vx = dx * heroEntity.speed * dt;
      heroEntity.vy = dy * heroEntity.speed * dt;
      this.heroEntity.moving = true;
    } else {
      this.heroEntity.moving = false;
    }

    if (this.app.keys.down['KeyX']) {
      heroEntity.setTextureFrame('useItem-' + heroEntity.getDirectionName());
      this.performSwordAttack();
      state.game.moveFreeze = 10;

      for (const entity of this.entities) {
        if (entity.sprite === this.heroEntity) continue;
        if (!isIntersecting(entity.sprite.getBounds(), this.swordSprite.getBounds())) continue;

        // @ts-ignore
        entity.sprite.hit && entity.sprite.hit(heroEntity.direction);
        // this.removeEntity(entity.sprite);
      }
    }

    if (state.game.moveFreeze !== undefined) {
      if (state.game.moveFreeze <= 0) {
        delete state.game.moveFreeze;
        heroEntity.setTextureFrame(heroEntity.getDirectionName());
        this.swordSprite.alpha = 0;
      } else {
        state.game.moveFreeze -= 1;
        heroEntity.moving = false;
      }
    }

    // Hacky way to make only bottom half of hero solid.
    const heroHitSprite = new PIXI.Graphics();
    heroHitSprite.drawRect(0, 0, 1, 1)
    heroHitSprite.x = this.heroEntity.x;
    heroHitSprite.y = this.heroEntity.y + tileSize / 2;
    heroHitSprite.width = tileSize;
    heroHitSprite.height = tileSize / 2;
    // TODO: skip if hittimer.
    this.hitTest.hit(heroHitSprite, this.hitTest.sections.screen.objects);
    this.heroEntity.x = heroHitSprite.x;
    this.heroEntity.y = heroHitSprite.y - tileSize / 2;

    for (let data of this.entities.values()) {
      data.sprite.tick(this, dt);
      if (data.sprite === this.heroEntity) continue;

      if (data.sprite instanceof QuestProjectileEntity) {
        if (this.hitTest.test(data.sprite, this.hitTest.sections.screen.objects)) {
          this.removeEntity(data.sprite);
        }
      } else {
        this.hitTest.hit(data.sprite, this.hitTest.sections.screen.objects);
        data.sprite.x = Utils.clamp(0, data.sprite.x, screenWidth * tileSize - data.sprite.width);
        data.sprite.y = Utils.clamp(0, data.sprite.y, screenHeight * tileSize - data.sprite.height);
      }

      // TODO: need to fork Bump and make `.test` return a side.
      const collision = !data.sprite.hitTimer && this.hitTest.hit(heroHitSprite, [data.sprite]);
      if (collision) {
        const dir = { x: 0, y: 0 };
        if (collision === 'left') dir.x = 1;
        if (collision === 'right') dir.x -= 1;
        if (collision === 'top') dir.y += 1;
        if (collision === 'bottom') dir.y -= 1;
        this.heroEntity.hit(dir);
        if (data.sprite instanceof QuestProjectileEntity) this.removeEntity(data.sprite);
      }
    }

    heroEntity.speed = DEFAULT_HERO_SPEED;

    const delta = 3;
    const center = {
      x: heroEntity.x + heroEntity.width / 2,
      y: heroEntity.y + heroEntity.height - delta - 1,
    };
    const sidePoints: Record<string, { x: number, y: number, dx: number, dy: number }> = {
      bottomLeft: {
        x: heroEntity.x + 1,
        y: center.y + delta,
        dx: -1,
        dy: 1,
      },
      bottom: {
        x: center.x,
        y: center.y + delta,
        dx: 0,
        dy: 1,
      },
      bottomRight: {
        x: heroEntity.x + heroEntity.width - 1,
        y: center.y + delta,
        dx: 1,
        dy: 1,
      },
      topLeft: {
        x: heroEntity.x + 1,
        y: center.y - delta,
        dx: -1,
        dy: -1,
      },
      top: {
        x: center.x,
        y: center.y - delta,
        dx: 0,
        dy: -1,
      },
      topRight: {
        x: heroEntity.x + heroEntity.width - 1,
        y: center.y - delta,
        dx: 1,
        dy: -1,
      },
    };

    const sideTiles: Record<string, { x: number, y: number, quadrant: number }> = {};
    // TODO: name => direction?
    for (const [name, point] of Object.entries(sidePoints)) {
      sideTiles[name] = {
        x: Math.floor(point.x / tileSize),
        y: Math.floor(point.y / tileSize),
        quadrant: pointToQuadrant(point.x, point.y),
      };
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
        debug.lineStyle(1);
        debug.beginFill(0x00ff00);
        debug.drawRect(-1, -1, 2, 2);
        debug.endFill();
        this.container.addChild(debug);
      }
    }

    // Interact with touched tiles.
    // First group by point.
    const sideTilesByPoints: Array<{ x: number, y: number, names: string[] }> = [];
    for (const [name, point] of Object.entries(sideTiles)) {
      let grouped = sideTilesByPoints.find(g => g.x === point.x && g.y === point.y);
      if (!grouped) {
        grouped = { ...point, names: [] };
        sideTilesByPoints.push(grouped);
      }
      grouped.names.push(name);
    }
    for (const { x, y, names } of sideTilesByPoints) {
      if (!inBounds(x, y, screenWidth, screenHeight)) continue;

      const { tile } = state.currentScreen.tiles[x][y];
      const tile_ = state.quest.tiles[tile]; // ... naming issue ....
      if (tile_.type === 'default') continue;

      this.performTileAction(tile_.type, names);
    }

    // Transition screen when hero enters edge.
    let transitionX = 0;
    let transitionY = 0;

    if (heroEntity.x + heroEntity.width / 2 > tileSize * screenWidth) {
      transitionX = 1;
    } else if (heroEntity.x + heroEntity.width / 2 < 0) {
      transitionX = -1;
    } else if (heroEntity.y + heroEntity.height / 2 < 0) {
      transitionY = -1;
    } else if (heroEntity.y + heroEntity.height / 2 > tileSize * screenHeight) {
      transitionY = 1;
    }

    if (transitionX !== 0 || transitionY !== 0) {
      if (inBounds(state.screenX + transitionX, state.screenY + transitionY, state.quest.screens.length, state.quest.screens[0].length)) {
        state.game.screenTransition = {
          type: 'scroll',
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

  createScreenHitAreas() {
    this.hitTest.addSection('screen', 0xff0000);

    const state = this.app.state;
    const screen = state.currentScreen;

    const add = (x: number, y: number, size: number) => {
      this.hitTest.add('screen', x, y, size, size);
    };

    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        const { tile } = screen.tiles[x][y];
        const walkable = state.quest.tiles[tile].walkable;
        const allSolid = walkable.every(w => !w);

        // Just make one big square. Should make hit tests faster.
        if (allSolid) {
          add(x * tileSize, y * tileSize, tileSize);
          continue;
        }

        for (let quadrant = 0; quadrant < walkable.length; quadrant++) {
          if (walkable[quadrant]) continue;

          let hx = x * tileSize;
          let hy = y * tileSize;
          if (quadrant % 2 === 1) hx += tileSize / 2;
          if (quadrant >= 2) hy += tileSize / 2;
          add(hx, hy, tileSize / 2);
        }
      }
    }
  }

  spawnEnemy(enemy: QuestMaker.Enemy, x: number, y: number) {
    const shouldSpawnWithCloud = enemy.type !== EnemyType.LEEVER;
    if (shouldSpawnWithCloud) {
      const spawnEntity = new QuestEntity({});
      spawnEntity.x = x * tileSize;
      spawnEntity.y = y * tileSize;

      const textures = [
        this.app.state.quest.misc.SPAWN_GFX_START,
        this.app.state.quest.misc.SPAWN_GFX_START + 1,
        this.app.state.quest.misc.SPAWN_GFX_START + 2,
      ].map(f => this.app.createGraphicSprite(f).texture);
      spawnEntity.addTextureFrame('default', textures);
      spawnEntity.setTextureFrame('default');
      spawnEntity.loop = false;

      spawnEntity.onComplete = () => {
        this.removeEntity(spawnEntity);
        this.createEntityFromEnemy(enemy, x, y);
      };

      // There's no tick needed, so don't add to this.entities.
      this.entityLayer.addChild(spawnEntity);
    } else {
      this.createEntityFromEnemy(enemy, x, y);
    }
  }

  createEntityFromEnemy(enemy: QuestMaker.Enemy, x: number, y: number) {
    const entity = new QuestEntity(enemy.attributes);
    entity.x = x * tileSize;
    entity.y = y * tileSize;
    entity.type = enemy.type;
    entity.life = 2;

    for (const [name, frames] of Object.entries(enemy.frames)) {
      const textures = frames.map(f => this.app.createGraphicSprite(f).texture);
      entity.addTextureFrame(name, textures);
    }
    if (enemy.frames.left && !enemy.frames.right) {
      const textures = enemy.frames.left.map(f => this.app.createGraphicSprite(f).texture);
      entity.addTextureFrame('right', textures, PIXI.groupD8.MIRROR_HORIZONTAL);
    }
    if (!enemy.frames.left && enemy.frames.right) {
      const textures = enemy.frames.right.map(f => this.app.createGraphicSprite(f).texture);
      entity.addTextureFrame('left', textures, PIXI.groupD8.MIRROR_HORIZONTAL);
    }
    if (enemy.frames.down && !enemy.frames.up) {
      const textures = enemy.frames.down.map(f => this.app.createGraphicSprite(f).texture);
      entity.addTextureFrame('up', textures, PIXI.groupD8.MIRROR_VERTICAL);
    }
    if (enemy.frames.emerging && !enemy.frames.submerging) {
      const textures = enemy.frames.emerging.map(f => this.app.createGraphicSprite(f).texture);
      entity.addTextureFrame('submerging', textures.reverse());
    }
    entity.setTextureFrame(Object.keys(enemy.frames)[0]);

    this.entities.push({ sprite: entity });
    this.entityLayer.addChild(entity);
    return entity;
  }

  createProjectile(weaponId: number, delta: { x: number, y: number }, x: number, y: number, speed: number) {
    const weapon = this.app.state.quest.weapons[weaponId - 1];
    const entity = new QuestProjectileEntity();
    const graphic = this.app.state.quest.graphics[weapon.graphic];
    entity.x = x * tileSize + (tileSize - graphic.width) / 2;
    entity.y = y * tileSize + (tileSize - graphic.height) / 2;
    entity.delta = delta;
    entity.speed = speed;

    const makeTextures = () => [weapon.graphic].map(f => this.app.createGraphicSprite(f).texture);

    if (weapon.rotate) {
      entity.addTextureFrame('up', makeTextures());
      entity.addTextureFrame('down', makeTextures(), PIXI.groupD8.MIRROR_VERTICAL);
      entity.addTextureFrame('left', makeTextures(), PIXI.groupD8.S);
      entity.addTextureFrame('right', makeTextures(), PIXI.groupD8.N);

      // TODO: make projectile share same code as normal entity?
      function getDirectionName() {
        const dx = delta.x;
        const dy = delta.y;

        let direction = 'down';
        if (dx === 1) direction = 'right';
        else if (dx === -1) direction = 'left';
        else if (dy === -1) direction = 'up';
        else if (dy === 1) direction = 'down';

        return direction;
      }
      entity.setTextureFrame(getDirectionName());
    } else {
      entity.addTextureFrame('default', makeTextures());
      entity.setTextureFrame('default');
    }

    this.entities.push({ sprite: entity });
    this.entityLayer.addChild(entity);
    return entity;
  }

  removeEntity(entity: QuestEntityBase) {
    this.entityLayer.removeChild(entity);
    const index = this.entities.findIndex(e => e.sprite === entity);
    if (index !== -1) this.entities.splice(index, 1);
  }

  getScreenState() {
    const state = this.app.state;
    let screenState = state.game.screenStates.get(state.currentScreen);
    if (!screenState) {
      screenState = { enemiesKilled: 0 };
      state.game.screenStates.set(state.currentScreen, screenState);
    }
    return screenState;
  }

  onEnterScreen() {
    const state = this.app.state;

    const walkableAreas = [];
    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        if (isSolid(state, x, y)) continue;
        if (Math.abs(x - this.heroEntity.x / tileSize) <= 1 && Math.abs(y - this.heroEntity.y / tileSize) <= 1) continue;

        walkableAreas.push({ x, y });
      }
    }

    const enemies = [...state.currentScreen.enemies]
      .sort(() => Math.random() - 0.5);
    const screenState = this.getScreenState();
    enemies.splice(0, screenState.enemiesKilled);

    for (const { enemyId } of enemies) {
      if (walkableAreas.length === 0) break;

      const enemy = state.quest.enemies[enemyId];
      const [pos] = walkableAreas.splice(Utils.random(0, walkableAreas.length - 1), 1);
      this.spawnEnemy(enemy, pos.x, pos.y);
    }
  }

  performSwordAttack() {
    this.swordSprite.anchor.x = 0.5;
    this.swordSprite.anchor.y = 0.5;
    this.swordSprite.texture.rotate = PIXI.groupD8.byDirection(-this.heroEntity.direction.y, -this.heroEntity.direction.x);
    if (this.heroEntity.direction.x === 0) {
      this.swordSprite.width = 8;
      this.swordSprite.height = 16;
    } else {
      this.swordSprite.width = 16;
      this.swordSprite.height = 8;
    }

    this.swordSprite.x = this.heroEntity.x + this.heroEntity.width / 2 + this.heroEntity.direction.x * tileSize / 2;
    this.swordSprite.y = this.heroEntity.y + this.heroEntity.height / 2 + this.heroEntity.direction.y * tileSize / 2;
    this.swordSprite.alpha = 1;
  }

  performScreenTransition(transition: Exclude<QuestMaker.State['game']['screenTransition'], undefined>) {
    const state = this.app.state;

    let duration;
    if (transition.type === 'scroll') {
      if (transition.frames === 0) {
        this.tileLayer.addChildAt(transition.newScreenContainer, 0);
        transition.newScreenContainer.x = screenWidth * tileSize * Math.sign(transition.screenDelta.x);
        transition.newScreenContainer.y = screenHeight * tileSize * Math.sign(transition.screenDelta.y);
      }

      duration = 50;
      this.container.x = (transition.frames / duration) * screenWidth * tileSize * this.container.scale.x * Math.sign(-transition.screenDelta.x);
      this.container.y = (transition.frames / duration) * screenHeight * tileSize * this.container.scale.y * Math.sign(-transition.screenDelta.y);
    } else if (transition.type === 'direct') {
      const durations = [50, 50, 50];
      duration = durations.reduce((cur, acc) => cur + acc);
      let step = 0;
      let stepFrames = transition.frames;
      while (stepFrames > durations[step]) {
        stepFrames -= durations[step];
        step++;
      }

      if (step === 0) {
        this.container.alpha = 1 - (stepFrames / durations[step]);
      } else if (step === 1) {
        if (stepFrames === 1) {
          this.tileLayer.removeChildren();
          for (const { sprite: entity } of [...this.entities]) {
            if (entity !== this.heroEntity) this.removeEntity(entity);
          }
          this.tileLayer.addChild(transition.newScreenContainer);
        }
      } else if (step === 2) {
        this.container.alpha = stepFrames / durations[step];
      }
    } else {
      throw new Error();
    }

    transition.frames += 1;
    if (transition.frames >= duration) {
      delete state.game.screenTransition;
      state.screenX = transition.screen.x;
      state.screenY = transition.screen.y;
      state.currentScreen = state.quest.screens[state.screenX][state.screenY];
      this.container.x = 0;
      this.container.y = 0;

      if (transition.type === 'scroll') {
        if (Math.sign(transition.screenDelta.x) === 1) this.heroEntity.x = 0;
        else if (Math.sign(transition.screenDelta.x) === -1) this.heroEntity.x = (tileSize - 1) * screenWidth;
        else if (Math.sign(transition.screenDelta.y) === 1) this.heroEntity.y = 0;
        else if (Math.sign(transition.screenDelta.y) === -1) this.heroEntity.y = (tileSize - 1) * screenHeight - 5; // ?
      }

      this.show();
    }
  }

  performTileAction(type: QuestMaker.TileType, names: string[]) {
    const state = this.app.state;

    if (type === TileType.WARP) {
      if (names.includes('bottomLeft') && names.includes('bottomRight')) {
        let newScreenLocation = { x: state.screenX, y: state.screenY + 1 };
        if (state.currentScreen.warps.a) {
          newScreenLocation = { x: state.currentScreen.warps.a.screenX, y: state.currentScreen.warps.a.screenY };
        }
        state.game.screenTransition = {
          type: 'direct',
          frames: 0,
          screen: newScreenLocation,
          screenDelta: { x: 0, y: 0 },
          newScreenContainer: this.createScreenContainer(newScreenLocation.x, newScreenLocation.y),
        };
      }
    } else if (type === TileType.SLOW_WALK) {
      this.heroEntity.speed = DEFAULT_HERO_SPEED * 0.5;
    }
  }
}
