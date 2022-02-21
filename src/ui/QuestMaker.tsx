import { render, h, Component, createContext, JSX } from 'preact';
import { useContext, useEffect, useRef } from 'preact/hooks';
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
  currentMap?: QuestMaker.Map_;
  maps: QuestMaker.Map_[];
}
class Bottom extends Component<BottomProps> {
  render() {
    const context = useContext(AppContext);
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (!ref.current) return;
      if (!this.props.currentMap) return;

      const canvas = ref.current as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (!context) return;

      const size = 10;

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 9; y++) {
          const screen = x < this.props.currentMap.screens.length && this.props.currentMap.screens[x][y];
          let color = 'black';
          if (screen) color = '#0000ff';
          if (x === this.props.screenX && y === this.props.screenY) color = '#00ff00';

          context.fillStyle = color;
          context.fillRect(x * size, y * size, size, size);
        }
      }
    }, [this.props.currentMap, this.props.screenX, this.props.screenY]);

    const options = []
    for (let i = 0; i < this.props.maps.length; i++) {
      options.push(<option>Map {i}</option>);
    }
    
    return <div>
      <canvas ref={ref}></canvas>
      {/* @ts-ignore */}
      <select onChange={(e) => context.setCurrentMap(this.props.maps[e.target.selectedIndex])}>
        {options}
      </select>
      {this.props.screenX}, {this.props.screenY}
    </div>;
  }
}

const actions = () => ({
  setMode(state: QuestMakerState, mode: QuestMakerState['mode']): Partial<QuestMakerState> {
    return {
      mode,
    };
  },
  setWindow(state: QuestMakerState, window: QuestMakerState['window']): Partial<QuestMakerState> {
    return {
      window,
    };
  },
  setQuest(state: QuestMakerState, quest: QuestMaker.Quest): Partial<QuestMakerState> {
    return {
      quest,
    };
  },
  setCurrentScreen(state: QuestMakerState, x: number, y: number): Partial<QuestMakerState> {
    return {
      screenX: x,
      screenY: y,
    }
  },
  setCurrentMap(state: QuestMakerState, map: QuestMaker.Map_): Partial<QuestMakerState> {
    return {
      currentMap: map,
    }
  },
  setSelectedTile(state: QuestMakerState, selectedTile: QuestMaker.Tile): Partial<QuestMakerState> {
    return {
      selectedTile,
    }
  },
});

interface QuestMakerState {
  mode: 'play' | 'edit';
  quest?: QuestMaker.Quest;
  currentMap?: QuestMaker.Map_;
  screenX: number;
  screenY: number;
  selectedTile?: QuestMaker.Tile;
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
          selectedTile={props.selectedTile}
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
        <div ref={ref} class="canvas-wrapper"></div>
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

    const editorUI = <div class="editor-ui" style={{display: props.mode === 'play' ? 'none' : null}}>
      <Header></Header>
      <div class="canvas">
        {props.quest && props.mode === 'edit' ?
          // @ts-expect-error
          <EditorScreenArea canvas={window.app.pixi.view} map={props.currentMap} screenX={props.screenX} screenY={props.screenY}></EditorScreenArea> :
          null}
      </div>
      <div class="tiles">
        {props.quest ?
          <TabbedPane tabs={tabs} background={true} childProps={{}}></TabbedPane> :
          null}
      </div>
      <div class="bottom">
        <Bottom maps={props.quest?.maps || []} currentMap={props.currentMap} screenX={props.screenX} screenY={props.screenY}></Bottom>
        <div>
          Press Shift to toggle play test.
          <br></br>WARNING: MIDI music will play, but it is quite loud, so turn down your speakers to 25% max. Sorry!
        </div>
      </div>
    </div>;

    return <AppContext.Provider value={props}>
      {windowUI}
      {playUI}
      {editorUI}
    </AppContext.Provider>
  }

  private onKeyUp(e: KeyboardEvent) {
    if (!this.props.currentMap) return;

    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx -= 1;
    else if (e.key === 'ArrowRight') dx += 1;
    else if (e.key === 'ArrowUp') dy -= 1;
    else if (e.key === 'ArrowDown') dy += 1;

    if (dx !== 0 || dy !== 0) {
      const x = Utils.clamp(0, this.props.screenX + dx, this.props.currentMap.screens.length - 1)
      const y = Utils.clamp(0, this.props.screenY + dy, this.props.currentMap.screens[0].length - 1)
      this.props.setCurrentScreen(x, y);
    }
  }
}

export function makeUI(parentEl: HTMLElement) {
  const initialState: QuestMakerState = {
    mode: 'edit',
    screenX: 0,
    screenY: 0,
  };
  const { SubApp, exportedActions, subscribe } = createSubApp(QuestMaker, initialState, actions);
  const el = render(<SubApp></SubApp>, parentEl);
  return {el, actions: exportedActions, subscribe};
}
