import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";
import { ReactiveContainer } from './engine/reactive-container';
import { TileType } from './types';
import * as Utils from './utils';

const { screenWidth, screenHeight, tileSize } = constants;

const containers: Record<string, { render(): void }> = {};

const inBounds = (x: number, y: number, width: number, height: number) => x >= 0 && y >= 0 && x < width && y < height;

// move to engine/
function makeDomContainer(container: PIXI.Container) {
  function toggleDomElements(children: PIXI.DisplayObject[], show: boolean) {
    for (const child of children) {
      if (child instanceof PIXI.Container) {
        toggleDomElements(child.children, show);
      } else if (child instanceof DomElementDisplayObject) {
        child.show(show);
      }
    }
  }

  container.addListener('added', () => toggleDomElements(container.children, true));
  container.addListener('removed', () => toggleDomElements(container.children, false));
}

class DOM {
  static createElement(name: string, className?: string, attrs: Record<string, (string | undefined)> = {}): HTMLElement {
    const element = window.document.createElement(name);
    if (className) {
      element.className = className;
    }
    Object.keys(attrs).forEach(key => {
      const value = attrs[key];
      if (typeof value !== 'undefined') {
        element.setAttribute(key, value);
      }
    });
    return element;
  }

  static createChildOf(parentElem: Element, elementName: string, className?: string, attrs: Record<string, (string | undefined)> = {}): HTMLElement {
    const element = this.createElement(elementName, className, attrs);
    parentElem.appendChild(element);
    return element;
  }
}

class DomElementDisplayObject extends PIXI.DisplayObject {
  public el = document.createElement('div');
  private lastPoint = this.getGlobalPosition();

  constructor(private app: QuestMaker.App, private width: number, private height: number) {
    super();

    this.el.style['position'] = 'absolute';
    document.body.appendChild(this.el);
  }

  calculateBounds() {
    this._bounds.clear();
    const { x, y } = this.getGlobalPosition(undefined, true);
    const rect = this.el.getBoundingClientRect();
    this._bounds.addPoint({ x: x, y: y });
    this._bounds.addPoint({ x: x + rect.width, y: y });
    this._bounds.addPoint({ x: x + rect.width, y: y + rect.height });
    this._bounds.addPoint({ x: x, y: y + rect.height });
  }

  render() {
    const pos = this.getGlobalPosition(undefined, true);
    pos.x = pos.x / this.app.pixi.screen.width * this.app.pixi.view.clientWidth;
    pos.y = pos.y / this.app.pixi.screen.height * this.app.pixi.view.clientHeight;
    if (pos.x !== this.lastPoint.x || pos.y !== this.lastPoint.y) {
      this.lastPoint = pos;

      this.el.style.width = this.width / this.app.pixi.screen.width * this.app.pixi.view.clientWidth + 'px';
      this.el.style.height = this.height / this.app.pixi.screen.height * this.app.pixi.view.clientHeight + 'px'; // ??
      this.el.style.left = pos.x + 'px';
      this.el.style.top = pos.y + 'px';

      this.show(true);
    }
  }

  show(show: boolean) {
    this.el.style.visibility = show ? 'visible' : 'hidden';
  }
}

export class EditorMode extends QuestMakerMode {
  init() {
    super.init();

    const screenArea = this.createScreenArea();
    screenArea.container.scale.set(2);
    this.container.addChild(screenArea.container);
    containers.screenArea = screenArea;

    const rightPanel = this.createRightPanel();
    rightPanel.container.x = screenArea.container.width;
    this.container.addChild(rightPanel.container);

    const screenPicker = this.createScreenPicker();
    screenPicker.container.y = screenArea.container.height;
    screenPicker.container.height = this.app.pixi.screen.height - screenArea.container.height;
    screenPicker.container.scale.y = screenPicker.container.scale.x;
    this.container.addChild(screenPicker.container);
    containers.screenPicker = screenPicker;
  }

  show() {
    super.show();

    containers.screenArea.render();
    containers.screenPicker.render();
  }

