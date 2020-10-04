export function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function clamp(min: number, val: number, max: number) {
  if (min > val) return min;
  if (max < val) return max;
  return val;
}
