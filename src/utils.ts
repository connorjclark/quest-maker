import * as constants from './constants';

const { screenWidth, screenHeight } = constants;

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

export function isSolid (state: QuestMaker.State, x: number, y: number, quadrant?: number) {
  if (!inBounds(x, y, screenWidth, screenHeight)) return true;

  const tileNumber = state.currentScreen.tiles[x][y].tile;
  if (quadrant === undefined) {
    return !state.quest.tiles[tileNumber].walkable.every(b => b);
  } else {
    return !state.quest.tiles[tileNumber].walkable[quadrant];
  }
};
