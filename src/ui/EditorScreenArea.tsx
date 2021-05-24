import { h, Component } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { screenHeight, screenWidth, tileSize } from '../constants';
import { inBounds } from '../utils';

type Props = {
  canvas: HTMLCanvasElement;
  map: QuestMaker.Map_;
  screenX: number;
  screenY: number;
  screen: QuestMaker.Screen;
};
export class EditorScreenArea extends Component<Props> {
  render(props: Props) {
    const ref = useRef<HTMLDivElement|null>(null);

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

    const spritesByLocation: PIXI.Sprite[][] = [];
    for (let i = 0; i < screenWidth; i++) spritesByLocation.push([]);
  
    const render = () => {
      app.destroyChildren(tilesContainer);
      const screens = map.screens;
  
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
  
          let screen: QuestMaker.Screen | null = currentScreen;
          if (sx !== screenX || sy !== screenY) {
            screen = inBounds(sx, sy, screens.length, screens[0].length) ? screens[sx][sy] : null;
          }
  
          let sprite;
          if (screen) {
            const screenTile = screen ? screen.tiles[x0][y0] : { tile: 0 };
            sprite = app.createTileSprite(screenTile);
            if (currentScreen !== screen) sprite.tint = 0xaaaaaa;
            if (currentScreen === screen) {
              spritesByLocation[x][y] = sprite;
            }
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
    };
  
    const setTile = (e: PIXI.InteractionEvent) => {
      const newTile = app.state.editor.currentTile;

      const pos = e.data.getLocalPosition(e.currentTarget);
      const x = Math.floor(pos.x / tileSize) - 1;
      const y = Math.floor(pos.y / tileSize) - 1;
      if (!inBounds(x, y, screenWidth, screenHeight)) return;

      if (currentScreen.tiles[x][y].tile !== newTile) {
        currentScreen.tiles[x][y].tile = newTile;
        spritesByLocation[x][y].destroy();
        const sprite = spritesByLocation[x][y] = app.createTileSprite({tile: newTile});
        sprite.x = (x + 1) * tileSize;
        sprite.y = (y + 1) * tileSize;
        tilesContainer.addChild(sprite);
        spritesByLocation[x][y] = sprite;
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
      container.addListener('mousemove', setTile);
      setTile(e);
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
