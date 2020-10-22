import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";
import { TileType, EnemyType, ItemType } from './types';
import 'pixi-plugin-bump';
import * as Utils from './utils';
import { Texture } from 'pixi.js';

const { screenWidth, screenHeight, tileSize } = constants;

const DEFAULT_HERO_SPEED = 1.5;

let paused = false;

const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];
function getAvailableDirections(state: QuestMaker.State, pos: { x: number, y: number }) {
  return directions.filter(d => {
    return !isSolid(state, pos.x + d.x, pos.y + d.y);
  });
}

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
  private nameToTextures: Record<string, PIXI.Texture[]> = {};
  private currentFrameName = '';

  constructor() {
    super([new PIXI.Texture(new PIXI.BaseTexture())]);
  }

  // TODO: better name. animation controller? Animation frame?
  addFrame(name: string, frames: PIXI.Texture[]) {
    this.nameToTextures[name] = frames;
  }

  setFrame(name: string) {
    const textures = this.nameToTextures[name];
    if (!textures || name === this.currentFrameName) return;
    this.currentFrameName = name;

    this.textures = textures;
    this.animationSpeed = 0.15;
    this.textures.length ? this.play() : this.stop();
  }
}

type QuestEntityType = 'normal' | 'projectile' | 'enemy' | 'item';

class QuestEntity extends EntityBase {
  public speed = 1;
  public life = 3;
  public vx = 0;
  public vy = 0;
  // TODO remove this and some other properties? move to misc?
  public delta = { x: 0, y: 0 };

  private haltTimer: number | null = null;
  public impulseDirection?: { x: number, y: number };
  public impulseTimer = 0;
  public invulnerableTimer = 0;

  public enemyType = EnemyType.NORMAL;
  public direction = { ...directions[Math.floor(Math.random() * directions.length)] };
  public moving = true;
  public isHero = false;
  public misc = new MiscBag<QuestMaker.EntityAttributes>();

  constructor(public readonly type: QuestEntityType, attributes?: Partial<QuestMaker.EntityAttributes>) {
    super();

    for (const [id, value] of Object.entries(attributes || {})) {
      // @ts-ignore
      this.misc.set(id, value);
    }

    this.speed = this.misc.get('enemy.speed') || 0.5;
  }

