import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";
import { EnemyType, ItemType } from './types';
import * as Utils from './utils';
import { QuestEntity, MiscBag } from './entity';
import 'pixi-plugin-bump';
import { TileFlag, SecretCombo, getPushData } from './tile-flags';
import { getWarpIndex, TileType } from './tile-type';
import { ScreenFlags } from './screen-flags';
import { QuestRules } from './quest-rules';
import { Sfx } from './zc-constants';

const { screenWidth, screenHeight, tileSize } = constants;

const DEFAULT_HERO_SPEED = 1.5;

let paused = false;

const isIntersecting = (r1: PIXI.Rectangle, r2: PIXI.Rectangle) => {
  return !(r2.x > (r1.x + r1.width) ||
    (r2.x + r2.width) < r1.x ||
    r2.y > (r1.y + r1.height) ||
    (r2.y + r2.height) < r1.y);
}

function pointToQuadrant(x: number, y: number) {
  let quadrant = 0;
  if (x % tileSize > tileSize / 2) quadrant += 1;
  if (y % tileSize > tileSize / 2) quadrant += 2;
  return quadrant;
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

  private secondsSinceLastTick = 0;
  private hasMovedSinceEnteredScreen = false;

  init() {
    super.init();
    const state = this.app.state;

    state.game.screenStates.clear();
    this.screenAttributes.clear();

    for (const layer of this.layers) {
      this.container.addChild(layer);
    }

    let startPosition;
    if (QuestRules.NOARRIVALPOINT(state.quest.misc.rules)) {
      startPosition = state.currentScreen.warps.returns[0];
    } else if (state.currentScreen.warps.arrival) {
      startPosition = state.currentScreen.warps.arrival;
    }
    if (!startPosition || (startPosition.x === 0 && startPosition.y === 0)) {
      const walkableLocations = this.getWalkableLocations();
      const location = walkableLocations[Math.floor(walkableLocations.length / 2)] || { x: screenWidth / 2, y: screenWidth / 2 };
      startPosition = {
        x: location.x * tileSize,
        y: location.y * tileSize,
      };
    }

    this.heroEntity.x = startPosition.x;
    this.heroEntity.y = startPosition.y;
    this.heroEntity.isHero = true;
    this.heroEntity.life = Number.MAX_SAFE_INTEGER;
    this.heroEntity.speed = DEFAULT_HERO_SPEED;
    this.heroEntity.misc.set('enemy.cset', 6);

    const sprite = new PIXI.Sprite();
    sprite.width = tileSize * screenWidth;
    this.app.pixi.stage.addChild(sprite);
    this.app.resize();
  }

  show() {
    super.show();
    this.swordSprite.alpha = 0;
    this.entities = [];
    this.entities.push(this.heroEntity);
    this.initDraw();
    this.onEnterScreen();
    this.app.updateUrl();
  }

  initDraw() {
    const state = this.app.state;

    for (const layer of this.layers) {
      layer.removeChildren();
    }

    for (const entity of this.entities) {
      this.entityLayer.addChild(entity);
    }

    this.layers[2].addChild(this.swordSprite);

    const mask = new PIXI.Graphics();
    mask.beginFill(0);
    mask.drawRect(0, 0, tileSize * screenWidth * this.app.pixi.stage.scale.x, tileSize * screenHeight * this.app.pixi.stage.scale.y);
    mask.endFill();
    this.container.mask = mask;

    const screen = state.quest.maps[state.mapIndex].screens[state.screenX][state.screenY];
    const tileLayerContainers = [
      { map: state.mapIndex, x: state.screenX, y: state.screenY },
      ...screen.layers
    ].map((_, i) => this.createScreenLayerContainer(state.dmapIndex, screen, i));

    for (let i = 0; i < tileLayerContainers.length; i++) {
      const layer = tileLayerContainers[i];
      if (!layer) continue;

      if (i <= 2) {
        this.tileLayer.addChild(layer);
      } else {
        this.layers[4].addChild(layer);
      }
      // TODO: https://www.purezc.net/forums/index.php?showtopic=75156
    }

    this.entityLayer.addChild(this.heroEntity);

    this.hitTest.clear();
    this.createScreenHitAreas();
    // @ts-ignore
    if (window.debug) {
      this.layers[4].addChild(this.hitTest.container);
    }
  }

  hide() {
    super.hide();

    this.app.soundManager.pauseSong();
  }

  tick(dt: number) {
    const state = this.app.state;
    const heroEntity = this.heroEntity;
    const screenState = this.getCurrentScreenState();

    if (this.app.keys.up['Space']) {
      paused = !paused;
    }
    if (paused) return;

    let transition = state.game.screenTransition;
    if (transition) {
      this.performScreenTransition(transition);
      return;
    }

    if (this.app.keys.up['KeyR']) {
      this.triggerSecrets();
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
      this.hasMovedSinceEnteredScreen = true;
    } else {
      this.heroEntity.moving = false;
    }

    // TODO: this should be attached to a sword entity object.
    {
      const heroCenterX = this.heroEntity.x + this.heroEntity.width / 2;
      const heroCenterY = this.heroEntity.y + this.heroEntity.height / 2 + 3;
      this.swordSprite.x = heroCenterX + this.heroEntity.direction.x * this.swordSprite.width * 0.8;
      this.swordSprite.y = heroCenterY + this.heroEntity.direction.y * this.swordSprite.height * 0.8;
      this.swordSprite.pivot.set(this.swordSprite.width / 2, this.swordSprite.height / 2);
      this.swordSprite.texture.rotate = PIXI.groupD8.byDirection(-this.heroEntity.direction.y, -this.heroEntity.direction.x);
    }

    const equippedX = state.game.equipped[1] !== null && state.game.inventory[state.game.equipped[1]];
    if (heroEntity.attackTicks === 0 && equippedX && state.quest.items[equippedX.item].type === ItemType.SWORD && this.app.keys.down['KeyX']) {
      // @ts-ignore
      this.heroEntity.animationData.ticks = 0;
      this.performSwordAttack();
      heroEntity.attackTicks = 10;

      for (const entity of this.entities) {
        if (entity === this.heroEntity) continue;
        if (!isIntersecting(entity.getBounds(), this.swordSprite.getBounds())) continue;

        entity.hit && entity.hit(heroEntity.direction);
        this.app.soundManager.playSfx(entity.misc.get('enemy.hitSfx'));
      }
    }

    if (heroEntity.attackTicks <= 0) {
      this.swordSprite.alpha = 0;
    }

    // Slash tiles.
    if (heroEntity.attackTicks === 10) {
      const touchedTileLocations: Array<{ tx: number, ty: number }> = [];
      const addPoint = (x: number, y: number) => {
        const tx = Math.floor(x / tileSize);
        const ty = Math.floor(y / tileSize);
        if (touchedTileLocations.find(l => l.tx === tx && l.ty === ty)) return;
        if (!Utils.inBounds(tx, ty, screenWidth, screenHeight)) return;

        touchedTileLocations.push({ tx, ty });
      };

      const left = this.swordSprite.x;
      const right = this.swordSprite.x + this.swordSprite.width;
      const top = this.swordSprite.y;
      const bottom = this.swordSprite.y + this.swordSprite.height;
      addPoint(left, top);
      addPoint(right, top);
      addPoint(left, bottom);
      addPoint(right, bottom);

      let dirty = false;
      for (const location of touchedTileLocations) {
        // TODO: handle all layers
        const tile = this._getTile(state.currentScreen, screenState, location.tx, location.ty, 0);
        // TODO really need to rename tile to screenTile and tile.tile to tile.id
        const tileData = state.quest.tiles[tile.tile];
        // if (tileData.type) console.log(TileType[tileData.type]);

        const isSlashable = [
          TileType.Bush,
          TileType.Slash,
          TileType['Bush (Continuous)'],
          TileType['Bush->Next (Continuous)'],
          TileType['Bush->Next'],
          TileType['Slash (Continuous)'],
          TileType['Slash (Item, Continuous)'],
          TileType['Slash (Item)'],
          TileType['Slash->Next (Continuous)'],
          TileType['Slash->Next (Item, Continuous)'],
          TileType['Slash->Next (Item)'],
        ].includes(tileData.type);
        if (isSlashable) {
          // @ts-expect-error
          const newTile = { tile: getZcScreen().underCombo, cset: getZcScreen().underCset };
          screenState.replacedTiles[0][location.tx][location.ty] = newTile;
          dirty = true;
        }
      }
      if (dirty) this.initDraw();
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

    // Lazy way to pause the game when window is minimized.
    if (this.app.pixi.ticker.elapsedMS / 1000 > 0.1) return;

    const secondsPerFrame = 1 / 60;
    this.secondsSinceLastTick += this.app.pixi.ticker.elapsedMS / 1000;

    while (this.secondsSinceLastTick >= secondsPerFrame) {
      this.secondsSinceLastTick -= secondsPerFrame;

      for (let entity of this.entities.values()) {
        entity.tick(this);
        if (entity === this.heroEntity) continue;
        if (entity.type === 'npc') continue;

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
          if (entity.misc.get('item.isScreenItem')) {
            screenState.collectedItem = true;
            if (ScreenFlags.pickupItemShowsSecrets(state.currentScreen.flags)) this.triggerSecrets();
          }
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
          this.app.soundManager.playSfx(Sfx.SFX_OUCH);
          if (entity.type === 'projectile') this.removeEntity(entity);
        }
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
      if (!Utils.inBounds(x, y, screenWidth, screenHeight)) continue;

      const { tile } = this._getTile(state.currentScreen, screenState, x, y, 0);
      const tile_ = state.quest.tiles[tile]; // ... naming issue ....
      const flag = this._getFlag(state.currentScreen, screenState, x, y, 0);
      if (tile_.type === TileType.None && !flag) continue;

      this.performTileAction(tile_.type, tile, flag, names, x, y, 0);
    }

    // Transition screen when hero enters edge.
    this._checkForTransition();
  }

  triggerSecrets() {
    const screenState = this.getCurrentScreenState();

    screenState.secretsTriggered = !screenState.secretsTriggered; // TODO: remove toggling
    // @ts-expect-error
    if (screenState.secretsTriggered) this.app.soundManager.playSfx(getZcScreen().secretSfx || Sfx.SFX_SECRET);
    if (screenState.secretsTriggered) this.createScreenItem();

    // TODO: update more performantly!
    this.initDraw();
  }

  /**
   * Returns the tile at the given location, given the current screen state (secrets, replaced tiles, etc.)
   */
  _getTile(screen: QuestMaker.Screen, screenState: QuestMaker.ScreenState, x: number, y: number, layerIndex: number): QuestMaker.ScreenTile {
    // TODO: handle all layers
    const defaultTile = screenState.replacedTiles[layerIndex][x][y] ?? screen.tiles[x][y];

    if (screenState.secretsTriggered) {
      // @ts-expect-error TODO kinda giving up on recreating the state in QuestMaker.Quest
      const zcScreen = getZcScreen();

      // Flags can come from the screen or the tile.
      // @ts-expect-error
      let sflag = getZcScreen().sflag[x + y * screenWidth];
      // let sflag = this._getFlag(screen, screenState, x, y, layerIndex);
      if (sflag === TileFlag.CF_NONE) {
        // TODO ignores screen state ...
        const tileId = defaultTile.tile;
        sflag = this.app.state.quest.tiles[tileId].flag;
        if (sflag === TileFlag.CF_NONE) return defaultTile;
      }

      if (sflag >= TileFlag.CF_SECRETS01 && sflag <= TileFlag.CF_SECRETS16) {
        const secretIndex = sflag - 15 - 1; // TODO: why is this not just -15?
        return screen.secretTiles[SecretCombo.SECCMB_SECRET01 + secretIndex];
      }

      const defaultToUnderCombo = (tile: QuestMaker.ScreenTile) => {
        if (tile.tile) return tile;
        return { tile: zcScreen.underCombo, cset: zcScreen.underCset };
      }

      switch (sflag) {
        case TileFlag.CF_PUSHUPDOWN: return defaultToUnderCombo(screen.secretTiles[SecretCombo.SECCMB_STAIRS]);
        case TileFlag.CF_PUSH4WAY: return defaultToUnderCombo(screen.secretTiles[SecretCombo.SECCMB_STAIRS]);
        case TileFlag.CF_WHISTLE: break;
        case TileFlag.CF_CANDLE1: return defaultToUnderCombo(screen.secretTiles[SecretCombo.SECCMB_BCANDLE]);
        case TileFlag.CF_ARROW: break;
        case TileFlag.CF_BOMB: return screen.secretTiles[SecretCombo.SECCMB_BOMB];
        case TileFlag.CF_FAIRY: break;
        case TileFlag.CF_RAFT: break;
        case TileFlag.CF_ARMOSSECRET: return defaultToUnderCombo(screen.secretTiles[SecretCombo.SECCMB_STAIRS]);
        case TileFlag.CF_ARMOSITEM: break;
        case TileFlag.CF_SBOMB: break;
        case TileFlag.CF_RAFTBRANCH: break;
        case TileFlag.CF_DIVEITEM: break;
        case TileFlag.CF_ZELDA: break;
        case TileFlag.CF_TRAPH: break;
        case TileFlag.CF_TRAPV: break;
        case TileFlag.CF_TRAP4WAY: break;
        case TileFlag.CF_TRAPLR: break;
        case TileFlag.CF_TRAPUD: break;
        case TileFlag.CF_PUSHLR: break;
        case TileFlag.CF_PUSHUP: break;
        case TileFlag.CF_PUSHDOWN: break;
        case TileFlag.CF_PUSHLEFT: break;
        case TileFlag.CF_PUSHRIGHT: break;
        case TileFlag.CF_PUSHUPDOWNNS: break;
        case TileFlag.CF_PUSHLEFTRIGHTNS: break;
        case TileFlag.CF_PUSH4WAYNS: break;
        case TileFlag.CF_PUSHUPNS: break;
        case TileFlag.CF_PUSHDOWNNS: break;
        case TileFlag.CF_PUSHLEFTNS: break;
        case TileFlag.CF_PUSHRIGHTNS: break;
        case TileFlag.CF_PUSHUPDOWNINS: break;
        case TileFlag.CF_PUSHLEFTRIGHTINS: break;
        case TileFlag.CF_PUSH4WAYINS: break;
        case TileFlag.CF_PUSHUPINS: break;
        case TileFlag.CF_PUSHDOWNINS: break;
        case TileFlag.CF_PUSHLEFTINS: break;
        case TileFlag.CF_PUSHRIGHTINS: break;
        case TileFlag.CF_BLOCKTRIGGER: break;
        case TileFlag.CF_NOBLOCKS: break;
        case TileFlag.CF_BRANG1: break;
        case TileFlag.CF_BRANG2: break;
        case TileFlag.CF_BRANG3: break;
        case TileFlag.CF_ARROW2: break;
        case TileFlag.CF_ARROW3: break;
        case TileFlag.CF_CANDLE2: break;
        case TileFlag.CF_WANDFIRE: break;
        case TileFlag.CF_DINSFIRE: break;
        case TileFlag.CF_WANDMAGIC: break;
        case TileFlag.CF_REFMAGIC: break;
        case TileFlag.CF_REFFIREBALL: break;
        case TileFlag.CF_SWORD1: break;
        case TileFlag.CF_SWORD2: break;
        case TileFlag.CF_SWORD3: break;
        case TileFlag.CF_SWORD4: break;
        case TileFlag.CF_SWORD1BEAM: break;
        case TileFlag.CF_SWORD2BEAM: break;
        case TileFlag.CF_SWORD3BEAM: break;
        case TileFlag.CF_SWORD4BEAM: break;
        case TileFlag.CF_HOOKSHOT: break;
        case TileFlag.CF_WAND: break;
        case TileFlag.CF_HAMMER: break;
        case TileFlag.CF_STRIKE: break;
        case TileFlag.CF_BLOCKHOLE: break;
        case TileFlag.CF_MAGICFAIRY: break;
        case TileFlag.CF_ALLFAIRY: break;
        case TileFlag.CF_SINGLE: break;
        case TileFlag.CF_SINGLE16: break;
        case TileFlag.CF_NOENEMY: break;
        case TileFlag.CF_NOGROUNDENEMY: break;
        case TileFlag.CF_SCRIPT1: break;
        case TileFlag.CF_SCRIPT2: break;
        case TileFlag.CF_SCRIPT3: break;
        case TileFlag.CF_SCRIPT4: break;
        case TileFlag.CF_SCRIPT5: break;
      }

      console.log('TODO sflag:', TileFlag[sflag]);

      // TODO remove
      if (sflag) return { tile: 0 };
    }

    return defaultTile;
  }

  _getFlag(screen: QuestMaker.Screen, screenState: QuestMaker.ScreenState, x: number, y: number, layerIndex: number): TileFlag {
    // @ts-expect-error
    const zcScreen = getZcScreen();
    const flag = screenState.replacedFlags[layerIndex][x][y] ?? zcScreen.sflag[x + y * screenWidth];
    return flag;
  }

  isSolid(x: number, y: number, quadrant?: number) {
    if (!Utils.inBounds(x, y, screenWidth, screenHeight)) return true;

    const tileNumber = this._getTile(this.app.state.currentScreen, this.getCurrentScreenState(), x, y, 0).tile;
    if (quadrant === undefined) {
      return !this.app.state.quest.tiles[tileNumber].walkable.every(b => b);
    } else {
      return !this.app.state.quest.tiles[tileNumber].walkable[quadrant];
    }
  };

  _checkForTransition() {
    const state = this.app.state;

    let transitionX = 0;
    let transitionY = 0;
    let direction = 0;

    if (this.heroEntity.x + this.heroEntity.width / 2 > tileSize * screenWidth) {
      transitionX = 1;
      direction = 3;
    } else if (this.heroEntity.x + this.heroEntity.width / 2 < 0) {
      transitionX = -1;
      direction = 2;
    } else if (this.heroEntity.y + this.heroEntity.height / 2 < 0) {
      transitionY = -1;
      direction = 0;
    } else if (this.heroEntity.y + this.heroEntity.height / 2 > tileSize * screenHeight) {
      transitionY = 1;
      direction = 1;
    }

    if (transitionX === 0 && transitionY === 0) return;

    if (state.game.warpReturnTransition) {
      state.game.screenTransition = state.game.warpReturnTransition;
      delete state.game.warpReturnTransition;
      return;
    }

    let targetScreen = { x: state.screenX + transitionX, y: state.screenY + transitionY };
    let targetDmapIndex = state.dmapIndex;

    const canSideWarp =
      (direction === 0 && ScreenFlags.up(state.currentScreen.flags)) ||
      (direction === 1 && ScreenFlags.down(state.currentScreen.flags)) ||
      (direction === 2 && ScreenFlags.left(state.currentScreen.flags)) ||
      (direction === 3 && ScreenFlags.right(state.currentScreen.flags));
    // idk :)
    // @ts-expect-error
    const sideWarpIndex = (getZcScreen().sideWarpIndex >> (direction * 2)) & 3;
    const sideWarp = canSideWarp && state.currentScreen.warps.sideWarps.find((warp) => warp.index === sideWarpIndex);
    if (sideWarp) {
      if (sideWarp.type === 'scroll') {
        targetScreen = { x: sideWarp.screenX, y: sideWarp.screenY };
        targetDmapIndex = sideWarp.dmap;
      } else {
        const { transition, returnTransition } = this._createScreenTransitionFromWarp(sideWarp);
        state.game.screenTransition = transition;
        state.game.warpReturnTransition = returnTransition;
        return;
      }
    }

    const targetMap = state.quest.maps[state.quest.dmaps[targetDmapIndex].map];
    if (!Utils.inBounds(targetScreen.x, targetScreen.y, targetMap.screens.length, targetMap.screens[0].length)) return;
    if (!targetMap.screens[targetScreen.x] || !targetMap.screens[targetScreen.x][targetScreen.y]) return;

    state.game.screenTransition = {
      type: 'scroll',
      frames: 0,
      dmap: targetDmapIndex, // TODO: fold into screen property
      screen: targetScreen,
      screenDelta: { x: transitionX, y: transitionY },
      newScreenContainer: this.createScreenContainer(targetDmapIndex, targetScreen.x, targetScreen.y),
    };
  }

  getScreen(dmapIndex: number, mapIndex: number, sx: number, sy: number) {
    // TODO: should dmapIndex always be enough?
    const dmap = this.app.state.quest.dmaps[dmapIndex] || { map: mapIndex };
    const screen = this.app.state.quest.maps[dmap.map].screens[sx][sy];
    return screen;
  }

  getScreenLayer(screen: QuestMaker.Screen, layerIndex: number) {
    if (layerIndex === 0) return screen;

    const layer = screen.layers[layerIndex - 1];
    if (layer) return this.app.state.quest.maps[layer.map].screens[layer.x][layer.y];
  }

  createScreenLayerContainer(dmapIndex: number, screen: QuestMaker.Screen, layerIndex: number) {
    const container = new PIXI.Container();
    const state = this.app.state;
    const dmap = state.quest.dmaps[dmapIndex] || { map: 0 };
    const layerScreen = this.getScreenLayer(screen, layerIndex);
    if (!layerScreen) return container;

    if (layerIndex > 0) {
      container.alpha = screen.layers[layerIndex - 1]?.opacity ?? 1;
    }

    const paletteIndex = this.app.getPaletteIndex(dmap, layerScreen);
    const screenState = this.getScreenState(screen);

    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        const tile = this._getTile(layerScreen, screenState, x, y, layerIndex);
        if (tile.tile === 0 && layerIndex != 0) continue;

        const sprite = this.app.createTileSprite(tile, paletteIndex);
        sprite.x = x * tileSize;
        sprite.y = y * tileSize;
        container.addChild(sprite);
      }
    }

    return container;
  }

  createScreenContainer(dmapIndex: number, sx: number, sy: number) {
    const container = new PIXI.Container();
    const state = this.app.state;
    const dmap = state.quest.dmaps[dmapIndex];
    const screen = state.quest.maps[dmap.map].screens[sx][sy];

    const bg = new PIXI.Graphics();
    bg.beginFill(0);
    bg.drawRect(0, 0, screenWidth * tileSize, screenHeight * tileSize);
    bg.endFill();
    container.addChild(bg);

    container.addChild(this.createScreenLayerContainer(dmapIndex, screen, 0));
    for (let i = 0; i < screen.layers.length; i++) {
      container.addChild(this.createScreenLayerContainer(dmapIndex, screen, i + 1));
    }

    return container;
  }

  createScreenHitAreas() {
    this.hitTest.addSection('screen', 0xff0000);

    const state = this.app.state;
    const screen = state.currentScreen;
    const screenState = this.getCurrentScreenState();

    const add = (x: number, y: number, size: number) => {
      this.hitTest.add('screen', x, y, size, size);
    };

    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        const walkable = [true, true, true, true];

        // These layers are used for walkable checks.
        for (let i = 0; i <= 2; i++) {
          let layerScreen;
          if (i === 0) {
            layerScreen = screen;
          } else {
            const layer = screen.layers[i - 1];
            if (!layer) continue;

            layerScreen = state.quest.maps[layer.map].screens[layer.x][layer.y];
          }

          const { tile } = this._getTile(layerScreen, screenState, x, y, i);
          walkable[0] &&= state.quest.tiles[tile].walkable[0];
          walkable[1] &&= state.quest.tiles[tile].walkable[1];
          walkable[2] &&= state.quest.tiles[tile].walkable[2];
          walkable[3] &&= state.quest.tiles[tile].walkable[3];
        }

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

      // TODO ticks.
      spawnEntity.animationSpeed = 0.15;
      spawnEntity.play();
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

  createEntityFromEnemy(enemy: QuestMaker.Enemy, x: number, y: number, npc = false) {
    const entity = new QuestEntity(npc ? 'npc' : 'enemy', enemy.attributes);
    entity.x = x * tileSize;
    entity.y = y * tileSize;
    entity.enemyType = enemy.type;
    entity.life = 2;

    const cset = enemy.attributes['enemy.cset'] || 0;

    // TODO: working out the best way to handle animation. couple ways exist now.

    let framesToTextures: Record<string, PIXI.Texture[]> = {};
    if (enemy.frames) {
      // TODO: probably will remove all this.
      for (const [name, graphicIds] of Object.entries(enemy.frames)) {
        framesToTextures[name] = graphicIds.map(id => this.app.createGraphicSprite(id, -1, cset).texture);
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

      if (Object.keys(framesToTextures).length === 0) throw new Error('missing textures');
      entity.setFrame(Object.keys(framesToTextures)[0]);
    }

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

    const makeTextures = () => [weapon.graphic].map(f => this.app.createGraphicSprite(f, -1, weapon.cset).texture);

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

  killEntity(entity: QuestEntity) {
    this.removeEntity(entity);
    this.getCurrentScreenState().enemiesKilled += 1;

    if (this.getCurrentScreenState().enemiesKilled === this.app.state.currentScreen.enemies.length) {
      if (ScreenFlags.killAllEnemiesForSecrets(this.app.state.currentScreen.flags)) {
        this.triggerSecrets();
      }
      if (ScreenFlags.item(this.app.state.currentScreen.flags)) {
        this.createScreenItem();
        this.app.soundManager.playSfx(Sfx.SFX_CLEARED);
      }
    }

    const items = this.app.state.quest.items.filter(item => item.tile && item.name.match(/rupee|heart/i))
    if (items.length) {
      const item = items[Utils.random(0, items.length - 1)];
      this.createItem(item.id, entity.x / tileSize, entity.y / tileSize);
    }

    this.app.soundManager.playSfx(entity.misc.get('enemy.deathSfx'));
  }

  removeEntity(entity: QuestEntity) {
    this.entityLayer.removeChild(entity);
    const index = this.entities.findIndex(e => e === entity);
    if (index !== -1) this.entities.splice(index, 1);
  }

  getCurrentScreenState(): QuestMaker.ScreenState {
    return this.getScreenState(this.app.state.currentScreen);
  }

  getScreenState(screen: QuestMaker.Screen): QuestMaker.ScreenState {
    const state = this.app.state;
    let screenState = state.game.screenStates.get(screen);
    if (!screenState) {
      screenState = {
        enemiesKilled: 0,
        secretsTriggered: false,
        replacedTiles: Utils.create3dArray(constants.numLayers, screenWidth, screenHeight, null),
        replacedFlags: Utils.create3dArray(constants.numLayers, screenWidth, screenHeight, null),
        collectedItem: false,
      };
      state.game.screenStates.set(screen, screenState);
    }
    return screenState;
  }

  onEnterScreen() {
    const state = this.app.state;

    if (state.quest.name !== 'debug') {
      const song = state.currentScreen.midi ?? state.quest.dmaps[state.dmapIndex].song;
      this.app.soundManager.playSong(song);
    }

    if (!ScreenFlags.item(state.currentScreen.flags)) this.createScreenItem();

    this.spawnEnemies();

    // Update UI that lives in react, like the current dmap title.
    this.app.ui.actions.setState(state);

    this.hasMovedSinceEnteredScreen = false;

    this.heroEntity.visible = !ScreenFlags.invisibleHero(state.currentScreen.flags);
  }

  createScreenItem() {
    const state = this.app.state;
    if (!state.currentScreen.item) return;
    if (this.getCurrentScreenState().collectedItem) return;
    if (ScreenFlags.itemIsSecret(state.currentScreen.flags) && !this.getCurrentScreenState().secretsTriggered) return;

    const item = this.createItem(state.currentScreen.item.id, state.currentScreen.item.x, state.currentScreen.item.y);
    item.misc.set('item.isScreenItem', true);
  }

  spawnEnemies() {
    const state = this.app.state;
    const enemies = Object.entries(state.currentScreen.enemies);
    const screenState = this.getScreenState(state.currentScreen);
    enemies.splice(0, screenState.enemiesKilled);
    if (!enemies.length) return;

    const enemyFlagLocations = [];
    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        const flag = this._getFlag(state.currentScreen, screenState, x, y, 0);
        if (flag >= TileFlag.CF_ENEMY0 && flag <= TileFlag.CF_ENEMY9) {
          const enemyIndex = flag - TileFlag.CF_ENEMY0;
          enemyFlagLocations[enemyIndex] = { x, y };
        }
      }
    }

    const walkableLocations = this.getWalkableLocations();

    for (let [i, enemyData] of enemies) {
      if (!enemyData) continue;

      const index = Number(i); // :(

      let pos;
      if (enemyFlagLocations[index]) {
        pos = enemyFlagLocations[index];
      } else {
        if (walkableLocations.length === 0) break;
        [pos] = walkableLocations.splice(Utils.random(0, walkableLocations.length - 1), 1);
      }

      const enemy = state.quest.enemies[enemyData.enemyId];
      this.spawnEnemy(enemy, pos.x, pos.y);
    }
  }

  getWalkableLocations() {
    const walkableLocations = [];

    for (let x = 0; x < screenWidth; x++) {
      for (let y = 0; y < screenHeight; y++) {
        if (Utils.isSolid(this.app.state, x, y)) continue;
        if (Math.abs(x - this.heroEntity.x / tileSize) <= 1 && Math.abs(y - this.heroEntity.y / tileSize) <= 1) continue;

        walkableLocations.push({ x, y });
      }
    }

    return walkableLocations;
  }

  performSwordAttack() {
    this.swordSprite.alpha = 1;

    const equippedIndex = this.app.state.game.equipped[1];
    if (equippedIndex === null) return;

    const equippedItemType = this.app.state.game.inventory[equippedIndex].item;
    const equippedItem = this.app.state.quest.items[equippedItemType];
    this.app.soundManager.playSfx(equippedItem.useSound);
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
      this.container.x = (transition.frames / duration) * screenWidth * tileSize * Math.sign(-transition.screenDelta.x);
      this.container.y = (transition.frames / duration) * screenHeight * tileSize * Math.sign(-transition.screenDelta.y);
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
          this.layers[4].removeChildren();
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
      }

      state.screenX = transition.screen.x;
      state.screenY = transition.screen.y;
      this.container.x = 0;
      this.container.y = 0;

      if (transition.type === 'scroll') {
        if (Math.sign(transition.screenDelta.x) === 1) this.heroEntity.x = 0;
        else if (Math.sign(transition.screenDelta.x) === -1) this.heroEntity.x = (tileSize - 1) * screenWidth;
        else if (Math.sign(transition.screenDelta.y) === 1) this.heroEntity.y = 0;
        else if (Math.sign(transition.screenDelta.y) === -1) this.heroEntity.y = (tileSize - 1) * screenHeight - 5; // ?
      }

      this.show();

      if (transition.item) {
        this.createItem(transition.item, screenWidth / 2, screenHeight / 2);
      }
      if (transition.guy !== undefined) {
        this.createEntityFromEnemy(state.quest.enemies[transition.guy], screenWidth / 2, screenHeight / 3, true);
      }
      if (transition.string !== undefined) {
        let str = '';
        let curStr = transition.string;
        while (curStr) {
          str += state.quest.misc.strings[curStr].string + ' ';
          curStr = state.quest.misc.strings[curStr].nextString;
        }
        Utils.find('.string').textContent = str;
      } else {
        Utils.find('.string').textContent = '';
      }
    }
  }

  /**
   * Creates transition object, but doesn't apply it.
   */
  _createScreenTransitionFromWarp(warp: QuestMaker.Warp): { transition: QuestMaker.ScreenTransition, returnTransition?: QuestMaker.ScreenTransition } {
    const state = this.app.state;

    let dmapIndex = undefined;
    let newScreenLocation = { x: state.screenX, y: state.screenY + 1 };
    let newPosition = undefined;
    let returnTransition = undefined;
    let item = undefined;
    let string = undefined;

    if (warp && warp.type === 'direct') {
      newScreenLocation = { x: warp.screenX, y: warp.screenY };
      dmapIndex = warp.dmap;

      // Set the position to set link at. First try 'warp.returns' based on the warp index.
      // Fall back to the screen's arrival coordinates.
      if (dmapIndex !== undefined) {
        const state = this.app.state;
        const dmap = state.quest.dmaps[dmapIndex];
        const newScreen = state.quest.maps[dmap.map].screens[warp.screenX][warp.screenY];
        newPosition = newScreen.warps.returns[warp.index];

        if (!newPosition.x && !newPosition.y && newScreen.warps.arrival) {
          newPosition = newScreen.warps.arrival;
        }

        string = newScreen.string;
      }
    }

    if (warp && warp.type === 'special-room') {
      newScreenLocation = { x: 0, y: 8 };
      returnTransition = this._createScreenTransitionFromWarp({
        index: warp.index,
        type: 'direct',
        dmap: state.dmapIndex,
        screenX: state.screenX,
        screenY: state.screenY,
      }).transition;
      // Hardcode spawn at bottom of screen.
      newPosition = {
        x: screenWidth * tileSize / 2 - this.heroEntity.width / 2,
        y: screenHeight * (tileSize - 2),
      };

      if (warp.item !== undefined) {
        item = warp.item;
      }

      string = warp.string;
    }

    let transitionType: QuestMaker.ScreenTransitionType;
    if (warp.type === 'special-room') transitionType = 'direct';
    else transitionType = warp.type;

    return {
      transition: {
        type: transitionType,
        frames: 0,
        dmap: dmapIndex,
        item,
        string,
        guy: warp.type === 'special-room' ? warp.guy : undefined,
        screen: newScreenLocation,
        position: newPosition,
        screenDelta: { x: 0, y: 0 },
        newScreenContainer: this.createScreenContainer(dmapIndex ?? state.dmapIndex, newScreenLocation.x, newScreenLocation.y),
      },
      returnTransition,
    };
  }

  performTileAction(type: TileType, tile: number, flag: TileFlag, names: string[], x: number, y: number, layerIndex: number) {
    const state = this.app.state;
    const warpIndex = getWarpIndex(type);

    if (warpIndex !== undefined && this.hasMovedSinceEnteredScreen) {
      if ((names.includes('bottomLeft') && names.includes('bottomRight')) || (names.includes('bottom') && names.includes('top'))) {
        const warp = state.currentScreen.warps.tileWarps.find((warp) => warp.index === warpIndex);
        if (warp) {
          const { transition, returnTransition } = this._createScreenTransitionFromWarp(warp);
          state.game.screenTransition = transition;
          state.game.warpReturnTransition = returnTransition;
        }
      }
    } else if (type === TileType['Slow Walk']) {
      this.heroEntity.speed = DEFAULT_HERO_SPEED * 0.5;
    } else if (type === TileType['Conveyor Left']) {
      this.heroEntity.misc.set('conveyor.vx', -0.5);
    } else if (type === TileType['Conveyor Right']) {
      this.heroEntity.misc.set('conveyor.vx', 0.5);
    } else if (type === TileType['Conveyor Up']) {
      this.heroEntity.misc.set('conveyor.vy', -0.5);
    } else if (type === TileType['Conveyor Down']) {
      this.heroEntity.misc.set('conveyor.vy', 0.5);
    }

    const pushData = getPushData(flag);
    if (pushData) {
      const screenState = this.getCurrentScreenState(); // TODO: move this to property

      let dx = 0;
      let dy = 0;
      if (this.heroEntity.vy < 0 && pushData.directions.includes('up')) {
        dy = -1;
      } else if (this.heroEntity.vy > 0 && pushData.directions.includes('down')) {
        dy = 1
      } else if (this.heroEntity.vx > 0 && pushData.directions.includes('right')) {
        dx = 1
      } else if (this.heroEntity.vx < 0 && pushData.directions.includes('left')) {
        dx = -1
      }

      if ((dx || dy) && !this.isSolid(x + dx, y + dy)) {
        screenState.replacedTiles[layerIndex][x + dx][y + dy] = { tile };
        screenState.replacedTiles[layerIndex][x][y] = { tile: 0 };
        if (pushData.many) {
          screenState.replacedFlags[layerIndex][x + dx][y + dy] = TileFlag.CF_NONE;
        } else {
          screenState.replacedFlags[layerIndex][x][y] = TileFlag.CF_NONE;
        }
        screenState.secretsTriggered ||= pushData.triggerSecrets;
        this.initDraw();
      }
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

    this.app.soundManager.playSfx(item.pickupSound || Sfx.SFX_PLINK);
  }
}
