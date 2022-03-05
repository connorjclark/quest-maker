import { App } from './app.js';

export class Mode<A extends App<S>, S> {
  protected container = new PIXI.Container();
  private hasInitialized = false;

  constructor(public app: A) {};

  init(): void {
    this.app.pixi.stage.addChild(this.container);
  };
  show(): void {
    if (!this.hasInitialized) {
      this.init();
      this.hasInitialized = true;
    }
    this.container.visible = true;
  };
  tick(dt: number): void {};
  hide(): void {
    this.container.visible = false;
  };
}
