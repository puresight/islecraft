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
 * Island silhouettes for the classic 1981 dual-isle layout.
 * Each entry is [row, colStart, colEnd] inclusive.
 */
const WEST_ISLAND: Array<[number, number, number]> = [
  [2, 4, 8],
  [3, 3, 9],
  [4, 2, 10],
  [5, 2, 10],
  [6, 2, 10],
  [7, 2, 10],
  [8, 3, 9],
  [9, 3, 9],
  [10, 4, 8],
  [11, 5, 8],
  [12, 6, 8],
];

const EAST_ISLAND: Array<[number, number, number]> = [
  [2, 19, 24],
  [3, 18, 25],
  [4, 18, 26],
  [5, 18, 26],
  [6, 18, 26],
  [7, 18, 25],
  [8, 18, 25],
  [9, 20, 24],
  [10, 20, 24],
  [11, 21, 23],
  [12, 21, 23],
];

const WEST_MOUNTAINS: Array<[number, number, number]> = [
  [4, 5, 8],
  [5, 4, 9],
  [6, 4, 9],
  [7, 5, 8],
];

const EAST_MOUNTAINS: Array<[number, number, number]> = [
  [4, 20, 24],
  [5, 19, 24],
];

function paintRanges(map: TileType[][], ranges: Array<[number, number, number]>, tile: TileType) {
  ranges.forEach(([row, start, end]) => {
    for (let col = start; col <= end; col++) map[row][col] = tile;
  });
}

function buildMap(): TileType[][] {
  const map: TileType[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => TileType.DEEP_SEA),
  );

  paintRanges(map, WEST_ISLAND, TileType.P1_TERRITORY);
  paintRanges(map, EAST_ISLAND, TileType.P2_TERRITORY);
  paintRanges(map, WEST_MOUNTAINS, TileType.MOUNTAIN);
  paintRanges(map, EAST_MOUNTAINS, TileType.MOUNTAIN);

  // Shallow shelf: deep sea cells adjacent to land become shallows.
  // Rows 13-15 stay open southern waters per the classic layout.
  const isLand = (t: TileType) => t >= TileType.P1_TERRITORY;
  for (let row = 0; row <= 12; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (map[row][col] !== TileType.DEEP_SEA) continue;
      const neighbors: Array<[number, number]> = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      if (
        neighbors.some(
          ([r, c]) => r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS && isLand(map[r][c]),
        )
      ) {
        map[row][col] = TileType.SHALLOW_WATER;
      }
    }
  }

  return map;
}

export const INITIAL_MAP: TileType[][] = buildMap();
