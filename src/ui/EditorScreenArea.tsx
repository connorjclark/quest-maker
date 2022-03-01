import { h, Component } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { screenHeight, screenWidth, tileSize } from '../constants';
import { inBounds } from '../utils';

type Props = {
  canvas: HTMLCanvasElement;
  map: QuestMaker.Map_;
  screenX: number;
  screenY: number;
  visibleLayers: boolean[];
};
export class EditorScreenArea extends Component<Props> {
  private layerContainers: PIXI.Container[] = [];

  render(props: Props) {
    const ref = useRef<HTMLDivElement | null>(null);

    const app = window.app;
    if (!app) return;

    useEffect(() => {
      ref.current?.append(props.canvas);
    });

    useEffect(() => {
      if (!ref.current) return;

      app.pixi.stage.removeChildren();

      this.createScreenArea(app, props.map, props.screenX, props.screenY);
      app.resize();
    }, [props.map, props.screenX, props.screenY]);

    useEffect(() => {
      if (!ref.current) return;

      for (let i = 0; i < props.visibleLayers.length; i++) {
        this.layerContainers[i].visible = props.visibleLayers[i];
      }
    }, [props.visibleLayers]);

    return <div class="canvas-wrapper" ref={ref}></div>;
  }

  private createScreenArea(app: QuestMaker.App, map: QuestMaker.Map_, screenX: number, screenY: number) {
    const currentScreen = map.screens[screenX][screenY];

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
    container.addChild(tilePreviewContainer);

    // layer -> x -> y
    const spritesByLocation: PIXI.Sprite[][][] = [];
    for (let layer = 0; layer <= 6; layer++) {
      spritesByLocation.push([]);
      for (let i = 0; i < screenWidth; i++) spritesByLocation[layer].push([]);
    }

    const renderLayer = (layerIndex: number) => {
      this.layerContainers[layerIndex] = new PIXI.Container();
      tilesContainer.addChild(this.layerContainers[layerIndex]);

      let layerMap;
      let layerScreens;
      let layerScreen;
      if (layerIndex === 0) {
        layerMap = map;
        layerScreens = map.screens;
        layerScreen = currentScreen;
      } else {
        const layer = currentScreen.layers[layerIndex - 1];
        if (!layer) return;

        layerMap = app.state.quest.maps[layer.map];
        layerScreens = layerMap.screens;
        layerScreen = layerMap.screens[layer.x][layer.y];
      }

      // First/last row/column is from neighboring screen.
      for (let x = -1; x <= screenWidth; x++) {
        for (let y = -1; y <= screenHeight; y++) {
          let x0 = x;
          let y0 = y;
          let sx = screenX;
          let sy = screenY;

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

          let screen: QuestMaker.Screen | null = null;

          if (sx !== screenX || sy !== screenY) {
            if (inBounds(sx, sy, layerScreens.length, layerScreens[0].length)) {
              // For the one tile edge around the current screen, get neighboring screen's same layer.
              let neighboringLayerScreen;
              if (layerIndex === 0) {
                neighboringLayerScreen = map.screens[sx][sy];
              } else {
                const neighboringLayer = map.screens[sx][sy]?.layers[layerIndex - 1];
                if (neighboringLayer) neighboringLayerScreen = app.state.quest.maps[neighboringLayer.map].screens[neighboringLayer.x][neighboringLayer.y];
              }
              if (neighboringLayerScreen) {
                screen = neighboringLayerScreen;
              }
            }
          } else {
            // Current screen rendering.
            screen = layerScreen;
          }

          let sprite;
          if (screen) {
            const screenTile = screen.tiles[x0][y0];
            if (!screenTile) continue;
            if (screenTile.tile === 0 && layerIndex !== 0) continue;

            sprite = app.createTileSprite(screenTile);
            if (x === -1 || y === -1 || x === screenWidth || y === screenHeight) {
              sprite.tint = 0xaaaaaa;
            } else {
              spritesByLocation[layerIndex][x][y] = sprite;
            }
          } else if (layerIndex === 0) {
            sprite = new PIXI.Graphics();
            sprite.beginFill(0xff);
            sprite.drawRect(0, 0, tileSize, tileSize);
            sprite.endFill();
          }

          if (sprite) {
            sprite.x = (x + 1) * tileSize;
            sprite.y = (y + 1) * tileSize;
            this.layerContainers[layerIndex].addChild(sprite);
          }
        }
      }
    };

    const render = () => {
      app.destroyChildren(tilesContainer);
      renderLayer(0);
      for (let i = 1; i <= currentScreen.layers.length; i++) {
        renderLayer(i);
      }
    };

    const setTile = (e: PIXI.InteractionEvent) => {
      const newTile = app.state.editor.currentTile;
      const selectedLayerIndex = app.state.editor.selectedLayer;

      let selectedLayerScreen;
      if (selectedLayerIndex === 0) {
        selectedLayerScreen = currentScreen;
      } else {
        const selectedLayer = currentScreen.layers[selectedLayerIndex - 1];
        if (!selectedLayer) return;

        selectedLayerScreen = app.state.quest.maps[selectedLayer.map].screens[selectedLayer.x][selectedLayer.y];
      }

      const pos = e.data.getLocalPosition(e.currentTarget);
      const x = Math.floor(pos.x / tileSize) - 1;
      const y = Math.floor(pos.y / tileSize) - 1;
      if (!inBounds(x, y, screenWidth, screenHeight)) return;

      if (selectedLayerScreen.tiles[x][y].tile !== newTile) {
        selectedLayerScreen.tiles[x][y].tile = newTile;
        spritesByLocation[selectedLayerIndex][x][y].destroy();
        const sprite = spritesByLocation[selectedLayerIndex][x][y] = app.createTileSprite({ tile: newTile });
        sprite.x = (x + 1) * tileSize;
        sprite.y = (y + 1) * tileSize;
        tilesContainer.addChild(sprite);
        spritesByLocation[selectedLayerIndex][x][y] = sprite;
      }
    };

    const setPreviewTile = (e: PIXI.InteractionEvent) => {
      app.destroyChildren(tilePreviewContainer);

      const tilePreviewSprite = app.createTileSprite({ tile: app.state.editor.currentTile });
      const pos = e.data.getLocalPosition(e.currentTarget);
      const x = Math.floor(pos.x / tileSize);
      const y = Math.floor(pos.y / tileSize);
      if (!inBounds(x - 1, y - 1, screenWidth, screenHeight)) return;

      tilePreviewContainer.x = x * tileSize;
      tilePreviewContainer.y = y * tileSize;
      tilePreviewContainer.addChild(tilePreviewSprite);
    };

    container.addListener('mousedown', (e) => {
      if (e.data.originalEvent.metaKey || e.data.originalEvent.ctrlKey) {
        const pos = e.data.getLocalPosition(e.currentTarget);
        const x = Math.floor(pos.x / tileSize) - 1;
        const y = Math.floor(pos.y / tileSize) - 1;
        app.ui.actions.setCurrentTile(currentScreen.tiles[x][y].tile);
      } else {
        container.addListener('mousemove', setTile);
        setTile(e);
      }
    });
    container.addListener('mouseup', (e) => {
      container.removeListener('mousemove', setTile);
    });

    container.addListener('mouseover', (e) => {
      container.addListener('mousemove', setPreviewTile);
    });
    container.addListener('mouseout', (e) => {
      app.destroyChildren(tilePreviewContainer);
      container.removeListener('mousemove', setPreviewTile);
    });

    render();
    app.pixi.stage.addChild(container);
    return {
      render,
    };
  }
}
