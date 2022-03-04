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

    this.addScrollHandling(pixi);
  }

  addScrollHandling(pixi: PIXI.Application) {
    // Listen for global events on the <canvas> element and convert those into scroll event.
    pixi.stage.interactive = true;
    pixi.view.addEventListener('mousewheel', (e: Event) => {
      const mousePosition = pixi.renderer.plugins.interaction.mouse.global;
      const local = pixi.stage.toLocal(mousePosition);
      // Returns element directly under mouse.
      const found = pixi.renderer.plugins.interaction.hitTest(local, pixi.stage);
      if (found) found.emit('scroll', e);
    });
  }

  destroyChildren(displayObject: PIXI.Container) {
    if (displayObject.children.length === 0) return;

    for (const child of [...displayObject.children]) {
      // if (child instanceof PIXI.Container) {
      // child.destroy({children: true});
      // } else {
      child.destroy();
      // }
    }
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

  getMode() {
    return this.currentMode;
  }

  debug(name: string) {
    if (!this.debugs[name]) {
      this.debugs[name] = new PIXI.Graphics();
      this.pixi.stage.addChild(this.debugs[name]);
    }

    return this.debugs[name];
  }
}
