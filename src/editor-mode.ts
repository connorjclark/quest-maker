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

export class EditorMode extends QuestMakerMode {
  init() {
    super.init();

    const screenArea = this.createScreenArea();
    screenArea.container.width = this.app.pixi.screen.width * 0.8;
    screenArea.container.scale.y = screenArea.container.scale.x;
    this.container.addChild(screenArea.container);
    containers.screenArea = screenArea;

    const tilePicker = this.createTilePicker();
    tilePicker.container.x = screenArea.container.width;
    tilePicker.container.width = this.app.pixi.screen.width * 0.2;
    tilePicker.container.scale.y = tilePicker.container.scale.x;
    this.container.addChild(tilePicker.container);

    const screenPicker = this.createScreenPicker();
    screenPicker.container.y = screenArea.container.height;
    screenPicker.container.height = this.app.pixi.screen.height - screenArea.container.height;
    screenPicker.container.scale.y = screenPicker.container.scale.x;
    this.container.addChild(screenPicker.container);
    containers.screenPicker = screenPicker;
  }

  tick() {
    let dx = 0, dy = 0;
    if (this.app.keys.down['ArrowLeft']) dx -= 1;
    else if (this.app.keys.down['ArrowRight']) dx += 1;
    else if (this.app.keys.down['ArrowUp']) dy -= 1;
    else if (this.app.keys.down['ArrowDown']) dy += 1;

    if (dx !== 0 || dy !== 0) {
      this.app.state.editor.screenX = clamp(0, this.app.state.editor.screenX + dx, this.app.state.quest.screens.length - 1);
      this.app.state.editor.screenY = clamp(0, this.app.state.editor.screenY + dy, this.app.state.quest.screens[0].length - 1);
      this.app.state.currentScreen = this.app.state.quest.screens[this.app.state.editor.screenX][this.app.state.editor.screenY];
      containers.screenArea.render();
      containers.screenPicker.render();
    }
  }

  private createTilePicker() {
    const state = this.app.state;

    const container = new PIXI.Container();
    container.interactive = true;
    const width = 3;

    for (let i = 0; i < state.quest.tiles.length; i++) {
      const sprite = this.app.createTileSprite(i);
      sprite.x = (i % width) * sprite.width;
      sprite.y = Math.floor(i / width) * sprite.height;
      container.addChild(sprite);
    }

    const tilePicker = {
      container,
    };

    container.addListener('click', (e) => {
      const pos = e.data.getLocalPosition(e.currentTarget);
      state.editor.currentTile = Math.floor(pos.x / tileSize) + Math.floor(pos.y / tileSize) * 3;
    });

    const border = new PIXI.Graphics();
    border.lineStyle(1);
    border.lineTo(0, container.height);
    container.addChild(border);

    return tilePicker;
  }

  private createScreenPicker() {
    const state = this.app.state;

    const container = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    const size = 10;
    container.addChild(gfx);
    container.interactive = true;

    function render() {
      gfx.clear();
      for (let x = 0; x < 15; x++) {
        for (let y = 0; y < 15; y++) {
          const screen = x < state.quest.screens.length && state.quest.screens[x][y];
          let color = 0;
          if (screen) color = 0x0000ff;
          if (x === state.editor.screenX && y === state.editor.screenY) color = 0x00ff00;
          gfx.beginFill(color);
          gfx.drawRect(x * size, y * size, size, size);
          gfx.endFill();
        }
      }
    }

    render();
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
          let sx = state.editor.screenX;
          let sy = state.editor.screenY;

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
          if (sx !== state.editor.screenX || sy !== state.editor.screenY) {
            screen = inBounds(sx, sy, state.quest.screens.length, state.quest.screens[0].length) ? state.quest.screens[sx][sy] : null;
          }

          const tile = screen ? screen.tiles[x0][y0].tile : 0;
          const sprite = this.app.createTileSprite(tile);
          sprite.x = (x + 1) * tileSize;
          sprite.y = (y + 1) * tileSize;
          if (state.currentScreen !== screen) sprite.tint = 0xaaaaaa;
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
