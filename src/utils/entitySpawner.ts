import { DynamicEntity, SeaEntityType } from '@/types/entities';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';

const isWaterTile = (t: TileType | undefined) => t === TileType.DEEP_SEA || t === TileType.SHALLOW_WATER;

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const DRIFT_TICKS: Record<SeaEntityType, number> = {
  SQUALL: 3,
  TEMPEST: 2,
  FISH_SHOAL: 2,
  ROGUE_GALLEON: 1,
};

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

function occupiedBy(entities: DynamicEntity[], x: number, y: number, self: DynamicEntity): boolean {
  return entities.some((e) => e.id !== self.id && e.x === x && e.y === y);
}

/**
 * One 1.5-second simulation heartbeat: advance tick phases, drift entities
 * that are due, and replace anything that left the chart. Mutates nothing —
 * returns a fresh list.
 */
export function tickEntities(entities: DynamicEntity[]): DynamicEntity[] {
  const drifted: DynamicEntity[] = [];

  for (const entity of entities) {
    let next: DynamicEntity = { ...entity, phase: entity.phase + 1 };

    if (next.phase % DRIFT_TICKS[entity.type] !== 0) {
      drifted.push(next);
      continue;
    }

    const dx = entity.direction === 0 ? 1 : -1;
    const straight = { x: entity.x + dx, y: entity.y };
    const diagonal = { x: entity.x + dx, y: entity.y + (Math.random() < 0.5 ? 1 : -1) };

    const target =
      isWaterTile(tileAt(straight.x, straight.y)) && !occupiedBy(drifted, straight.x, straight.y, entity)
        ? straight
        : isWaterTile(tileAt(diagonal.x, diagonal.y)) && !occupiedBy(drifted, diagonal.x, diagonal.y, entity)
          ? diagonal
          : null;

    if (target) {
      next = { ...next, x: target.x, y: target.y };
    } else {
      next = { ...next, direction: entity.direction === 0 ? 180 : 0 };
    }
    drifted.push(next);
  }

  // Replace anything that drifted off the chart with a fresh arrival
  const inBounds = drifted.filter((e) => tileAt(e.x, e.y) !== undefined);
  const missing = entities.length - inBounds.length;
  const replacements: DynamicEntity[] = [];
  const shoalCount = inBounds.filter((e) => e.type === 'FISH_SHOAL').length;
  for (let i = 0; i < missing; i++) {
    replacements.push(spawnEntity(shoalCount + i < 2 ? 'FISH_SHOAL' : 'SQUALL'));
  }
  return [...inBounds, ...replacements];
}

function tileAt(x: number, y: number): TileType | undefined {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return undefined;
  return INITIAL_MAP[y][x];
}
