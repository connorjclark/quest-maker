function deepObjectCompare(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) return a === b;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  let keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(k => deepObjectCompare(a[k], b[k]));
}

export class ReactiveContainer<T> extends PIXI.Container {
  private lastRenderedProps: T;

  constructor(private renderFn: (container: PIXI.Container, props: T) => void, private getProps: () => T) {
    super();
    this.lastRenderedProps = getProps();
    renderFn(this, this.lastRenderedProps);
  }

  public _render() {
    const newProps = this.getProps();
    if (deepObjectCompare(newProps, this.lastRenderedProps)) return;
    this.lastRenderedProps = newProps;
    setTimeout(() => this.renderFn(this, newProps));
  }
}
