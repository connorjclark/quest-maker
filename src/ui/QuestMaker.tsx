import { render, h, Component, createContext, JSX } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { ComponentProps, createSubApp } from './common';
import * as Utils from '../utils';
import { TabbedPane, TabbedPaneProps } from './TabbedPane';
import { EditorScreenArea } from './EditorScreenArea';
import { TilesTab } from './TilesTab';

class Header extends Component {
  render() {
    return <div class="header">
      <div>
        <button onClick={() => {
          const url = new URL(document.location.href);
          url.search = '';
          document.location.href = url.toString();
        }}>Back to quests</button>
      </div>

      <div>
        <button>Save (TODO)</button>
      </div>
    </div>
  }
}

type BottomProps = {
  screenX: number;
  screenY: number;
  currentMapIndex: number;
  maps: QuestMaker.Map_[];
}
class Bottom extends Component<BottomProps> {
  render() {
    const [selectedLayer, setSelectedLayer] = useState(0);
    const [visibleLayers, setVisibleLayers] = useState([true, true, true, true, true, true, true]);
    const context = useContext(AppContext);
    const ref = useRef<HTMLCanvasElement>(null);
    const currentMap = this.props.maps[this.props.currentMapIndex];

    useEffect(() => {
      if (!ref.current) return;
      if (!currentMap) return;

      const canvas = ref.current as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (!context) return;

      const size = 10;

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 9; y++) {
          const screen = x < currentMap.screens.length && currentMap.screens[x][y];
          let color = 'black';
          if (screen) color = '#0000ff';
          if (x === this.props.screenX && y === this.props.screenY) color = '#00ff00';

          context.fillStyle = color;
          context.fillRect(x * size, y * size, size, size);
        }
      }
    }, [currentMap, this.props.screenX, this.props.screenY]);

    const options = []
    for (let i = 0; i < this.props.maps.length; i++) {
      options.push(<option value={i}>Map {i}</option>);
    }

    return <div class="bottom flex">
      <div class="flex flex-column">
        <canvas ref={ref}></canvas>
        <select value={this.props.currentMapIndex} onChange={(e: any) => context.setCurrentMapIndex(Number(e.target.value))}>
          {options}
        </select>
        {this.props.screenX}, {this.props.screenY}
      </div>

      <div>
        <div class="flex">
          <span class="md-5">Layers:</span>
          {Array.from({ length: 7 }).map((_, i) => {
            const layerExists = i === 0 || !!currentMap.screens[this.props.screenX][this.props.screenY].layers[i - 1];

            return <div class="flex flex-column items-center md-5">
              <input type="radio" disabled={!layerExists} name="layer" checked={selectedLayer === i} onClick={e => {
                setSelectedLayer(i);
                context.setSelectedLayer(i); // what a hack.
              }} value={i}></input>
              {i}
              <input type="checkbox" disabled={!layerExists} checked={visibleLayers[i]} onClick={e => {
                visibleLayers[i] = !visibleLayers[i];
                setVisibleLayers([...visibleLayers]);
                context.setVisibleLayers([...visibleLayers]);
              }} value={i}></input>
            </div>
          })}
        </div>

        <div>
          Use arrow keys to move screens.
          <br></br>Ctrl+Click on screen to select tile
          <br></br>Press Shift to toggle play test.
          <br></br>WARNING: MIDI music will play, but it is quite loud, so turn down your speakers to 25% max. Sorry!
        </div>
      </div>
    </div>;
  }
}

const actions = () => ({
  setState(_: QuestMakerState, state: QuestMakerState): Partial<QuestMakerState> {
    return {
      ...state,
    };
  },
  setWindow(state: QuestMakerState, window: QuestMakerState['window']): Partial<QuestMakerState> {
    return {
      window,
    };
  },
  setCurrentScreen(state: QuestMakerState, x: number, y: number): Partial<QuestMakerState> {
    return {
      screenX: x,
      screenY: y,
    }
  },
  setCurrentMapIndex(state: QuestMakerState, mapIndex: number): Partial<QuestMakerState> {
    return {
      mapIndex,
    }
  },
  setCurrentTile(state: QuestMakerState, id: number): Partial<QuestMakerState> {
    return {
      editor: { ...state.editor, currentTile: id },
    }
  },
  setSelectedLayer(state: QuestMakerState, selectedLayer: number): Partial<QuestMakerState> {
    return {
      editor: { ...state.editor, selectedLayer },
    }
  },
  setVisibleLayers(state: QuestMakerState, visibleLayers: boolean[]): Partial<QuestMakerState> {
    return {
      editor: { ...state.editor, visibleLayers },
    }
  },
});

