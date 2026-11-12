import { DynamicEntity, SeaEntityType, WeatherType } from '@/types/entities';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';
import { entityFootprint } from '@/constants/blueprints';

const isWaterTile = (t: TileType | undefined) => t === TileType.DEEP_SEA || t === TileType.SHALLOW_WATER;

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const covers = (rect: Rect, x: number, y: number) =>
  x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

function waterTiles(): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (isWaterTile(INITIAL_MAP[y][x])) cells.push({ x, y });
    }
  }
  return cells;
}

const WATER = waterTiles();

/**
 * Pick a random open-water anchor for a footprint, clamped to the board edges
 * so multi-tile weather never clips off the chart. Returns null when every
 * candidate cell is taken by another entity's footprint.
 */
export function spawnAnchor(
  type: SeaEntityType,
  taken: Array<{ type: SeaEntityType; x: number; y: number; footprint: { w: number; h: number } }>,
): { x: number; y: number } | null {
  const fp = entityFootprint(type);
  const candidates: Array<{ x: number; y: number }> = [];
  for (const spot of WATER) {
    const x = Math.min(spot.x, MAP_COLS - fp.w);
    const y = Math.min(spot.y, MAP_ROWS - fp.h);
    const rect: Rect = { x, y, w: fp.w, h: fp.h };
    const blocked = taken.some((other) => {
      const otherFp = entityFootprint(other.type as SeaEntityType);
      const otherRect: Rect = { x: other.x, y: other.y, w: otherFp.w, h: otherFp.h };
      for (let cy = rect.y; cy < rect.y + rect.h; cy++) {
        for (let cx = rect.x; cx < rect.x + rect.w; cx++) {
          if (covers(otherRect, cx, cy)) return true;
        }
      }
      return false;
    });
    if (!blocked) candidates.push({ x, y });
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function spawnEntity(type: SeaEntityType, taken: DynamicEntity[] = []): DynamicEntity | null {
  const anchor = spawnAnchor(type, taken);
  if (!anchor) return null;
  return {
    id: makeId('ent'),
    type,
    x: anchor.x,
    y: anchor.y,
    direction: Math.random() < 0.5 ? 0 : 180,
    phase: 0,
    footprint: entityFootprint(type),
  };
}

const WEATHER_POOL: Array<{ type: WeatherType; weight: number }> = [
  { type: 'SQUALL', weight: 6 },
  { type: 'TEMPEST', weight: 3 },
  { type: 'HURRICANE', weight: 1 },
];

function pickWeather(): WeatherType {
  const total = WEATHER_POOL.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of WEATHER_POOL) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'SQUALL';
}

export function initialEntities(): DynamicEntity[] {
  const list: DynamicEntity[] = [];
  const first = spawnEntity('SQUALL');
  if (first) list.push(first);
  if (Math.random() < 0.35) {
    const tempest = spawnEntity('TEMPEST', list);
    if (tempest) list.push(tempest);
  }
  const shoals = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < shoals; i++) {
    const shoal = spawnEntity('FISH_SHOAL', list);
    if (shoal) list.push(shoal);
  }
  const galleon = spawnEntity('ROGUE_GALLEON', list);
  if (galleon) list.push(galleon);
  return list;
}

/** Replacement for lost entities: up to two fish shoals first, then weather. */
export function spawnReplacement(count: number, existingShoals: number): DynamicEntity[] {
  const spawned: DynamicEntity[] = [];
  for (let i = 0; i < count; i++) {
    const type = existingShoals + spawned.filter((e) => e.type === 'FISH_SHOAL').length < 2 ? 'FISH_SHOAL' : pickWeather();
    const next = spawnEntity(type, spawned);
    if (next) spawned.push(next);
  }
  return spawned;
}
