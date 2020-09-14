import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";
import { ReactiveContainer } from './engine/reactive-container';
import { TileType } from './types';

const { screenWidth, screenHeight, tileSize } = constants;

const containers: Record<string, { render(): void }> = {};

function clamp(min: number, val: number, max: number) {
  if (min > val) return min;
  if (max < val) return max;
  return val;
}

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

type HTMLElementByTagName = HTMLElementTagNameMap & { [id: string]: HTMLElement };
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
      this.app.state.screenX = clamp(0, this.app.state.screenX + dx, this.app.state.quest.screens.length - 1);
      this.app.state.screenY = clamp(0, this.app.state.screenY + dy, this.app.state.quest.screens[0].length - 1);
      this.app.state.currentScreen = this.app.state.quest.screens[this.app.state.screenX][this.app.state.screenY];
      containers.screenArea.render();
      containers.screenPicker.render();
    }
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
        container.addChild(this.app.createTileSprite(currentTile));
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
      makeDomContainer(contents);

      const elDisplayObject = new DomElementDisplayObject(this.app, container.width, 300);
      contents.addChild(elDisplayObject);

      const p = document.createElement('p');
      p.innerText = 'hello world hello world hello world hello world hello world';
      elDisplayObject.el.appendChild(p);
      elDisplayObject.el.classList.add('tab-panel')

      return contents;
    };

    addTab('tiles', createTilesTab());
    addTab('enemies', createEnemiesTab());
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
      const sprite = this.app.createTileSprite(i);
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
      tilesContainer.y = clamp(-tilesContainer.height, tilesContainer.y - e.deltaY * 0.5, 0);
    }
    container.addListener('scroll', onScroll);

    return container;
  }

  private createScreenPicker() {
    const state = this.app.state;

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
      for (let x = 0; x < 15; x++) {
        for (let y = 0; y < 15; y++) {
          const screen = x < state.quest.screens.length && state.quest.screens[x][y];
          let color = 0;
          if (screen) color = 0x0000ff;
          if (x === state.screenX && y === state.screenY) color = 0x00ff00;
          gfx.beginFill(color);
          gfx.drawRect(x * size, y * size, size, size);
          gfx.endFill();
        }
      }
    }

    return { container, render };
  }

  private createScreenArea() {
    const state = this.app.state;

    const container = new PIXI.Container();
    container.interactive = true;

    const render = () => {
      container.removeChildren();

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
            screen = inBounds(sx, sy, state.quest.screens.length, state.quest.screens[0].length) ? state.quest.screens[sx][sy] : null;
          }

          let sprite;
          if (screen) {
            const tile = screen ? screen.tiles[x0][y0].tile : 0;
            sprite = this.app.createTileSprite(tile);
            if (state.currentScreen !== screen) sprite.tint = 0xaaaaaa;
          } else {
            sprite = new PIXI.Graphics();
            sprite.beginFill(0);
            sprite.drawRect(0, 0, tileSize, tileSize);
            sprite.endFill();
          }

          sprite.x = (x + 1) * tileSize;
          sprite.y = (y + 1) * tileSize;
          container.addChild(sprite);
        }
      }
    };

    function onMouseMove(e: PIXI.InteractionEvent) {
      const pos = e.data.getLocalPosition(e.currentTarget);
      const x = Math.floor(pos.x / tileSize) - 1;
      const y = Math.floor(pos.y / tileSize) - 1;
      if (!inBounds(x, y, screenWidth, screenHeight)) return;

      if (state.currentScreen.tiles[x][y].tile !== state.editor.currentTile) {
        state.currentScreen.tiles[x][y].tile = state.editor.currentTile;
        render();
      }
    }

    container.addListener('mousedown', (e) => {
      container.addListener('mousemove', onMouseMove);
      onMouseMove(e);
    });
    container.addListener('mouseup', (e) => {
      container.removeListener('mousemove', onMouseMove);
    });
    // container.addListener('mouseout', (e) => {
    //   container.removeListener('mousemove', onMouseMove);
    // });

    render();
    return {
      container,
      render,
    };
  }

  openTileEditor() {
    const state = this.app.state;

    const elDisplayObject = new DomElementDisplayObject(this.app, 300, 300);
    const tileEditorContainer = new ReactiveContainer((container, props) => {
      container.removeChildren();

      const selectedTile = this.app.createTileSprite(props.tile.id);
      selectedTile.scale.set(4);
      container.addChild(selectedTile);

      const walkableTile = this.app.createTileSprite(props.tile.id);
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

    makeDomContainer(this.createPopupWindow(tileEditorContainer));
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
