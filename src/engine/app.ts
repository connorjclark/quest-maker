import { Mode } from "./mode";

interface KeysState {
  down: Record<string, boolean>;
  pressed: Record<string, boolean>;
  up: Record<string, boolean>;
};

export class App<S> {
  public keys: KeysState;
  private currentMode: Mode<App<S>, S>; // TODO: could this be done better?
  private debugs: Record<string, PIXI.Graphics> = {};

  constructor(public pixi: PIXI.Application, public state: S) {
    this.keys = {
      down: {},
      pressed: {},
      up: {},
    };
  }

  createSprite(spritesheet: string, x: number, y: number, width: number, height: number) {
    const baseTexture = this.pixi.loader.resources[spritesheet].texture.baseTexture;
    const rect = new PIXI.Rectangle(x, y, width, height);
    const texture = new PIXI.Texture(baseTexture, rect);
    return new PIXI.Sprite(texture);
  }

  tick(dt: number) {
    if (this.currentMode) this.currentMode.tick(dt);

    for (const key in this.keys.down) {
      delete this.keys.down[key];
    }
    for (const key in this.keys.up) {
      delete this.keys.up[key];
    }
  }

  setMode(mode: Mode<App<S>, S>) {
    if (this.currentMode) this.currentMode.hide();
    this.currentMode = mode;
    this.currentMode.show();
  }

  debug(name: string) {
    if (!this.debugs[name]) {
      this.debugs[name] = new PIXI.Graphics();
      this.pixi.stage.addChild(this.debugs[name]);
    }

    return this.debugs[name];
  }
}
