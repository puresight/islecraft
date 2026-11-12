import { DynamicEntity, SeaEntityType, WeatherType } from '@/types/entities';
import { GameStateSnapshot, UnitEntity } from '@/types/game';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';
import { WEATHER_BLUEPRINTS } from '@/constants/blueprints';
import { chebyshev } from '@/utils/coordinates';
import { planGovernorMoves } from '@/utils/governorAI';
import { spawnReplacement } from '@/utils/entitySpawner';
import { isBuildableVessel, SHOAL_HARVEST_FOOD } from '@/constants/blueprints';

const isWaterTile = (t: TileType | undefined) => t === TileType.DEEP_SEA || t === TileType.SHALLOW_WATER;

function tileAt(x: number, y: number): TileType | undefined {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return undefined;
  return INITIAL_MAP[y][x];
}

/** True when a cell lies within an entity's bounding box. */
export function coversCell(entity: DynamicEntity, x: number, y: number): boolean {
  return (
    x >= entity.x &&
    x < entity.x + entity.footprint.w &&
    y >= entity.y &&
    y < entity.y + entity.footprint.h
  );
}

/** True when two entities' bounding boxes share at least one cell. */
function overlapsRect(a: DynamicEntity, b: DynamicEntity): boolean {
  return (
    a.x < b.x + b.footprint.w &&
    a.x + a.footprint.w > b.x &&
    a.y < b.y + b.footprint.h &&
    a.y + a.footprint.h > b.y
  );
}

const DRIFT_TICKS: Record<SeaEntityType, number> = {
  SQUALL: WEATHER_BLUEPRINTS.SQUALL.driftTicks,
  TEMPEST: WEATHER_BLUEPRINTS.TEMPEST.driftTicks,
  HURRICANE: WEATHER_BLUEPRINTS.HURRICANE.driftTicks,
  FISH_SHOAL: 2,
  ROGUE_GALLEON: 1,
};

/** Clamp an anchor so the whole footprint stays on the chart. */
function clampAnchor(x: number, y: number, entity: DynamicEntity): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, MAP_COLS - entity.footprint.w)),
    y: Math.max(0, Math.min(y, MAP_ROWS - entity.footprint.h)),
  };
}

/** True when every footprint cell is walkable water for this drift. */
function fitsWater(entity: DynamicEntity, x: number, y: number, others: DynamicEntity[]): boolean {
  for (let cy = y; cy < y + entity.footprint.h; cy++) {
    for (let cx = x; cx < x + entity.footprint.w; cx++) {
      if (!isWaterTile(tileAt(cx, cy))) return false;
    }
  }
  return !others.some((other) => other.id !== entity.id && overlapsRect({ ...entity, x, y } as DynamicEntity, other));
}

/**
 * One 1.5-second world pulse: advance tick phases, drift entities that are due
 * (bounding-box aware, edge-clamped), and replace anything that left the chart.
 * Pure — returns a fresh list.
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
    const straight = clampAnchor(entity.x + dx, entity.y, entity);
    const diagonal = clampAnchor(entity.x + dx, entity.y + (Math.random() < 0.5 ? 1 : -1), entity);

    const target =
      (straight.x !== entity.x || straight.y !== entity.y) &&
      fitsWater(entity, straight.x, straight.y, drifted)
        ? straight
        : (diagonal.x !== entity.x || diagonal.y !== entity.y) &&
            fitsWater(entity, diagonal.x, diagonal.y, drifted)
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
  const shoalCount = inBounds.filter((e) => e.type === 'FISH_SHOAL').length;
  return [...inBounds, ...spawnReplacement(missing, shoalCount)];
}

export interface HeartbeatOutcome {
  /** Units after Governor tactical steering and weather sinks. */
  nextUnits: UnitEntity[];
  /** Razed building ids (hurricane destruction). */
  destroyedBuildingIds: string[];
  /** Entity ids consumed this pulse (harvested shoals, sunk galleons). */
  consumedEntityIds: string[];
  /** Net food added by moored schooners this pulse. */
  foodBonus: number;
  /** Tiles to flash (bastion cannon fire, storms). */
  flashTiles: Array<{ col: number; row: number }>;
  /** Tiles where a schooner hauled in a catch (floating +Food text). */
  harvestedTiles: Array<{ col: number; row: number }>;
  /** Human-readable notices to surface as toasts. */
  notices: Array<{ text: string; kind: 'success' | 'error' }>;
  /** "col,row" keys of plantations rained on this pulse (doubled harvest). */
  wateredPlantationKeys: Set<string>;
}

