import { DynamicEntity, SeaEntityType } from '@/types/entities';
import { GameStateSnapshot, UnitEntity } from '@/types/game';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';
import { chebyshev } from '@/utils/coordinates';
import { planGovernorMoves } from '@/utils/governorAI';
import { spawnEntity } from '@/utils/entitySpawner';
import { isBuildableVessel, SHOAL_HARVEST_FOOD } from '@/constants/blueprints';

const isWaterTile = (t: TileType | undefined) => t === TileType.DEEP_SEA || t === TileType.SHALLOW_WATER;

function tileAt(x: number, y: number): TileType | undefined {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return undefined;
  return INITIAL_MAP[y][x];
}

function occupiedBy(entities: DynamicEntity[], x: number, y: number, self: DynamicEntity): boolean {
  return entities.some((e) => e.id !== self.id && e.x === x && e.y === y);
}

const DRIFT_TICKS: Record<SeaEntityType, number> = {
  SQUALL: 3,
  TEMPEST: 2,
  FISH_SHOAL: 2,
  ROGUE_GALLEON: 1,
};

/**
 * One 1.5-second world pulse: advance tick phases, drift entities that are due,
 * and replace anything that left the chart. Pure — returns a fresh list.
 */
export function tickWorld(entities: DynamicEntity[]): DynamicEntity[] {
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

  const inBounds = drifted.filter((e) => tileAt(e.x, e.y) !== undefined);
  const missing = entities.length - inBounds.length;
  const replacements: DynamicEntity[] = [];
  const shoalCount = inBounds.filter((e) => e.type === 'FISH_SHOAL').length;
  for (let i = 0; i < missing; i++) {
    replacements.push(spawnEntity(shoalCount + i < 2 ? 'FISH_SHOAL' : 'SQUALL'));
  }
  return [...inBounds, ...replacements];
}

export interface HeartbeatOutcome {
  /** Units after Governor tactical steering has been applied (solo mode). */
  nextUnits: UnitEntity[];
  /** Entity ids consumed this pulse (harvested shoals, sunk galleons). */
  consumedEntityIds: string[];
  /** Net food added by moored schooners this pulse. */
  foodBonus: number;
  /** Tiles to flash (bastion cannon fire). */
  flashTiles: Array<{ col: number; row: number }>;
  /** Tiles where a schooner hauled in a catch (floating +Food text). */
  harvestedTiles: Array<{ col: number; row: number }>;
  /** Human-readable notices to surface as toasts. */
  notices: Array<{ text: string; kind: 'success' | 'error' }>;
}

/**
 * Pure heartbeat derivation: tactical AI steering, bastion gunnery and
 * schooner harvesting. Reads state + entities; never mutates either.
 */
export function deriveHeartbeat(state: GameStateSnapshot, entities: DynamicEntity[]): HeartbeatOutcome {
  const outcome: HeartbeatOutcome = {
    nextUnits: state.units,
    consumedEntityIds: [],
    foodBonus: 0,
    flashTiles: [],
    harvestedTiles: [],
    notices: [],
  };

  if (state.mode === 'solo') {
    const moves = planGovernorMoves(state, entities);
    if (moves.length > 0) {
      outcome.nextUnits = state.units.map((u) => {
        const move = moves.find((m) => m.unitId === u.id);
        return move ? { ...u, col: move.col, row: move.row } : u;
      });
    }
  }

  const bastions = state.buildings.filter((b) => b.faction === 'player' && b.type === 'COASTAL_BASTION');
  entities
    .filter((e) => e.type === 'ROGUE_GALLEON')
    .forEach((g) => {
      const bastion = bastions.find((b) => chebyshev(b.col, b.row, g.x, g.y) <= 1);
      if (bastion) {
        outcome.consumedEntityIds.push(g.id);
        outcome.flashTiles.push({ col: bastion.col, row: bastion.row });
      }
    });

  const schooners = outcome.nextUnits.filter(
    (u) => u.faction === 'player' && u.type === 'FISHING_SCHOONER',
  );
  entities
    .filter((e) => e.type === 'FISH_SHOAL')
    .forEach((shoal) => {
      if (schooners.some((s) => s.col === shoal.x && s.row === shoal.y)) {
        outcome.foodBonus += SHOAL_HARVEST_FOOD;
        outcome.consumedEntityIds.push(shoal.id);
        outcome.harvestedTiles.push({ col: shoal.x, row: shoal.y });
        outcome.notices.push({
          text: `Schooner harvested fish shoal (+${SHOAL_HARVEST_FOOD} Food)`,
          kind: 'success',
        });
      }
    });

  return outcome;
}

export function isVesselType(type: UnitEntity['type']): boolean {
  return isBuildableVessel(type);
}
