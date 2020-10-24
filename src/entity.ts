import * as constants from './constants';
import { PlayGameMode } from './play-game-mode';
import { EnemyType } from './types';
import * as Utils from './utils';

const { screenWidth, screenHeight, tileSize } = constants;

const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];
function getAvailableDirections(state: QuestMaker.State, pos: { x: number, y: number }) {
  return directions.filter(d => {
    return !Utils.isSolid(state, pos.x + d.x, pos.y + d.y);
  });
}

// TODO: move to engine/
class EntityBase extends PIXI.AnimatedSprite {
  protected nameToTextures: Record<string, PIXI.Texture[]> = {};
  protected currentFrameName = '';

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
    // this.animationSpeed = 0.15;
    // this.textures.length ? this.play() : this.stop();
  }
}

type QuestEntityType = 'normal' | 'projectile' | 'enemy' | 'item';

export class QuestEntity extends EntityBase {
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
  public misc = new MiscBag<QuestMaker.EntityAttributes>();

  public isHero = false;
  public attackTicks = 0;

  private ticksPerCycle = 16;

  private animationData = {
    /** 0-ticksPerCycle, changes with every tick. */
    ticks: 0,
    /** 0 or 1, changes as entity moves. */
    positionTicks: 0,
    previousPositionInt: { x: 0, y: 0 },
  };

  constructor(public readonly type: QuestEntityType, attributes?: Partial<QuestMaker.EntityAttributes>) {
    super();

    for (const [id, value] of Object.entries(attributes || {})) {
      // @ts-ignore
      this.misc.set(id, value);
    }

    this.speed = this.misc.get('enemy.speed') || 1;
  }

  tick(mode: PlayGameMode) {
    // TODO: common code for basic vx/vy movement?
    if (this.type === 'projectile') {
      this.vx = this.delta.x * this.speed;
      this.vy = this.delta.y * this.speed;

      this.x += this.vx;
      this.y += this.vy;

      const shouldRemove = !Utils.inBounds(this.x + this.width / 2, this.y + this.height / 2, (screenWidth + 1) * tileSize, (screenHeight + 1) * tileSize);
      if (shouldRemove) mode.removeEntity(this);
    } else if (this.type === 'enemy') {
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
        let canMove = this.attackTicks === 0;
        if (!this.isHero && this.haltTimer !== null) {
          this.haltTimer -= this.speed;
          if (this.haltTimer <= 0) this.haltTimer = null;
          canMove = false;
        }

        if (canMove) {
          dx += this.direction.x * this.speed;
          dy += this.direction.y * this.speed;
        }
      }

      if (!this.isHero && this.life) {
        this._move(mode);
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
      }
    }

    const ix = Math.floor(this.x / 16 * 4);
    const iy = Math.floor(this.y / 16 * 4);

    this.animationData.ticks += 1;
    if (this.animationData.ticks >= this.ticksPerCycle) this.animationData.ticks = 0;

    if (this.animationData.previousPositionInt.x !== ix || this.animationData.previousPositionInt.y !== iy) {
      this.animationData.positionTicks = (this.animationData.positionTicks + 1) % 2;
    }

    this.animationData.previousPositionInt.x = ix;
    this.animationData.previousPositionInt.y = iy;

    if (this.attackTicks > 0) {
      this.attackTicks -= 1;
    }

    if (Object.keys(this.nameToTextures).length === 0) {
      this._animate(mode);
    } else {
      // TODO: remove.
      const ticks = this.misc.get('enemy.animation.type') === '2frmpos' ? this.animationData.positionTicks : this.animationData.ticks;
      const f = Math.floor(ticks / (16 >> (this.totalFrames - 1)));
      this.gotoAndStop(f % this.totalFrames);
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

    type Direction = 'down' | 'right' | 'left' | 'up';
    let direction: Direction = 'down';
    if (dx === 1) direction = 'right';
    else if (dx === -1) direction = 'left';
    else if (dy === -1) direction = 'up';
    else if (dy === 1) direction = 'down';

    return direction;
  }

  // Enemy AI.

  _move(mode: PlayGameMode) {
    if (this.enemyType === EnemyType.NORMAL) {
      this._normalMovement(mode);
    } else if (this.enemyType === EnemyType.LEEVER) {
      this._leeverMovement(mode);
    } else if (this.enemyType === EnemyType.WIZARD) {
      this._wizardMovement(mode);
    }
  }

