/// <reference types="pixi-plugin-bump" />

import * as PIXI from 'pixi.js';
// @ts-expect-error
import Bump from 'pixi-plugin-bump/src/Bump.js';

globalThis.PIXI = PIXI;

const pixi = PIXI;
pixi.extras = {
  Bump,
};
