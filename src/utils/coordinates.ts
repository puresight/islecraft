import { MAP_COLS, MAP_ROWS } from '@/constants/mapData';

export interface GridCoord {
  col: number;
  row: number;
}

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS;
}

export function clampToGrid(col: number, row: number): GridCoord {
  return {
    col: Math.min(MAP_COLS - 1, Math.max(0, col)),
    row: Math.min(MAP_ROWS - 1, Math.max(0, row)),
  };
}

/**
 * Projects a pointer position onto the chart grid. Returns null when the
 * supplied rectangle has no measurable area.
 */
export function projectToTile(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): GridCoord | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return clampToGrid(
    Math.floor(((clientX - rect.left) / rect.width) * MAP_COLS),
    Math.floor(((clientY - rect.top) / rect.height) * MAP_ROWS),
  );
}

/** Chebyshev (8-way, inclusive) distance between two grid positions. */
export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** All 8 neighbors of a tile, in reading order. */
export function neighborsOf(col: number, row: number): Array<[number, number]> {
  const list: Array<[number, number]> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      list.push([col + dx, row + dy]);
    }
  }
  return list;
}
