import { h, Component } from 'preact';
import { useMemo } from 'preact/hooks';
import createStore from 'redux-zero';
import { Provider, connect } from 'redux-zero/preact';
import { Actions, BoundActions } from 'redux-zero/types/Actions';
import { tileSize } from '../constants';

export type ComponentProps<S, T extends Actions<S>> = S & BoundActions<S, T>;
type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;
type ExportedActions<A> = { [K in keyof A]: A[K] extends Function ? OmitFirstArg<A[K]> : never };

export function createSubApp<S, A>(component: any, initialState: S, actions: () => A) {
  // const mapToProps = ({ possibleUsages, selectedTool }: State) => ({ possibleUsages, selectedTool });
  const mapToProps = (f: any) => f;
  const ConnectedComponent = connect(mapToProps, actions)(component);
  const store = createStore(initialState);
  const SubApp = () => (
    <Provider store={store}>
      <ConnectedComponent value={10} />
    </Provider>
  );

  const actionsObj = actions();
  // @ts-expect-error
  const exportedActions: ExportedActions<A> = actionsObj;
  // eslint-disable-next-line guard-for-in
  for (const key in exportedActions) {
    const fn = exportedActions[key];
    // @ts-expect-error
    exportedActions[key] = (...args: any[]) => {
      const newState = fn(store.getState(), ...args);
      // @ts-expect-error
      store.setState(newState);
    };
  }

  const subscribe = (fn: (state: S) => void) => {
    store.subscribe(fn);
  };

  return { SubApp, exportedActions, subscribe };
}

type TileProps = { screenTile: QuestMaker.ScreenTile, scale: number };
export class Tile extends Component<TileProps> {
  render(props: TileProps) {
    const app = window.app;
    if (!app) return;

    const bgImg = useMemo(() => {
      const sprite = app.createTileSprite(props.screenTile);
      sprite.scale.set(props.scale);
      const container = new PIXI.Container();
      container.addChild(sprite);
      const url = app.pixi.renderer.extract.canvas(container).toDataURL();
      app.destroyChildren(container);
      return url;
    }, [props.screenTile]);

    const width = tileSize * props.scale + 'px';
    const height = tileSize * props.scale + 'px';
    return <div class="tile" style={{ backgroundImage: `url(${bgImg})`, width, height }}></div>
  }
}