  tick() {
    let dx = 0, dy = 0;
    if (this.app.keys.down['ArrowLeft']) dx -= 1;
    else if (this.app.keys.down['ArrowRight']) dx += 1;
    else if (this.app.keys.down['ArrowUp']) dy -= 1;
    else if (this.app.keys.down['ArrowDown']) dy += 1;

    if (dx !== 0 || dy !== 0) {
      this.setScreen(this.app.state.mapIndex, this.app.state.screenX + dx, this.app.state.screenY + dy);
    }
  }

  private setScreen(mapIndex: number, x: number, y: number) {
    const state = this.app.state;

    mapIndex = Utils.clamp(0, mapIndex, state.quest.maps.length - 1);
    const screens = state.quest.maps[mapIndex].screens;
    x = Utils.clamp(0, x, screens.length - 1);
    y = Utils.clamp(0, y, screens[0].length - 1);

    if (mapIndex === state.mapIndex && x === state.screenX && y === state.screenY) {
      return;
    }

    state.mapIndex = mapIndex
    state.currentMap = state.quest.maps[mapIndex];
    state.screenX = x;
    state.screenY = y;
    state.currentScreen = screens[x][y];

    containers.screenArea.render();
    containers.screenPicker.render();
  }

  private createRightPanel() {
    const container = new PIXI.Container();

    const tabs: Record<string, { button: PIXI.Container, content: PIXI.Container }> = {};

    const tabButtons = new PIXI.Container();
    const currentTabContents = new PIXI.Container();
    container.addChild(tabButtons);
    container.addChild(currentTabContents);

    function addTab(name: string, content: PIXI.Container) {
      const tabButton = new PIXI.Text(name, { fontFamily: 'Arial', fontSize: 20, align: 'center' });
      tabButton.x = tabButtons.width ? tabButtons.width + 10 : 0;
      tabButtons.addChild(tabButton);

      tabButton.interactive = true;
      tabButton.addListener('click', () => setTab(name));

      tabs[name] = { button: tabButton, content };
    }

    function setTab(name: string) {
      currentTabContents.y = tabButtons.height;
      currentTabContents.removeChildren();
      currentTabContents.addChild(tabs[name].content);

      for (const [name_, { button }] of Object.entries(tabs)) {
        button.alpha = name === name_ ? 1 : 0.5;
      }
    }

    const createTilesTab = () => {
      const contents = new PIXI.Container();
      const n = 2 as number; // hard code for now.
      const scale = n === 2 ? 1.5 : 1;

      const currentTileContainer = new ReactiveContainer((container, { currentTile }) => {
        container.removeChildren();
        container.addChild(this.app.createTileSprite({ tile: currentTile }));
      }, () => ({ currentTile: this.app.state.editor.currentTile }));
      currentTileContainer.scale.set(2);
      contents.addChild(currentTileContainer);

      currentTileContainer.interactive = true;
      currentTileContainer.addListener('click', () => this.openTileEditor());

      const picker1 = this.createTilePicker({ scale });
      picker1.y = currentTileContainer.height + 8;
      contents.addChild(picker1);

      const picker2 = this.createTilePicker({ scale });
      picker2.x = picker1.width + 16;
      picker2.y = currentTileContainer.height + 8;
      contents.addChild(picker2);

      if (n === 3) {
        const picker3 = this.createTilePicker({ scale });
        picker3.x = picker2.x + picker2.width + 16;
        picker3.y = currentTileContainer.height + 8;
        contents.addChild(picker3);
      }

      return contents;
    };

    const createEnemiesTab = () => {
      const contents = new PIXI.Container();
      contents.scale.set(2, 2);

      const enemyPickerContainer = new ReactiveContainer((container, props) => {
        container.removeChildren();

        const tilesAcross = 3;
        for (let i = 0; i < props.enemies.length; i++) {
          const enemy = props.enemies[i];
          const frame = Object.values(enemy.frames)[0][0];
          const sprite = this.app.createGraphicSprite(frame, enemy.attributes['enemy.cset']);
          sprite.x = (i % tilesAcross) * tileSize;
          sprite.y = Math.floor(i / tilesAcross) * tileSize;
          container.addChild(sprite);

          sprite.interactive = true;
          sprite.addListener('click', () => {
            this.app.state.currentScreen.enemies.push({ enemyId: enemy.id });
          });
        }
      }, () => ({ enemies: this.app.state.quest.enemies.filter(e => e.name) }));
      contents.addChild(enemyPickerContainer);

      const enemySelectionContainer = new ReactiveContainer((container, props) => {
        container.removeChildren();

        const tilesAcross = 3;
        for (let i = 0; i < props.enemies.length; i++) {
          const enemy = this.app.state.quest.enemies[props.enemies[i].enemyId];
          const frame = Object.values(enemy.frames)[0][0];
          const sprite = this.app.createGraphicSprite(frame, enemy.attributes['enemy.cset']);
          sprite.x = (i % tilesAcross) * tileSize;
          sprite.y = Math.floor(i / tilesAcross) * tileSize;
          container.addChild(sprite);

          sprite.interactive = true;
          sprite.addListener('click', () => {
            this.app.state.currentScreen.enemies.splice(i, 1);
          });
        }
      }, () => ({ enemies: this.app.state.currentScreen.enemies }));
      enemySelectionContainer.y = enemyPickerContainer.height + 10;
      contents.addChild(enemySelectionContainer);

      return contents;
    };

    const createMiscTab = () => {
      const contents = new PIXI.Container();
      makeDomContainer(contents);

      const elDisplayObject = new DomElementDisplayObject(this.app, container.width, 300);
      elDisplayObject.el.classList.add('tab-panel');
      contents.addChild(elDisplayObject);

      const graphicsButton = document.createElement('button');
      graphicsButton.innerText = 'Gfx';
      graphicsButton.addEventListener('click', () => this.openGfxViewer());
      elDisplayObject.el.appendChild(graphicsButton);

      const warpButton = document.createElement('button');
      warpButton.innerText = 'Warps';
      warpButton.addEventListener('click', () => this.openWarpEditor());
      elDisplayObject.el.appendChild(warpButton);

      return contents;
    };

    addTab('tiles', createTilesTab());
    addTab('enemies', createEnemiesTab());
    addTab('misc', createMiscTab());
    setTab('tiles');

    const borderContainer = new PIXI.Container();
    const border = new PIXI.Graphics();
    border.lineStyle(1);
    border.lineTo(0, this.app.pixi.screen.height);
    borderContainer.addChild(border);
    container.addChild(borderContainer);

    // Resize?
    // borderContainer.interactive = true;
    // borderContainer.addListener('mousedown', mousedown);
    // function mousedown() {
    //   console.log('?')
    //   borderContainer.addListener('mousemove', mousemove);
    //   borderContainer.addListener('mouseup', mouseup);
    // }
    // function mousemove(e: PIXI.InteractionEvent) {
    //   console.log(e);
    // }
    // function mouseup(e: PIXI.InteractionEvent) {
    //   borderContainer.removeListener('mousemove', mousemove);
    //   borderContainer.removeListener('mouseup', mouseup);
    // }

    const rightPanel = {
      container,
    };
    return rightPanel;
  }