  tick(mode: PlayGameMode, dt: number) {
    // TODO: common code for basic vx/vy movement?

    if (this.type === 'projectile') {
      const speed = this.speed * dt;

      this.vx = this.delta.x * speed;
      this.vy = this.delta.y * speed;

      this.x += this.vx;
      this.y += this.vy;

      const shouldRemove = !inBounds(this.x + this.width / 2, this.y + this.height / 2, (screenWidth + 1) * tileSize, (screenHeight + 1) * tileSize);
      if (shouldRemove) mode.removeEntity(this);
    } else if (this.type === 'enemy') {
      const speed = this.speed * dt;

      if (this.invulnerableTimer) {
        this.alpha = Math.floor(this.invulnerableTimer * 1.5) % 2;

        if (--this.invulnerableTimer <= 0) {
          this.alpha = 1;
          if (this.life <= 0) {
            mode.removeEntity(this);
            console.log('die');
            mode.getScreenState().enemiesKilled += 1;
            return;
          }
        }
      }

      let dx = 0;
      let dy = 0;

      if (this.impulseDirection) {
        dx += this.impulseDirection.x * 4;
        dy += this.impulseDirection.y * 4;

        if (--this.impulseTimer <= 0) {
          delete this.impulseDirection;
          this.impulseTimer = 0;
        }
      } else if (this.moving) {
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

      if (!this.isHero && this.life) {
        if (this.enemyType === EnemyType.NORMAL) {
          this._normalMovement(mode, speed);
        } else if (this.enemyType === EnemyType.LEEVER) {
          this._leeverMovement(mode, speed);
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
        this.setFrame(this.getDirectionName());
        this.play();
      } else {
        this.stop();
      }
    }
  }

  hit(direction: { x: number, y: number }) {
    if (this.invulnerableTimer > 0) return;

    this.life -= 1;

    this.impulseDirection = direction;
    this.impulseTimer = 10;
    this.invulnerableTimer = 25;
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

  // Enemy AI.

  _normalMovement(mode: PlayGameMode, speed: number) {
    const weaponId = this.misc.get('enemy.weapon');
    const homingFactor = this.misc.get('enemy.homing');
    const directionChangeFactor = this.misc.get('enemy.directionChange');
    const haltFactor = this.misc.get('enemy.halt');

    let hitPoint = { x: this.x, y: this.y };
    if (this.direction.x === 1) hitPoint.x += this.width;
    if (this.direction.y === 1) hitPoint.y += this.height;

    const currentTile = { x: Math.floor(hitPoint.x / tileSize), y: Math.floor(hitPoint.y / tileSize) };
    const nextTile = { x: Math.floor((hitPoint.x + this.direction.x * speed) / tileSize), y: Math.floor((hitPoint.y + this.direction.y * speed) / tileSize) };

    // @ts-ignore
    if (window.debug) {
      const debug = mode.app.debug(`nextTile ${mode.entities.findIndex(e => e === this)}`);
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

    if (this.haltTimer) return;

    let availableDirections = getAvailableDirections(mode.app.state, currentTile);
    if (!availableDirections.length) availableDirections = directions;

    if (isSolid(mode.app.state, nextTile.x, nextTile.y)) {
      this.direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
      return;
    }

    const hasChangedTile = currentTile.x !== nextTile.x || currentTile.y !== nextTile.y;
    if (!hasChangedTile) {
      return;
    }

    if (Math.random() < haltFactor) {
      this.haltTimer = 30;
      if (weaponId) {
        const weaponSpriteOverride = this.misc.get('enemy.weapon.sprite');
        mode.createProjectile(weaponId, weaponSpriteOverride, { x: Math.sign(this.direction.x), y: Math.sign(this.direction.y) }, currentTile.x, currentTile.y, 2);
      }
      return;
    }

    let shouldChangeDirection = false;
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

      const numberEmergedLeevers = mode.entities.reduce((acc, entity) => {
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
          const pos = {
            x: Math.round(this.x / tileSize),
            y: Math.round(this.y / tileSize),
          };
          this.x = pos.x * tileSize;
          this.y = pos.y * tileSize;

          let availableDirections = getAvailableDirections(mode.app.state, pos);
          if (!availableDirections.length) availableDirections = directions;
          this.direction = { ...availableDirections[Utils.random(0, availableDirections.length)] };
        }

        this.setFrame('emerging');
        this.loop = false;
        this.onComplete = () => {
          this.setFrame('moving');
          this.haltTimer = 0;
          this.loop = true;
          // @ts-ignore
          delete this.onComplete;
        };
      }
    } else if (emergedState === 'emerged') {
      this.visible = true;

      if (timeSinceStateChange > 1000 * 2) {
        this.misc.set('enemy.leever.emergedState', 'submerging');
        this.misc.set('enemy.leever.emergedStateTimeChanged', Date.now());

        this.setFrame('submerging');
        this.loop = false;
        this.onComplete = () => {
          this.misc.set('enemy.leever.emergedState', 'submerged');
          this.misc.set('enemy.leever.emergedStateTimeChanged', Date.now());
          // @ts-ignore
          delete this.onComplete;
        };
      }
    }
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
  public heroEntity = new QuestEntity('enemy'); // TODO ?
  public entities: QuestEntity[] = [];
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

  // TODO: this shouldn't be a property.
  private swordSprite = this.app.createGraphicSprite(this.app.state.quest.weapons[0].graphic);
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

    const startPosition = state.currentScreen.warps.arrival ?? {
      x: screenWidth * tileSize / 2,
      y: screenHeight * tileSize / 2,
    };

    this.heroEntity.x = startPosition.x;
    this.heroEntity.y = startPosition.y;
    this.heroEntity.isHero = true;
    this.heroEntity.life = Number.MAX_SAFE_INTEGER;

    this.heroEntity.speed = DEFAULT_HERO_SPEED;

    for (const [name, frames] of Object.entries(state.quest.misc.HERO_FRAMES)) {
      const textures = frames.graphicIds.map(graphicId => this.app.createGraphicSprite(graphicId, 6).texture);
      if (frames.flip) {
        textures.forEach(texture => texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL);
      }
      this.heroEntity.addFrame(name, textures);
    }

    this.heroEntity.setFrame('down');
  }

  show() {
    super.show();
    const state = this.app.state;

    this.tileLayer.removeChildren();
    this.entityLayer.removeChildren();

    this.entities = [];
    this.entities.push(this.heroEntity);

    const mask = new PIXI.Graphics();
    mask.beginFill(0);
    mask.drawRect(0, 0, tileSize * screenWidth * this.container.scale.x, tileSize * screenHeight * this.container.scale.y);
    mask.endFill();
    this.container.mask = mask;

    this.tileLayer.addChild(this.createScreenContainer(state.mapIndex, state.screenX, state.screenY));
    this.entityLayer.addChild(this.heroEntity);

    this.hitTest.clear();
    this.createScreenHitAreas();
    // @ts-ignore
    if (window.debug) {
      this.layers[4].addChild(this.hitTest.container);
    }

    this.onEnterScreen();
  }

  hide() {
    super.hide();

    this.app.soundManager.pauseSong();
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

    const equippedX = state.game.equipped[1] !== null && state.game.inventory[state.game.equipped[1]];
    if (equippedX && state.quest.items[equippedX.item].type === ItemType.SWORD && this.app.keys.down['KeyX']) {
      heroEntity.setFrame('useItem-' + heroEntity.getDirectionName());
      this.performSwordAttack();
      state.game.moveFreeze = 10;

      for (const entity of this.entities) {
        if (entity === this.heroEntity) continue;
        if (!isIntersecting(entity.getBounds(), this.swordSprite.getBounds())) continue;

        entity.hit && entity.hit(heroEntity.direction);
        // this.removeEntity(entity);
      }
    }

    if (state.game.moveFreeze !== undefined) {
      if (state.game.moveFreeze <= 0) {
        delete state.game.moveFreeze;
        heroEntity.setFrame(heroEntity.getDirectionName());
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

    this.hitTest.hit(heroHitSprite, this.hitTest.sections.screen.objects);
    this.heroEntity.x = heroHitSprite.x;
    this.heroEntity.y = heroHitSprite.y - tileSize / 2;

    for (let entity of this.entities.values()) {
      entity.tick(this, dt);
      if (entity === this.heroEntity) continue;

      if (entity.type === 'projectile') {
        if (this.hitTest.test(entity, this.hitTest.sections.screen.objects)) {
          this.removeEntity(entity);
        }
      } else {
        this.hitTest.hit(entity, this.hitTest.sections.screen.objects);
        entity.x = Utils.clamp(0, entity.x, screenWidth * tileSize - entity.width);
        entity.y = Utils.clamp(0, entity.y, screenHeight * tileSize - entity.height);
      }

      if (entity.type === 'item' && this.hitTest.hit(heroHitSprite, [entity])) {
        this.pickupItem(entity.misc.get('item.id'));
        this.removeEntity(entity);
      }

      // TODO: need to fork Bump and make `.test` return a side.
      const collision = !this.heroEntity.invulnerableTimer && this.hitTest.hit(heroHitSprite, [entity]);
      if (collision) {
        const dir = { x: 0, y: 0 };
        if (collision === 'left') dir.x = 1;
        if (collision === 'right') dir.x -= 1;
        if (collision === 'top') dir.y += 1;
        if (collision === 'bottom') dir.y -= 1;
        this.heroEntity.hit(dir);
        if (entity.type === 'projectile') this.removeEntity(entity);
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
    this._checkForTransition();
  }

  _checkForTransition() {
    const state = this.app.state;

    let transitionX = 0;
    let transitionY = 0;

    if (this.heroEntity.x + this.heroEntity.width / 2 > tileSize * screenWidth) {
      transitionX = 1;
    } else if (this.heroEntity.x + this.heroEntity.width / 2 < 0) {
      transitionX = -1;
    } else if (this.heroEntity.y + this.heroEntity.height / 2 < 0) {
      transitionY = -1;
    } else if (this.heroEntity.y + this.heroEntity.height / 2 > tileSize * screenHeight) {
      transitionY = 1;
    }

    if (transitionX === 0 && transitionY === 0) return;

    if (state.game.warpReturnTransition) {
      state.game.screenTransition = state.game.warpReturnTransition;
      delete state.game.warpReturnTransition;
      return;
    }

    let targetScreen = { x: state.screenX + transitionX, y: state.screenY + transitionY };
    if (!inBounds(targetScreen.x, targetScreen.y, state.currentMap.screens.length, state.currentMap.screens[0].length)) return;
    if (!state.quest.maps[state.mapIndex].screens[targetScreen.x] || !state.quest.maps[state.mapIndex].screens[targetScreen.x][targetScreen.y]) return;

    state.game.screenTransition = {
      type: 'scroll',
      frames: 0,
      screen: targetScreen,
      screenDelta: { x: transitionX, y: transitionY },
      newScreenContainer: this.createScreenContainer(state.mapIndex, targetScreen.x, targetScreen.y),
    };
  }

  createScreenContainer(map: number, sx: number, sy: number) {
    const container = new PIXI.Container();
    const state = this.app.state;
    const screen = state.quest.maps[map].screens[sx][sy];

    const bg = new PIXI.Graphics();
    bg.beginFill(0);
    bg.drawRect(0, 0, screenWidth * tileSize, screenHeight * tileSize);
    bg.endFill();
    container.addChild(bg);

    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        const sprite = this.app.createTileSprite(screen.tiles[x][y]);
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
      const spawnEntity = new QuestEntity('enemy');
      spawnEntity.x = x * tileSize;
      spawnEntity.y = y * tileSize;

      const textures = [
        this.app.state.quest.misc.SPAWN_GFX_START,
        this.app.state.quest.misc.SPAWN_GFX_START + 1,
        this.app.state.quest.misc.SPAWN_GFX_START + 2,
      ].map(f => this.app.createGraphicSprite(f).texture);
      spawnEntity.addFrame('default', textures);
      spawnEntity.setFrame('default');
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
    const entity = new QuestEntity('enemy', enemy.attributes);
    entity.x = x * tileSize;
    entity.y = y * tileSize;
    entity.enemyType = enemy.type;
    entity.life = 2;

    const cset = enemy.attributes['enemy.cset'] || 0;

    let framesToTextures: Record<string, PIXI.Texture[]> = {};
    if (enemy.frames) {
      // TODO: probably will remove all this.
      for (const [name, graphicIds] of Object.entries(enemy.frames)) {
        framesToTextures[name] = graphicIds.map(id => this.app.createGraphicSprite(id, cset).texture);
      }
    } else {
      const animationType = enemy.attributes['enemy.animation.type'] || 'normal';
      const graphicIdStart = enemy.attributes['enemy.animation.graphics'] || 0;
      const numGraphics = enemy.attributes['enemy.animation.numGraphics'] || 0;
      const graphicIds = Array.from(new Array(numGraphics)).map((_, i) => graphicIdStart + i);

      if (animationType === 'normal') {
        framesToTextures.default = graphicIds.map(id => this.app.createGraphicSprite(id, cset).texture);
      } else if (animationType === 'flip') {
        framesToTextures.default = graphicIds.map(id => {
          const textures = [
            this.app.createGraphicSprite(id, cset).texture,
            this.app.createGraphicSprite(id, cset).texture,
          ];
          textures[1].rotate = PIXI.groupD8.MIRROR_HORIZONTAL;
          return textures;
        }).flat();
      }
    }

    if (framesToTextures.left && !framesToTextures.right) {
      const textures = framesToTextures.left.map(texture => texture.clone());
      textures.forEach(texture => texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL);
      framesToTextures.right = textures;
    }
    if (!framesToTextures.left && framesToTextures.right) {
      const textures = framesToTextures.right.map(texture => texture.clone());
      textures.forEach(texture => texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL);
      framesToTextures.left = textures;
    }
    if (framesToTextures.down && !framesToTextures.up) {
      const textures = framesToTextures.down.map(texture => texture.clone());
      textures.forEach(texture => texture.rotate = PIXI.groupD8.MIRROR_VERTICAL);
      framesToTextures.up = textures;
    }
    if (!framesToTextures.down && framesToTextures.up) {
      const textures = framesToTextures.up.map(texture => texture.clone());
      textures.forEach(texture => texture.rotate = PIXI.groupD8.MIRROR_VERTICAL);
      framesToTextures.down = textures;
    }
    if (framesToTextures.emerging && !framesToTextures.submerging) {
      const textures = framesToTextures.emerging.map(texture => texture.clone());
      framesToTextures.submerging = textures.reverse();
    }

    for (const [name, frames] of Object.entries(framesToTextures)) {
      entity.addFrame(name, frames);
    }

    entity.setFrame(Object.keys(framesToTextures)[0]);

    this.entities.push(entity);
    this.entityLayer.addChild(entity);
    return entity;
  }

  createProjectile(weaponId: number, weaponSpriteOverride: number, delta: { x: number, y: number }, x: number, y: number, speed: number) {
    const weapon = this.app.state.quest.weapons[weaponId - 1];
    const entity = new QuestEntity('projectile');
    const graphic = this.app.state.quest.graphics[weaponSpriteOverride || weapon.graphic];
    entity.x = x * tileSize + (tileSize - graphic.width) / 2;
    entity.y = y * tileSize + (tileSize - graphic.height) / 2;
    entity.delta = delta;
    entity.speed = speed;

    const makeTextures = () => [weapon.graphic].map(f => this.app.createGraphicSprite(f, weapon.cset).texture);

    if (weapon.rotate) {
      const rotated = (textures: PIXI.Texture[], rotation: PIXI.GD8Symmetry) => {
        textures.forEach(texture => texture.rotate = rotation);
        return textures;
      }
      entity.addFrame('up', makeTextures());
      entity.addFrame('down', rotated(makeTextures(), PIXI.groupD8.MIRROR_VERTICAL));
      entity.addFrame('left', rotated(makeTextures(), PIXI.groupD8.S));
      entity.addFrame('right', rotated(makeTextures(), PIXI.groupD8.N));

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
      entity.setFrame(getDirectionName());
    } else {
      entity.addFrame('default', makeTextures());
      entity.setFrame('default');
    }

    this.entities.push(entity);
    this.entityLayer.addChild(entity);
    return entity;
  }

  createItem(itemId: number, x: number, y: number) {
    const entity = new QuestEntity('item', { 'item.id': itemId });
    entity.texture = this.app.createItemSprite(itemId).texture;
    entity.x = x * tileSize;
    entity.y = y * tileSize;

    this.layers[1].addChild(entity);
    this.entities.push(entity);
    this.entityLayer.addChild(entity);

    return entity;
  }

  removeEntity(entity: QuestEntity) {
    this.entityLayer.removeChild(entity);
    const index = this.entities.findIndex(e => e === entity);
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

    if (state.quest.name !== 'debug') {
      this.app.soundManager.playSong(state.quest.dmaps[state.dmapIndex].song);
    }
  }

  performSwordAttack() {
    // TODO: attach weapon sprite to hero.
    this.swordSprite.pivot.set(this.swordSprite.width / 2, this.swordSprite.height / 2);
    this.swordSprite.texture.rotate = PIXI.groupD8.byDirection(-this.heroEntity.direction.y, -this.heroEntity.direction.x);
    const heroCenterX = this.heroEntity.x + this.heroEntity.width / 2;
    const heroCenterY = this.heroEntity.y + this.heroEntity.height / 2 + 3;
    this.swordSprite.x = heroCenterX + this.heroEntity.direction.x * this.swordSprite.width * 0.8;
    this.swordSprite.y = heroCenterY + this.heroEntity.direction.y * this.swordSprite.height * 0.8;
    this.swordSprite.alpha = 1;
  }

  performScreenTransition(transition: QuestMaker.ScreenTransition) {
    const state = this.app.state;
    const targetMapIndex = transition.dmap === undefined ? state.mapIndex : state.quest.dmaps[transition.dmap].map;
    const targetScreen = state.quest.maps[targetMapIndex].screens[transition.screen.x][transition.screen.y];

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
        // Fading out.
        this.container.alpha = 1 - (stepFrames / durations[step]);
      } else if (step === 1) {
        // Black.
        if (stepFrames === 1) {
          this.tileLayer.removeChildren();
          for (const entity of [...this.entities]) {
            if (entity !== this.heroEntity) this.removeEntity(entity);
          }
          this.tileLayer.addChild(transition.newScreenContainer);

          if (transition.type === 'direct') {
            if (transition.position) {
              this.heroEntity.x = transition.position.x;
              this.heroEntity.y = transition.position.y;
            } else {
              if (targetScreen.warps.arrival) {
                this.heroEntity.x = targetScreen.warps.arrival.x;
                this.heroEntity.y = targetScreen.warps.arrival.y;
              }
            }
          }
        }
      } else if (step === 2) {
        // Fading in.
        this.container.alpha = stepFrames / durations[step];
      }
    } else {
      throw new Error();
    }

    transition.frames += 1;
    if (transition.frames >= duration) {
      delete state.game.screenTransition;

      if (transition.dmap !== undefined) {
        state.dmapIndex = transition.dmap;
        state.mapIndex = targetMapIndex;
        state.currentMap = state.quest.maps[targetMapIndex];
      }

      state.screenX = transition.screen.x;
      state.screenY = transition.screen.y;
      state.currentScreen = targetScreen;
      this.container.x = 0;
      this.container.y = 0;

      if (transition.type === 'scroll') {
        if (Math.sign(transition.screenDelta.x) === 1) this.heroEntity.x = 0;
        else if (Math.sign(transition.screenDelta.x) === -1) this.heroEntity.x = (tileSize - 1) * screenWidth;
        else if (Math.sign(transition.screenDelta.y) === 1) this.heroEntity.y = 0;
        else if (Math.sign(transition.screenDelta.y) === -1) this.heroEntity.y = (tileSize - 1) * screenHeight - 5; // ?
      }

      this.show();

      // TODO do this somewhere else ...
      if (transition.item) {
        this.createItem(transition.item, screenWidth / 2, screenHeight / 2);
      }
    }
  }

  /**
   * Creates transition object, but doesn't apply it.
   */
  _createScreenTransitionFromWarp(warp: QuestMaker.Warp): { transition: QuestMaker.ScreenTransition, returnTransition?: QuestMaker.ScreenTransition } {
    const state = this.app.state;

    let dmap = undefined;
    let newScreenLocation = { x: state.screenX, y: state.screenY + 1 };
    let newPosition = undefined;
    let returnTransition = undefined;
    let item = undefined;

    if (warp && warp.type === 'screen') {
      newScreenLocation = { x: warp.screenX, y: warp.screenY };
      if (warp.x && warp.y) {
        newPosition = { x: warp.x, y: warp.y };
      }
      if (warp.dmap !== undefined) {
        dmap = warp.dmap;
      }
    }

    if (warp && warp.type === 'special-room') {
      newScreenLocation = { x: 0, y: 8 };
      returnTransition = this._createScreenTransitionFromWarp({
        type: 'screen',
        screenX: state.screenX,
        screenY: state.screenY,
        x: warp.return.x,
        y: warp.return.y,
      }).transition;
      // Hardcode spawn at bottom of screen.
      newPosition = {
        x: screenWidth * tileSize / 2 - this.heroEntity.width / 2,
        y: screenHeight * (tileSize - 2),
      };

      if (warp.item !== undefined) {
        item = warp.item;
      }
    }

    const mapIndex = dmap === undefined ? state.mapIndex : state.quest.dmaps[dmap].map;
    return {
      transition: {
        type: 'direct',
        frames: 0,
        dmap,
        item, // TODO: model room/warp behavior better.
        screen: newScreenLocation,
        position: newPosition,
        screenDelta: { x: 0, y: 0 },
        newScreenContainer: this.createScreenContainer(mapIndex, newScreenLocation.x, newScreenLocation.y),
      },
      returnTransition,
    };
  }

  performTileAction(type: QuestMaker.TileType, names: string[]) {
    const state = this.app.state;

    if (type === TileType.WARP) {
      if (names.includes('bottomLeft') && names.includes('bottomRight')) {
        const warp = state.currentScreen.warps.data && state.currentScreen.warps.data[0];
        if (warp) {
          const { transition, returnTransition } = this._createScreenTransitionFromWarp(warp);
          state.game.screenTransition = transition;
          state.game.warpReturnTransition = returnTransition;
        }
      }
    } else if (type === TileType.SLOW_WALK) {
      this.heroEntity.speed = DEFAULT_HERO_SPEED * 0.5;
    }
  }

  pickupItem(itemId: number) {
    const state = this.app.state;

    const item = state.quest.items[itemId];
    const inventoryIndex = state.game.inventory.length;
    state.game.inventory.push({ item: itemId });

    if (item.type === ItemType.SWORD) {
      state.game.equipped[1] = inventoryIndex;
    }
  }
}
