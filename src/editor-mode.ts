import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";

const { screenWidth, screenHeight, tileSize } = constants;

const containers: Record<string, { render(): void }> = {};

function clamp(min: number, val: number, max: number) {
  if (min > val) return min;
  if (max < val) return max;
  return val;
}

const inBounds = (x: number, y: number, width: number, height: number) => x >= 0 && y >= 0 && x < width && y < height;

// Get a ratio for resize in a bounds
function getRatio(obj: {width: number, height: number}, w: number, h: number) {
  let r = Math.min(w / obj.width, h / obj.height);
  return r;
}

export class EditorMode extends QuestMakerMode {
  init() {
    super.init();

    const screenArea = this.createScreenArea();
    const screenAreaRatio = getRatio(screenArea.container, this.app.pixi.screen.width * 0.8, this.app.pixi.screen.height * 0.8);
    screenArea.container.scale.set(screenAreaRatio);
    this.container.addChild(screenArea.container);
    containers.screenArea = screenArea;

    const tilePicker = this.createTilePicker({scale: 2, width: this.app.pixi.screen.width - screenArea.container.width});
    tilePicker.container.x = screenArea.container.width;
    this.container.addChild(tilePicker.container);

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

  private createTilePicker(opts: {scale: number, width: number}) {
    const state = this.app.state;

    const container = new PIXI.Container();
    
    const tabs: Record<string, {button: PIXI.Container, content: PIXI.Container}> = {};
    
    const tabButtons = new PIXI.Container();
    const currentTabContents = new PIXI.Container();
    currentTabContents.scale.set(opts.scale);
    container.addChild(tabButtons);
    container.addChild(currentTabContents);

    function addTab(name: string, content: PIXI.Container) {      
      const tabButton = new PIXI.Text(name, {fontFamily : 'Arial', fontSize: 20, align : 'center'});
      tabButton.x = tabButtons.width ? tabButtons.width + 10 : 0;
      tabButtons.addChild(tabButton);
      
      tabButton.interactive = true;
      tabButton.addListener('click', () => setTab(name));

      tabs[name] = {button: tabButton, content};
    }

    function setTab(name: string) {
      currentTabContents.y = tabButtons.height;
      currentTabContents.removeChildren();
      currentTabContents.addChild(tabs[name].content);

      for (const [name_, {button}] of Object.entries(tabs)) {
        button.alpha = name === name_ ? 1 : 0.5;
      }
    }

    const createTilesTab = () => {
      const contents = new PIXI.Container();
      contents.interactive = true;
      const tilesAcross = Math.min(opts.width / (tileSize * opts.scale));
  
      for (let i = 0; i < state.quest.tiles.length; i++) {
        const sprite = this.app.createTileSprite(i);
        sprite.x = (i % tilesAcross) * sprite.width;
        sprite.y = Math.floor(i / tilesAcross) * sprite.height;
        contents.addChild(sprite);
      }
  
      contents.addListener('click', (e) => {
        const pos = e.data.getLocalPosition(e.currentTarget);
        state.editor.currentTile = Math.floor(pos.x / tileSize) + Math.floor(pos.y / tileSize) * tilesAcross;
      });

      return contents;
    };

    addTab('tiles', createTilesTab());
    addTab('enemies', new PIXI.Container());
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

    const tilePicker = {
      container,
    };
    return tilePicker;
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
}