  private createTilePicker(opts: { scale: number }) {
    const state = this.app.state;
    const scaledTileSize = opts.scale * tileSize;

    const container = new PIXI.Container();
    container.interactive = true;

    const tilesAcross = 4;
    const tilesVertical = Math.ceil(state.quest.tiles.length / tilesAcross);

    const mask = new PIXI.Graphics();
    mask.beginFill(0);
    mask.drawRect(0, 0, tilesAcross * scaledTileSize, tilesVertical * scaledTileSize);
    mask.endFill();
    container.addChild(mask);

    const tilesContainer = new PIXI.Container();
    tilesContainer.mask = mask;
    container.addChild(tilesContainer);

    const spriteToTileNumber = new Map();
    for (let i = 0; i < state.quest.tiles.length; i++) {
      const sprite = this.app.createTileSprite({ tile: i });
      sprite.scale.set(opts.scale);
      sprite.interactive = true;
      sprite.x = (i % tilesAcross) * scaledTileSize;
      sprite.y = Math.floor(i / tilesAcross) * scaledTileSize;
      sprite.addListener('scroll', onScroll);
      tilesContainer.addChild(sprite);
      spriteToTileNumber.set(sprite, i);
    }

    container.addListener('click', (e) => {
      const tileNumber = spriteToTileNumber.get(e.target);
      if (tileNumber !== undefined) state.editor.currentTile = spriteToTileNumber.get(e.target);
    });

    function onScroll(e: WheelEvent) {
      tilesContainer.y = Utils.clamp(-tilesContainer.height, tilesContainer.y - e.deltaY * 0.5, 0);
    }
    container.addListener('scroll', onScroll);

    return container;
  }

