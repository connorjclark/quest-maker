import * as constants from './constants.js';
import { DmapType } from './zc-constants.js';

const { screenWidth, screenHeight } = constants;

export function find(query: string, node?: Element): HTMLElement {
  if (!node) node = document.body;
  const result = node.querySelector(query);
  if (!result) throw new Error(`no elements matching ${query}`);
  // ?
  if (!(result instanceof HTMLElement)) throw new Error('expected HTMLElement');
  return result;
}

export function maybeFind(query: string, node?: Element): HTMLElement | undefined {
  if (!node) node = document.body;
  const result = node.querySelector(query);
  if (!result) return;
  // ?
  if (!(result instanceof HTMLElement)) throw new Error('expected HTMLElement');
  return result;
}

export function findAll(query: string, node?: Element): Element[] {
  if (!node) node = document.body;
  const result = [...node.querySelectorAll(query)];
  return result;
}

type HTMLElementByTagName = HTMLElementTagNameMap & { [id: string]: HTMLElement };

export function createElement<T extends string>(name: T, className?: string, attrs: Record<string, string> = {}) {
  const element = document.createElement(name);
  if (className) {
    element.className = className;
  }
  Object.keys(attrs).forEach((key) => {
    const value = attrs[key];
    if (typeof value !== 'undefined') {
      element.setAttribute(key, value);
    }
  });
  return element as HTMLElementByTagName[T];
}

export function createChildOf<T extends string>(
  parentElem: Element, elementName: T, className?: string, attrs?: Record<string, string>) {
  const element = createElement(elementName, className, attrs);
  parentElem.appendChild(element);
  return element;
}

export function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function clamp(min: number, val: number, max: number) {
  if (min > val) return min;
  if (max < val) return max;
  return val;
}

export function inBounds(x: number, y: number, width: number, height: number) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

// TODO remove
export function isSolid(state: QuestMaker.State, x: number, y: number, quadrant?: number) {
  if (!inBounds(x, y, screenWidth, screenHeight)) return true;

  const tileNumber = state.currentScreen.tiles[x][y].tile;
  if (quadrant === undefined) {
    return !state.quest.tiles[tileNumber].walkable.every(b => b);
  } else {
    return !state.quest.tiles[tileNumber].walkable[quadrant];
  }
};

export function getScreenLayer(state: QuestMaker.State, map: QuestMaker.Map_, x: number, y: number, layerIndex: number) {
  const screen = map.screens[x][y];
  if (layerIndex === 0) {
    return screen;
  } else {
    const layer = screen.layers[layerIndex - 1];
    if (!layer) return;

    const layerMap = state.quest.maps[layer.map];
    return layerMap.screens[layer.x][layer.y];
  }
};

export function dmapContainsCoord(dmap: QuestMaker.DMap, x: number, y: number) {
  if (dmap.type !== DmapType.dmDNGN) return true;
  if (!(x >= dmap.xoff && x <= dmap.xoff + 8)) return false;
  const row = dmap.grid[y];
  x = x - dmap.xoff;
  return (row & (1 << (7 - x))) > 0;
}

export function create2dArray<T>(rows: number, columns: number, defaultValue: T): T[][] {
  const arr: T[][] = [];
  for (var i = 0; i < rows; i++) {
    arr[i] = [];
    for (var j = 0; j < columns; j++) {
      arr[i].push(defaultValue);
    }
  }
  return arr;
}

export function create3dArray<T>(depth: number, rows: number, columns: number, defaultValue: T): T[][][] {
  const arr: T[][][] = [];
  for (var i = 0; i < depth; i++) {
    arr[i] = create2dArray(rows, columns, defaultValue);
  }
  return arr;
}
