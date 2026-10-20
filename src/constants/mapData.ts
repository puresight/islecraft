export enum TileType {
  DEEP_SEA,
  SHALLOW_WATER,
  P1_TERRITORY,
  P2_TERRITORY,
  MOUNTAIN,
}

export const MAP_COLS = 29;
export const MAP_ROWS = 16;

/**
 * Authentic 1981 dual-isle coastline, authored as ASCII so the shores are
 * organic rather than rectangular. Legend:
 *   '.' deep sea · '~' shallows · '1' west isle · '2' east isle · '^' mountain
 */
const MAP_ASCII: string[] = [
  '.............................',
  '...~~~~~.............~~~~~...',
  '..~11111~~.........~~22222~..',
  '.~~1111111~.......~2222222~~.',
  '.~111^^111~.......~222^^222~.',
  '.~11^^^^111~.....~22^^^^^22~.',
  '.~111^^1111~.....~2222^^122~.',
  '.~~1111111~~.....~~2222222~~.',
  '..~1111111~.......~2222222~..',
  '..~~11111~~.......~~22222~~..',
  '...~11^11~.........~22^22~...',
  '...~11111~.........~22222~...',
  '....~111~~.........~~222~....',
  '.....~~~.............~~~.....',
  '.............................',
  '.............................',
];

const CHAR_TO_TILE: Record<string, TileType> = {
  '.': TileType.DEEP_SEA,
  '~': TileType.SHALLOW_WATER,
  '1': TileType.P1_TERRITORY,
  '2': TileType.P2_TERRITORY,
  '^': TileType.MOUNTAIN,
};

function parseMap(): TileType[][] {
  if (MAP_ASCII.length !== MAP_ROWS || MAP_ASCII.some((row) => row.length !== MAP_COLS)) {
    throw new Error('MAP_ASCII must be exactly 16 rows of 29 columns');
  }
  return MAP_ASCII.map((row) =>
    row.split('').map((ch) => {
      const tile = CHAR_TO_TILE[ch];
      if (tile === undefined) throw new Error(`Unknown map character: "${ch}"`);
      return tile;
    }),
  );
}

export const INITIAL_MAP: TileType[][] = parseMap();
