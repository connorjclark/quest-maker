import * as constants from './constants';
import { QuestMakerMode } from "./quest-maker-mode";

const {screenWidth, screenHeight, tileSize} = constants;

const containers: Record<string, PIXI.Container> = {};

export class EditorMode extends QuestMakerMode {
  init() {
    super.init();

    const screenArea = this.createScreenArea();
    screenArea.container.width = this.app.pixi.screen.width * 0.8;
    screenArea.container.scale.y = screenArea.container.scale.x;
    this.container.addChild(screenArea.container);

    const tilePicker = this.createTilePicker();
    tilePicker.container.x = screenArea.container.width;
    tilePicker.container.width = this.app.pixi.screen.width * 0.2;
    tilePicker.container.scale.y = tilePicker.container.scale.x;
    this.container.addChild(tilePicker.container);

    containers.screen = screenArea.container;
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

  private createScreenArea() {
    const state = this.app.state;

    const container = new PIXI.Container();
    container.interactive = true;

    const render = () => {
      container.removeChildren();
      for (let x = 0; x < screenWidth; x++) {
        for (let y = 0; y < screenHeight; y++) {
          const { tile } = state.currentScreen.tiles[x][y];
          const sprite = this.app.createTileSprite(tile);
          sprite.x = x * tileSize;
          sprite.y = y * tileSize;
          container.addChild(sprite);
        }
      }
    };
  
    function onMouseMove(e: PIXI.InteractionEvent) {
      const pos = e.data.getLocalPosition(e.currentTarget);
      const x = Math.floor(pos.x / tileSize);
      const y = Math.floor(pos.y / tileSize);
  
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
