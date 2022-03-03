import { h, Component } from 'preact';
import { useContext, useEffect, useRef } from 'preact/hooks';
import { Tile } from './common';
import * as Utils from '../utils';
import { tileSize } from '../constants';
import { AppContext, QuestMakerProps } from './QuestMaker';
import { TileEditor } from './TileEditor';

type TilePickerProps = {
  tiles: QuestMaker.Tile[];
};
class TilePicker extends Component<TilePickerProps> {
  render(props: TilePickerProps) {
    const context = useContext(AppContext);

    const ref = useRef<any>(null);

    useEffect(() => {
      if (!props.tiles.length) return;

      let app = window.app;
      if (!app) return;

      const pixi = new PIXI.Application({
        view: ref.current,
      });
      const _textureCache = new Map();
      // @ts-ignore
      pixi.loader = app.pixi.loader;
      app.addScrollHandling(pixi);

      app = new Proxy(app, {
        get(target: QuestMaker.App, key: string) {
          if (key === 'pixi') return pixi;
          if (key === '_textureCache') return _textureCache;
          // @ts-expect-error
          return target[key];
        },
      }) as QuestMaker.App;

      const container = this.createTilePicker(app, props.tiles, context);
      pixi.stage.addChild(container);
      pixi.stage.interactive = true;
      pixi.view.width = container.width;
    }, [props.tiles]);

    return <canvas ref={ref}></canvas>
  }

  private createTilePicker(app: QuestMaker.App, tiles: QuestMaker.Tile[], context: QuestMakerProps) {
    const scale = 2;
    const scaledTileSize = scale * tileSize;

    const container = new PIXI.Container();
    container.interactive = true;

    const tilesAcross = 4;
    const tilesVertical = Math.ceil(tiles.length / tilesAcross);

    const mask = new PIXI.Graphics();
    mask.beginFill(0);
    mask.drawRect(0, 0, tilesAcross * scaledTileSize, tilesVertical * scaledTileSize);
    mask.endFill();
    container.addChild(mask);

    const tilesContainer = new PIXI.Container();
    tilesContainer.mask = mask;
    container.addChild(tilesContainer);

    // Loading all the tile sprites is a lot of work,
    // so only generate them if in view.
    const lazyLoadTileSprites = () => {
      const viewport = app.pixi.screen;
      for (const [tileContainer, i] of spriteToTileNumber.entries()) {
        if (tileContainer.children.length !== 0) continue;

        const pos = tileContainer.getGlobalPosition();
        if (pos.x >= viewport.x &&
          pos.y >= viewport.y &&
          pos.x <= viewport.width &&
          pos.y <= viewport.height) {
          tileContainer.addChild(app.createTileSprite({ tile: i }, 0));
        }
      }
    };

    const onScroll = (e: WheelEvent) => {
      tilesContainer.y = Utils.clamp(-tilesContainer.height, tilesContainer.y - e.deltaY * 0.5, 0);
      lazyLoadTileSprites();
    }

    const spriteToTileNumber = new Map<PIXI.Container, number>();
    for (let i = 0; i < tiles.length; i++) {
      const tileContainer = new PIXI.Container();
      tileContainer.scale.set(scale);
      tileContainer.interactive = true;
      tileContainer.x = (i % tilesAcross) * scaledTileSize;
      tileContainer.y = Math.floor(i / tilesAcross) * scaledTileSize;
      tileContainer.addListener('scroll', onScroll);
      tilesContainer.addChild(tileContainer);
      spriteToTileNumber.set(tileContainer, i);
    }
    lazyLoadTileSprites();

    container.addListener('click', (e) => {
      const sprite = e.target as PIXI.Sprite;
      const tileNumber = spriteToTileNumber.get(sprite);
      if (tileNumber !== undefined) {
        context.setCurrentTile({ tile: tileNumber });
      }
    });

    container.addListener('scroll', onScroll);

    return container;
  }
}

type TilesTabProps = {
  selectedTile?: QuestMaker.ScreenTile;
  tiles: QuestMaker.Tile[];
};
export class TilesTab extends Component<TilesTabProps> {
  render(props: TilesTabProps) {
    const context = useContext(AppContext);

    return <div class="tiles-tab">
      <div onClick={() => props.selectedTile && context.setWindow(<TileEditor tile={props.tiles[props.selectedTile.tile]}></TileEditor>)}>
        <Tile screenTile={props.selectedTile || { tile: 0 }} scale={4}></Tile>
      </div>
      <div class="tile-pickers">
        <TilePicker tiles={props.tiles}></TilePicker>
        {/* Just have one for now. */}
        {/* <TilePicker tiles={props.tiles}></TilePicker> */}
      </div>
    </div>;
  }
}
