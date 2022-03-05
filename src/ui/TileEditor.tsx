import { h, Component } from 'preact';
import { TileType } from '../tile-type.js';
import { Tile } from './common.js';

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

    // iterating typescript enums is so blegh
    const numTypes = Object.keys(TileType).length;
    for (let i = 0; i < numTypes; i++) {
      const tileType = i as TileType;
      const tileTypeName = TileType[i];
      types.push(<option value={tileType} selected={tileType === props.tile.type}>{tileTypeName}</option>);
    }

    return <div class="tile-editor">
      Tile #{props.tile.id}
      <Tile screenTile={{ tile: props.tile.id, cset: 0 }} scale={8}></Tile>

      <div>
        <label>Type</label>
        <select onChange={this.onTypeChange}>
          {types}
        </select>
      </div>

      <div>
        <label>Walkable</label>
        <div class='walkable-mask-wrapper' onClick={this.onClickWalkable}>
          <Tile screenTile={{ tile: props.tile.id, cset: 0 }} scale={4}></Tile>
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

    this.props.tile.type = Number(option.value);
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
