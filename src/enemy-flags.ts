function bit(flags: number, index: number) {
  return (flags & (1 << index)) !== 0;
}

function read(bitIndex: number) {
  return (flags: number) => bit(flags, bitIndex);
}

export const EnemyFlags = {
  zora: read(0),
  trap4: read(1),
  trap2: read(2),
  rocks: read(3),
  fireballs: read(4),
  leader: read(5),
  carryItem: read(6),
  boss: read(7),
};