  private createScreenPicker() {
    const state = this.app.state;
    const screens = state.currentMap.screens;

    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    const size = 10;
    container.addChild(gfx);
    render();

    const text = new PIXI.Text('Press Shift to toggle play test');
    text.x = container.width;
    container.addChild(text);

    function render() {
      gfx.clear();
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 9; y++) {
          const screen = x < screens.length && screens[x][y];
          let color = 0;
          if (screen) color = 0x0000ff;
          if (x === state.screenX && y === state.screenY) color = 0x00ff00;
          gfx.beginFill(color);
          gfx.drawRect(x * size, y * size, size, size);
          gfx.endFill();
        }
      }
    }

    container.interactive = true;

    function throttle(cb: Function, timeout: number) {
      let lastCall = 0;
      return function (...args: any) {
        if (Date.now() - lastCall > timeout) {
          lastCall = Date.now();
          cb(...args);
        }
      }
    }
    const onScroll = throttle((e: WheelEvent) => {
      this.setScreen(state.mapIndex + Math.sign(e.deltaY), state.screenX, state.screenY)
    }, 1000);
    container.addListener('scroll', onScroll);

    return { container, render };
  }

  private createScreenArea() {
    const state = this.app.state;

    const container = new PIXI.Container();
    container.interactive = true;

    const bg = new PIXI.Graphics();
    bg.beginFill(0);
    bg.drawRect(0, 0, screenWidth * tileSize, screenHeight * tileSize);
    bg.endFill();
    container.addChild(bg);

    const tilesContainer = new PIXI.Container();
    tilesContainer.interactive = true;
    container.addChild(tilesContainer);

    const tilePreviewContainer = new PIXI.Container();
    tilePreviewContainer.alpha = 0.6;

    const render = () => {
      tilesContainer.removeChildren();
      const screens = state.currentMap.screens;

      // First/last row/column is from neighboring screen.
      for (let x = -1; x <= screenWidth; x++) {
        for (let y = -1; y <= screenHeight; y++) {
          let x0 = x;
          let y0 = y;
          let sx = state.screenX;
          let sy = state.screenY;

          if (x0 === -1) {
            sx -= 1;
            x0 = screenWidth - 1;
          } else if (x0 === screenWidth) {
            sx += 1;
            x0 = 0;
          }

          if (y0 === -1) {
            sy -= 1;
            y0 = screenHeight - 1;
          } else if (y0 === screenHeight) {
            sy += 1;
            y0 = 0;
          }

          let screen: QuestMaker.Screen | null = state.currentScreen;
          if (sx !== state.screenX || sy !== state.screenY) {
            screen = inBounds(sx, sy, screens.length, screens[0].length) ? screens[sx][sy] : null;
          }

          let sprite;
          if (screen) {
            const screenTile = screen ? screen.tiles[x0][y0] : { tile: 0 };
            sprite = this.app.createTileSprite(screenTile);
            if (state.currentScreen !== screen) sprite.tint = 0xaaaaaa;
          } else {
            sprite = new PIXI.Graphics();
            sprite.beginFill(0);
            sprite.drawRect(0, 0, tileSize, tileSize);
            sprite.endFill();
          }

          sprite.x = (x + 1) * tileSize;
          sprite.y = (y + 1) * tileSize;
          tilesContainer.addChild(sprite);
        }
      }

      tilesContainer.addChild(tilePreviewContainer);
    };

    const setTile = (e: PIXI.InteractionEvent) => {
      const pos = e.data.getLocalPosition(e.currentTarget);
      const x = Math.floor(pos.x / tileSize) - 1;
      const y = Math.floor(pos.y / tileSize) - 1;
      if (!inBounds(x, y, screenWidth, screenHeight)) return;

      if (state.currentScreen.tiles[x][y].tile !== state.editor.currentTile) {
        state.currentScreen.tiles[x][y].tile = state.editor.currentTile;
        render();
      }
    };

    const setPreviewTile = (e: PIXI.InteractionEvent) => {
      tilePreviewContainer.removeChildren();

      const tilePreviewSprite = this.app.createTileSprite({ tile: state.editor.currentTile });
      const pos = e.data.getLocalPosition(e.currentTarget);
      const x = Math.floor(pos.x / tileSize);
      const y = Math.floor(pos.y / tileSize);
      if (!inBounds(x - 1, y - 1, screenWidth, screenHeight)) return;

      tilePreviewContainer.x = x * tileSize;
      tilePreviewContainer.y = y * tileSize;
      tilePreviewContainer.addChild(tilePreviewSprite);
    };

    tilesContainer.addListener('mousedown', (e) => {
      tilesContainer.addListener('mousemove', setTile);
      setTile(e);
    });
    tilesContainer.addListener('mouseup', (e) => {
      tilesContainer.removeListener('mousemove', setTile);
    });

    tilesContainer.addListener('mouseover', (e) => {
      tilesContainer.addListener('mousemove', setPreviewTile);
    });
    tilesContainer.addListener('mouseout', (e) => {
      tilePreviewContainer.removeChildren();
      tilesContainer.removeListener('mousemove', setPreviewTile);
    });

    render();
    return {
      container,
      render,
    };
  }

  openTileEditor() {
    const state = this.app.state;

    const elDisplayObject = new DomElementDisplayObject(this.app, 300, 300);
    const contents = new ReactiveContainer((container, props) => {
      container.removeChildren();

      const selectedTile = this.app.createTileSprite({ tile: props.tile.id });
      selectedTile.scale.set(4);
      container.addChild(selectedTile);

      const walkableTile = this.app.createTileSprite({ tile: props.tile.id });
      walkableTile.x = selectedTile.width + 20;
      walkableTile.scale.set(4);
      container.addChild(walkableTile);

      for (let quadrant = 0; quadrant < props.tile.walkable.length; quadrant++) {
        if (props.tile.walkable[quadrant]) continue;
        const gfx = new PIXI.Graphics();
        if (quadrant % 2 === 1) gfx.x = tileSize / 2;
        if (quadrant >= 2) gfx.y = tileSize / 2;
        gfx.beginFill(0xff0000, 0.8);
        gfx.drawRect(0, 0, tileSize / 2, tileSize / 2);
        gfx.endFill();
        walkableTile.addChild(gfx);
      }

      walkableTile.interactive = true;
      walkableTile.addListener('click', (e) => {
        let quadrant = 0;
        const pos = e.data.getLocalPosition(e.target);
        if (pos.x / tileSize > 0.5) quadrant += 1;
        if (pos.y / tileSize > 0.5) quadrant += 2;
        state.quest.tiles[props.tile.id].walkable[quadrant] = !state.quest.tiles[props.tile.id].walkable[quadrant];
      });

      elDisplayObject.y = walkableTile.height + 10;
      elDisplayObject.el.innerHTML = '';
      container.addChild(elDisplayObject);

      DOM.createChildOf(elDisplayObject.el, 'label', undefined, { style: 'color: white' }).innerText = 'Type: ';
      const typeSelectEl = DOM.createChildOf(elDisplayObject.el, 'select') as HTMLInputElement;
      for (const type of Object.values(TileType)) {
        const selected = props.tile.type === type ? 'true' : undefined;
        const el = DOM.createChildOf(typeSelectEl, 'option', undefined, { value: type, selected });
        el.innerText = type;
      }
      typeSelectEl.addEventListener('change', () => {
        state.quest.tiles[props.tile.id].type = typeSelectEl.value as QuestMaker.TileType;
      });
    }, () => ({ tile: state.quest.tiles[state.editor.currentTile] }));

    makeDomContainer(this.createPopupWindow(contents));
  }

  openGfxViewer() {
    const state = this.app.state;

    const contents = new ReactiveContainer((container, props) => {
      container.removeChildren();

      for (let i = 0; i < props.graphics.length; i++) {
        const tilesInRow = 19;
        const x = (i % tilesInRow) * tileSize;
        const y = Math.floor(i / tilesInRow) * tileSize;
        const sprite = this.app.createGraphicSprite(i);
        sprite.x = x;
        sprite.y = y;
        container.addChild(sprite);
      }
    }, () => ({ graphics: state.quest.graphics }));
    contents.scale.set(2, 2);

    this.createPopupWindow(contents);
  }

  openWarpEditor() {
    const state = this.app.state;

    const elDisplayObject = new DomElementDisplayObject(this.app, 300, 300);
    const contents = new ReactiveContainer((container, props) => {
      container.removeChildren();

      elDisplayObject.el.innerHTML = '';
      container.addChild(elDisplayObject);

      const onChange = () => {
        // TODO: remove, put in deserializing code when start caring about data size.
        state.currentScreen.warps.a = state.currentScreen.warps.a || { x: 0, y: 0, screenX: 0, screenY: 0 };

        state.currentScreen.warps.a.screenX = Utils.clamp(0, inputs.screenX.valueAsNumber, 100);
        state.currentScreen.warps.a.screenY = Utils.clamp(0, inputs.screenY.valueAsNumber, 100);
        state.currentScreen.warps.a.x = Utils.clamp(0, inputs.x.valueAsNumber, screenWidth);
        state.currentScreen.warps.a.y = Utils.clamp(0, inputs.y.valueAsNumber, screenHeight);
      };

      const inputs: Record<string, HTMLInputElement> = {};
      function makeInput(name: string, value: any, label: string) {
        DOM.createChildOf(elDisplayObject.el, 'label', undefined, { style: 'color: white' }).innerText = label + ': ';
        const inputEl = DOM.createChildOf(elDisplayObject.el, 'input', undefined, {
          type: 'number',
          value: String(value),
        }) as HTMLInputElement;
        inputs[name] = inputEl;
        inputEl.addEventListener('change', onChange);
      }

      makeInput('screenX', props.screen.warps.a?.screenX || 0, 'Screen X');
      makeInput('screenY', props.screen.warps.a?.screenY || 0, 'Screen Y');
      makeInput('x', props.screen.warps.a?.x, 'X');
      makeInput('y', props.screen.warps.a?.y, 'Y');
    }, () => ({ screen: state.currentScreen }));

    makeDomContainer(this.createPopupWindow(contents));
  }

  createPopupWindow(contents: PIXI.Container) {
    const windowContainer = new PIXI.Container();
    this.container.addChild(windowContainer);

    const background = new PIXI.Graphics();
    background.interactive = true;
    background.beginFill(0, 0.5);
    background.drawRect(0, 0, this.app.pixi.screen.width, this.app.pixi.screen.height);
    background.endFill();
    windowContainer.addChild(background);

    const innerContainer = new PIXI.Container();
    windowContainer.addChild(innerContainer);

    const insetSize = 5;
    const innerWidth = contents.width + insetSize * 2;
    const innerHeight = contents.height + insetSize * 2;
    const innerBackground = new PIXI.Graphics();
    innerBackground.interactive = true;
    innerBackground.beginFill(0);
    innerBackground.x = (this.app.pixi.screen.width - innerWidth) / 2;
    innerBackground.y = (this.app.pixi.screen.height - innerHeight) / 2;
    innerBackground.drawRect(0, 0, innerWidth, innerHeight);
    innerBackground.endFill();
    innerContainer.addChild(innerBackground);

    contents.x = innerBackground.x + insetSize;
    contents.y = innerBackground.y + insetSize;
    innerContainer.addChild(contents);

    const onClickOutside = () => {
      background.removeListener('click', onClickOutside);
      this.container.removeChild(windowContainer);
    };
    background.addListener('click', onClickOutside);

    return windowContainer;
  }
}
