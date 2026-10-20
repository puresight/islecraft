import { GRID_HEIGHT, GRID_WIDTH, TerrainType } from '@/types/game';

type Grid = TerrainType[][];

function fillRange(grid: Grid, row: number, colStart: number, colEnd: number, type: TerrainType) {
  for (let col = colStart; col <= colEnd; col++) {
    grid[row][col] = type;
  }
}

const isLand = (t: TerrainType) =>
  t === 'ISLAND_1_SOIL' || t === 'ISLAND_2_SOIL' || t === 'MOUNTAIN';

/**
 * Asymmetric dual-island layout in the spirit of the 1981 classic:
 * a larger western isle (player) and a slightly smaller eastern isle (rival),
 * each with a mountain spine along its northern edge, separated by open channel.
 */
export function buildTerrainGrid(): Grid {
  const grid: Grid = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => 'DEEP_SEA' as TerrainType),
  );

  // Island 1 — player (west)
  const island1: Array<[row: number, start: number, end: number]> = [
    [3, 6, 9],
    [4, 4, 11],
    [5, 3, 12],
    [6, 3, 12],
    [7, 3, 12],
    [8, 4, 11],
    [9, 5, 10],
    [10, 6, 9],
  ];
  island1.forEach(([row, start, end]) => fillRange(grid, row, start, end, 'ISLAND_1_SOIL'));
  fillRange(grid, 4, 6, 9, 'MOUNTAIN');
  fillRange(grid, 5, 5, 10, 'MOUNTAIN');

  // Island 2 — rival (east)
  const island2: Array<[row: number, start: number, end: number]> = [
    [4, 19, 22],
    [5, 17, 24],
    [6, 16, 25],
    [7, 16, 25],
    [8, 17, 24],
    [9, 18, 23],
    [10, 19, 22],
  ];
  island2.forEach(([row, start, end]) => fillRange(grid, row, start, end, 'ISLAND_2_SOIL'));
  fillRange(grid, 5, 19, 22, 'MOUNTAIN');
  fillRange(grid, 6, 18, 23, 'MOUNTAIN');

  // Shallow water: any open sea cell touching land becomes a shelf
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      if (grid[row][col] !== 'DEEP_SEA') continue;
      const neighbors: Array<[number, number]> = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      if (neighbors.some(([r, c]) => r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH && isLand(grid[r][c]))) {
        grid[row][col] = 'SHALLOW_WATER';
      }
    }
  }

  return grid;
}