/**
 * Pure heartbeat derivation: tactical AI steering, bastion gunnery, schooner
 * harvesting and multi-tile weather effects. Reads state + entities; never
 * mutates either.
 */
export function deriveHeartbeat(
  state: GameStateSnapshot,
  entities: DynamicEntity[],
): HeartbeatOutcome {
  const outcome: HeartbeatOutcome = {
    nextUnits: state.units,
    destroyedBuildingIds: [],
    consumedEntityIds: [],
    foodBonus: 0,
    flashTiles: [],
    harvestedTiles: [],
    notices: [],
    wateredPlantationKeys: new Set<string>(),
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

  applyWeather(state, entities, outcome);
  return outcome;
}

const isWeather = (type: SeaEntityType): type is WeatherType => type in WEATHER_BLUEPRINTS;

function weatherSpec(type: SeaEntityType) {
  return isWeather(type) ? WEATHER_BLUEPRINTS[type] : null;
}

const roll = (chance: number) => Math.random() < chance;

function applyWeather(
  state: GameStateSnapshot,
  entities: DynamicEntity[],
  outcome: HeartbeatOutcome,
): void {
  const weather = entities.filter((e) => isWeather(e.type));
  const bastions = state.buildings.filter(
    (b) => b.faction === 'player' && b.type === 'COASTAL_BASTION',
  );

  // Vessels caught in a storm footprint may founder.
  let nextUnits = outcome.nextUnits;
  for (const storm of weather) {
    const spec = weatherSpec(storm.type);
    if (!spec || spec.sinkChance <= 0) continue;
    for (const vessel of nextUnits) {
      if (vessel.type !== 'FISHING_SCHOONER' && vessel.type !== 'PRIVATEER_SLOOP') continue;
      if (!coversCell(storm, vessel.col, vessel.row)) continue;
      if (!roll(spec.sinkChance)) continue;
      nextUnits = nextUnits.filter((u) => u.id !== vessel.id);
      outcome.flashTiles.push({ col: vessel.col, row: vessel.row });
      outcome.notices.push({
        text: `${spec.label} foundered a ${vessel.type === 'FISHING_SCHOONER' ? 'fishing schooner' : 'privateer sloop'} in the open channel!`,
        kind: 'error',
      });
    }
  }
  outcome.nextUnits = nextUnits;

  // Unfortified land structures may be razed by hurricanes unless the tile
  // sits within one Chebyshev tile of a Coastal Bastion.
  for (const storm of weather) {
    const spec = weatherSpec(storm.type);
    if (!spec || spec.destroyChance <= 0) continue;
    for (const building of state.buildings) {
      if (building.faction !== 'player') continue;
      if (outcome.destroyedBuildingIds.includes(building.id)) continue;
      if (!coversCell(storm, building.col, building.row)) continue;
      if (bastions.some((b) => chebyshev(b.col, b.row, building.col, building.row) <= 1)) continue;
      if (!roll(spec.destroyChance)) continue;
      outcome.destroyedBuildingIds.push(building.id);
      outcome.flashTiles.push({ col: building.col, row: building.row });
      outcome.notices.push({
        text: `Hurricane razed a ${building.type === 'PLANTATION' ? 'plantation' : 'structure'} on the windward shore!`,
        kind: 'error',
      });
    }
  }

  // Rain bands water plantations beneath their footprint.
  const watered = new Set<string>();
  for (const storm of weather) {
    const spec = weatherSpec(storm.type);
    if (!spec || !spec.waters) continue;
    for (const building of state.buildings) {
      if (building.type !== 'PLANTATION') continue;
      if (coversCell(storm, building.col, building.row)) {
        watered.add(`${building.col},${building.row}`);
      }
    }
  }
  outcome.wateredPlantationKeys = watered;
}

export function isVesselType(type: UnitEntity['type']): boolean {
  return isBuildableVessel(type);
}