  _normalMovement(mode: PlayGameMode) {
    const weaponId = this.misc.get('enemy.weapon');
    const homingFactor = this.misc.get('enemy.homing');
    const directionChangeFactor = this.misc.get('enemy.directionChange');
    const haltFactor = this.misc.get('enemy.halt');

    let hitPoint = { x: this.x, y: this.y };
    if (this.direction.x === 1) hitPoint.x += this.width;
    if (this.direction.y === 1) hitPoint.y += this.height;

    const currentTile = { x: Math.floor(hitPoint.x / tileSize), y: Math.floor(hitPoint.y / tileSize) };
    const nextTile = { x: Math.floor((hitPoint.x + this.direction.x * this.speed) / tileSize), y: Math.floor((hitPoint.y + this.direction.y * this.speed) / tileSize) };

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

    if (Utils.isSolid(mode.app.state, nextTile.x, nextTile.y)) {
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
        return;
      }
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

  _leeverMovement(mode: PlayGameMode) {
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

  _wizardMovement(mode: PlayGameMode) {
    // TODO eWizzrobe::animate
    this.speed = 0;
    // this.alpha = this.ticks > 8 ? 1 : 0;
    // this.alpha = 0;
  }

  // Animation

  protected prevAnimation = { gfx: 0, flip: 0 };
  _animate(mode: PlayGameMode) {
    const dir = this.getDirectionName();
    const animationType = this.misc.get('enemy.animation.type') || 'none';
    const graphicIdStart = this.misc.get('enemy.animation.graphics') || 0;
    const numGraphics = this.misc.get('enemy.animation.numGraphics') || 0;

    // First half of tick cycle maps to 0, second half maps to 1.
    const f2 = Math.floor(this.animationData.ticks / (this.ticksPerCycle / 2));
    // Maps to 0–2.
    const f3 = Math.floor(this.animationData.ticks / (this.ticksPerCycle / 3));
    // Maps to 0–3.
    const f4 = Math.floor(this.animationData.ticks / (this.ticksPerCycle / 4));
    let gfx = graphicIdStart;
    let flip = 0;

    if (this.isHero) {
      const data = mode.app.state.quest.misc.HERO_FRAMES;
      const dirNum = ['up', 'down', 'left', 'right'].indexOf(dir); // :(
      const state = this.attackTicks ? 'stab' : 'walk';
      const frame = data[state][dirNum];
      if (this.attackTicks) {
        // const fx = data.stab[dirNum].gfxs.length === 3 ? f3 : f2;
        // gfx = frame.gfxs[fx % frame.gfxs.length];
        gfx = frame.gfxs[0];
      } else {
        gfx = frame.gfxs[this.animationData.positionTicks % frame.gfxs.length];
      }
      flip = frame.flip;
    } else switch (animationType) {
      default:
      case 'none':
        gfx += this.animationData.ticks % numGraphics;
        break;
      case '2frmpos':
        gfx += this.animationData.positionTicks % numGraphics;
        break;
      case 'flip':
        flip = f2;
        break;
      case 'dwalk':
        switch (dir) {
          case 'up':
            gfx += 2;
            flip = f2;
            break;

          case 'down':
            flip = 0;
            gfx += (1 - f2);
            break;

          case 'left':
            flip = 1;
            gfx += (3 + f2);
            break;

          case 'right':
            flip = 0;
            gfx += (3 + f2);
            break;
        }
        break;
    }

    if (gfx !== this.prevAnimation.gfx || flip !== this.prevAnimation.flip) {
      this.prevAnimation = { gfx: gfx, flip: flip };
      this.texture = this._getGraphicTexture(mode, gfx, flip);
    }
  }

  private textureCache = new Map<string, PIXI.Texture>();
  _getGraphicTexture(mode: PlayGameMode, graphicId: number, flip: number) {
    const cset = this.misc.get('enemy.cset') || 0;

    const cached = this.textureCache.get(graphicId + ',' + flip);
    if (cached) return cached;

    const texture = mode.app.createGraphicSprite(graphicId, cset).texture;
    if (flip & 1) {
      texture.rotate = PIXI.groupD8.MIRROR_HORIZONTAL;
    }
    this.textureCache.set(graphicId + ',' + flip, texture);
    return texture;
  }
}

export class MiscBag<A extends Record<string, any>> {
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
