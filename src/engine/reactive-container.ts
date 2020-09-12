function deepObjectCompare(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) return a === b;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  let keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(k => deepObjectCompare(a[k], b[k]));
}

export class ReactiveContainer<T> extends PIXI.Container {
  private lastRenderedState: T;

  constructor(private renderFn: (container: PIXI.Container, state: T) => void, private getState: () => T) {
    super();
    this.lastRenderedState = getState();
    renderFn(this, this.lastRenderedState);
  }

  public _render() {
    const newState = this.getState();
    if (deepObjectCompare(newState, this.lastRenderedState)) return;
    this.lastRenderedState = newState;
    setTimeout(() => this.renderFn(this, newState));
  }
}
