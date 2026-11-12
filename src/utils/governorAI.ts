import { BuildingType, GameStateSnapshot } from '@/types/game';
import { DynamicEntity } from '@/types/entities';
import { MAP_COLS, MAP_ROWS } from '@/constants/mapData';
import { itemCost } from '@/constants/blueprints';
import { chebyshev } from '@/utils/coordinates';

interface BuildIntent {
  item: BuildingType | 'FISHING_SCHOONER' | 'PRIVATEER_SLOOP';
  utility: number;
}

/**
 * Utility-scored construction priorities for the Blue Governor.
 * The highest-utility affordable item wins; ties break toward higher cost.
 */
export function scoreBuildIntents(state: GameStateSnapshot, entities: DynamicEntity[]): BuildIntent[] {
  const econ = state.rivalEconomy;
  const foodDemand = Math.ceil(econ.population / 500) * 20;
  const intents: BuildIntent[] = [];

  if (econ.foodReserves < foodDemand) {
    intents.push({ item: 'PLANTATION', utility: 80 });
    intents.push({ item: 'FISHING_SCHOONER', utility: 70 });
  }
  if (econ.population > econ.housingCapacity) {
    intents.push({ item: 'SETTLER_QUARTERS', utility: 75 });
  }
  const blueBastions = state.buildings.filter(
    (b) => b.faction === 'rival' && b.type === 'APOTHECARY',
  );
  const unrestProxy = blueBastions.length === 0 ? 50 : 40;
  if (unrestProxy > 45) {
    intents.push({ item: 'APOTHECARY', utility: 65 });
  }

  const easternThreat =
    entities.some((e) => e.type === 'ROGUE_GALLEON' && e.x > MAP_COLS / 2) ||
    state.units.some(
      (u) => u.faction === 'player' && u.type === 'PRIVATEER_SLOOP' && u.col > MAP_COLS / 2,
    );
  if (easternThreat) {
    intents.push({ item: 'COASTAL_BASTION', utility: 85 });
    intents.push({ item: 'PRIVATEER_SLOOP', utility: 80 });
  }

  intents.push({ item: 'TRADING_POST', utility: 50 });
  return intents.sort((a, b) => b.utility - a.utility || itemCost(b.item) - itemCost(a.item));
}

function buildingTileFor(
  state: GameStateSnapshot,
  item: Exclude<BuildIntent['item'], 'FISHING_SCHOONER' | 'PRIVATEER_SLOOP'>,
): { col: number; row: number } | null {
  const candidates: Array<{ col: number; row: number; score: number }> = [];
  const occupied = new Set(
    [...state.buildings, ...state.units].map((p) => `${p.col},${p.row}`),
  );
  const blueBuildings = state.buildings.filter((b) => b.faction === 'rival');

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (col <= MAP_COLS / 2) continue;
      if (occupied.has(`${col},${row}`)) continue;
      if (state.terrain[row][col] !== 'ISLAND_2_SOIL') continue;

      let score = 0;
      if (item === 'COASTAL_BASTION') {
        const touchesWater = [-1, 0, 1].some((dy) =>
          [-1, 0, 1].some((dx) => {
            const t = state.terrain[row + dy]?.[col + dx];
            return t === 'SHALLOW_WATER' || t === 'DEEP_SEA';
          }),
        );
        if (!touchesWater) continue;
        score = 10;
      } else {
        // Cluster near the heart of the settlement for walking-distance flavor
        const minDist = blueBuildings.length
          ? Math.min(...blueBuildings.map((b) => chebyshev(b.col, b.row, col, row)))
          : 99;
        score = 20 - minDist;
      }
      candidates.push({ col, row, score });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function vesselTileFor(state: GameStateSnapshot): { col: number; row: number } | null {
  const occupied = new Set(
    [...state.buildings, ...state.units].map((p) => `${p.col},${p.row}`),
  );
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (col <= MAP_COLS / 2) continue;
      if (occupied.has(`${col},${row}`)) continue;
      const t = state.terrain[row][col];
      if (t !== 'SHALLOW_WATER' && t !== 'DEEP_SEA') continue;
      const shoresHome = [-1, 0, 1].some((dy) =>
        [-1, 0, 1].some((dx) => state.terrain[row + dy]?.[col + dx] === 'ISLAND_2_SOIL'),
      );
      if (shoresHome) return { col, row };
    }
  }
  return null;
}

export interface GovernorBuildResult {
  item: BuildIntent['item'];
  col: number;
  row: number;
}

/**
 * Pick the best affordable construction for Blue. Returns null when the
 * treasury cannot cover the top intent or no valid tile exists.
 */
export function planGovernorBuild(
  state: GameStateSnapshot,
  entities: DynamicEntity[],
): GovernorBuildResult | null {
  for (const intent of scoreBuildIntents(state, entities)) {
    if (itemCost(intent.item) > state.rivalEconomy.treasurySats) continue;
    if (intent.item === 'FISHING_SCHOONER' || intent.item === 'PRIVATEER_SLOOP') {
      const spot = vesselTileFor(state);
      if (spot) return { item: intent.item, ...spot };
    } else {
      const spot = buildingTileFor(state, intent.item);
      if (spot) return { item: intent.item, ...spot };
    }
  }
  return null;
}

function stepToward(
  from: { col: number; row: number },
  to: { x: number; y: number },
  blocked: Set<string>,
): { col: number; row: number } | null {
  const steps: Array<{ col: number; row: number }> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      steps.push({ col: from.col + dx, row: from.row + dy });
    }
  }
  let best: { col: number; row: number } | null = null;
  let bestDist = Infinity;
  for (const step of steps) {
    if (blocked.has(`${step.col},${step.row}`)) continue;
    const dist = Math.max(Math.abs(step.col - to.x), Math.abs(step.row - to.y));
    if (dist < bestDist) {
      bestDist = dist;
      best = step;
    }
  }
  return best;
}

/**
 * Tactical micro: steer Blue schooners toward the nearest fish shoal and Blue
 * sloops toward pirate galleons or Red vessels. One move per vessel per call.
 */
export function planGovernorMoves(
  state: GameStateSnapshot,
  entities: DynamicEntity[],
): Array<{ unitId: string; col: number; row: number }> {
  const moves: Array<{ unitId: string; col: number; row: number }> = [];
  const blocked = new Set(state.units.map((u) => `${u.col},${u.row}`));

  const blueVessels = state.units.filter(
    (u) => u.faction === 'rival' && (u.type === 'FISHING_SCHOONER' || u.type === 'PRIVATEER_SLOOP'),
  );

  for (const vessel of blueVessels) {
    let target: { x: number; y: number } | null = null;
    if (vessel.type === 'FISHING_SCHOONER') {
      const shoal = entities.find((e) => e.type === 'FISH_SHOAL');
      if (shoal) target = { x: shoal.x, y: shoal.y };
    } else {
      const galleon = entities.find((e) => e.type === 'ROGUE_GALLEON');
      if (galleon) {
        target = { x: galleon.x, y: galleon.y };
      } else {
        const prey = state.units.find((u) => u.faction === 'player');
        if (prey) target = { x: prey.col, y: prey.row };
      }
    }
    if (!target) continue;
    const step = stepToward(vessel, target, blocked);
    if (step && (step.col !== vessel.col || step.row !== vessel.row)) {
      moves.push({ unitId: vessel.id, ...step });
      blocked.add(`${step.col},${step.row}`);
    }
  }
  return moves;
}
