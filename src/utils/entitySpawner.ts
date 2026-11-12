import { DynamicEntity, SeaEntityType } from '@/types/entities';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';

const isWaterTile = (t: TileType | undefined) => t === TileType.DEEP_SEA || t === TileType.SHALLOW_WATER;

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

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

function randomWater(): { x: number; y: number } {
  return WATER[Math.floor(Math.random() * WATER.length)];
}

export function spawnEntity(type: SeaEntityType): DynamicEntity {
  const spot = randomWater();
  return {
    id: makeId('ent'),
    type,
    x: spot.x,
    y: spot.y,
    direction: Math.random() < 0.5 ? 0 : 180,
    phase: 0,
  };
}

export function initialEntities(): DynamicEntity[] {
  const list: DynamicEntity[] = [spawnEntity('SQUALL')];
  if (Math.random() < 0.35) list.push(spawnEntity('TEMPEST'));
  const shoals = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < shoals; i++) list.push(spawnEntity('FISH_SHOAL'));
  list.push(spawnEntity('ROGUE_GALLEON'));
  return list;
}