interface QuestMakerState extends Omit<QuestMaker.State, 'currentDmap' | 'currentMap' | 'currentScreen'> {
  mode: 'play' | 'edit';
  window?: JSX.Element;
}

export type QuestMakerProps = ComponentProps<QuestMakerState, typeof actions>;
// @ts-expect-error
export const AppContext = createContext<QuestMakerProps>(null);
class QuestMaker extends Component<QuestMakerProps> {
  constructor() {
    super();
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  render(props: QuestMakerProps) {
    const currentMap = props.quest?.maps[props.mapIndex];

    useEffect(() => {
      document.addEventListener('click', e => {
        if (!(e.target instanceof HTMLElement)) return;

        if (e.target.classList.contains('window')) {
          props.setWindow(undefined);
        }
      });
    });
    let windowUI;
    if (props.window) {
      windowUI = <div class="window">
        <div class="window__content">
          {props.window}
        </div>
      </div>
    }

    const tabs: TabbedPaneProps['tabs'] = {
      skills: {
        label: 'Tiles',
        content: <TilesTab
          selectedTile={props.quest.tiles[props.editor.currentTile]}
          tiles={props.quest?.tiles || []}>
        </TilesTab>,
      },
      enemies: {
        label: 'Enemies',
        content: <div>TODO</div>
      },
      misc: {
        label: 'Misc',
        content: <div>TODO</div>
      },
    };

    let ref = useRef<HTMLDivElement>();
    let playUI;
    if (props.mode === 'play') {
      playUI = <div class="play-ui">
        <div class="canvas-wrapper flex flex-column">
          <div class="string"></div>
          <div ref={ref}></div>
          <div>
            <div>Arrow keys to move</div>
            <div>X to swing sword</div>
            <div>R to trigger secrets</div>
            <div>Shift to return to editor</div>
          </div>
        </div>
      </div>
    }

    useEffect(() => {
      if (props.mode === 'play') {
        // @ts-expect-error
        ref.current.append(window.app.pixi.view);
        document.removeEventListener('keyup', this.onKeyUp);
      } else {
        document.addEventListener('keyup', this.onKeyUp);
      }
    }, [props.mode]);

    const editorUI = <div class="editor-ui" style={{ display: props.mode === 'play' ? 'none' : null }}>
      <Header></Header>
      <div class="canvas">
        {props.quest && props.mode === 'edit' ?
          // @ts-expect-error
          <EditorScreenArea canvas={window.app.pixi.view} map={currentMap} screenX={props.screenX} screenY={props.screenY} visibleLayers={props.editor.visibleLayers}></EditorScreenArea> :
          null}
      </div>
      <div class="tiles">
        {props.quest ?
          <TabbedPane tabs={tabs} background={true} childProps={{}}></TabbedPane> :
          null}
      </div>
      <Bottom maps={props.quest?.maps || []} currentMapIndex={props.mapIndex} screenX={props.screenX} screenY={props.screenY}></Bottom>
    </div>;

    return <AppContext.Provider value={props}>
      {windowUI}
      {playUI}
      {editorUI}
    </AppContext.Provider>
  }

  private onKeyUp(e: KeyboardEvent) {
    const currentMap = this.props.quest?.maps[this.props.mapIndex];
    if (!currentMap) return;

    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx -= 1;
    else if (e.key === 'ArrowRight') dx += 1;
    else if (e.key === 'ArrowUp') dy -= 1;
    else if (e.key === 'ArrowDown') dy += 1;

    if (dx !== 0 || dy !== 0) {
      const x = Utils.clamp(0, this.props.screenX + dx, currentMap.screens.length - 1)
      const y = Utils.clamp(0, this.props.screenY + dy, currentMap.screens[0].length - 1)
      this.props.setCurrentScreen(x, y);
    }
  }
}

export function makeUI(parentEl: HTMLElement, initialState: QuestMakerState) {
  const { SubApp, exportedActions, subscribe } = createSubApp(QuestMaker, initialState, actions);
  const el = render(<SubApp></SubApp>, parentEl);
  return { el, actions: exportedActions, subscribe };
}
