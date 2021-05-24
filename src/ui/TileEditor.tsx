import { h, Component } from 'preact';
import { TileType } from '../types';
import { Tile } from './common';

type TileEditorProps = {
  tile: QuestMaker.Tile;
};
export class TileEditor extends Component<TileEditorProps> {
  constructor() {
    super();
    this.onTypeChange = this.onTypeChange.bind(this);
    this.onClickWalkable = this.onClickWalkable.bind(this);
  }

  render(props: TileEditorProps) {
    let types = [];
    for (const type of Object.values(TileType)) {
      types.push(<option value={type} selected={type === props.tile.type}>{type}</option>);
    }

    return <div class="tile-editor">
      Tile #{props.tile.id}
      <Tile tile={props.tile.id} scale={8}></Tile>

      <div>
        <label>Type</label>
        <select onChange={this.onTypeChange}>
          {types}
        </select>
      </div>

      <div>
        <label>Walkable</label>
        <div class='walkable-mask-wrapper' onClick={this.onClickWalkable}>
          <Tile tile={props.tile.id} scale={4}></Tile>
          <div class='walkable-mask'>
            <div class={props.tile.walkable[0] ? '' : 'red'}></div>
            <div class={props.tile.walkable[1] ? '' : 'red'}></div>
            <div class={props.tile.walkable[2] ? '' : 'red'}></div>
            <div class={props.tile.walkable[3] ? '' : 'red'}></div>
          </div>
        </div>
      </div>
    </div>;
  }

  private onTypeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const option = target.selectedOptions[0];

    // @ts-ignore
    this.props.tile.type = option.value;
    this.forceUpdate();
  }

  private onClickWalkable(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const maskEl = target.closest('.walkable-mask') as HTMLElement;
    if (!maskEl) return;

    let quadrant = 0;
    if (e.offsetX / maskEl.clientWidth > 0.5) quadrant += 1;
    if (e.offsetY / maskEl.clientHeight > 0.5) quadrant += 2;

    this.props.tile.walkable[quadrant] = !this.props.tile.walkable[quadrant];
    this.forceUpdate();
  }
}
