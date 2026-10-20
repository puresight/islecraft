import {
  BuildingType,
  GRID_WIDTH,
  GamePhase,
  GameStateSnapshot,
  TerrainType,
  UnitEntity,
  UnitType,
} from '@/types/game';

export interface TurnReport {
  turn: number;
  foodProduced: number;
  foodConsumed: number;
  satsEarned: number;
  populationChange: number;
  events: string[];
}

const DRIFTERS = new Set<UnitType>(['FISH_SHOAL', 'SQUALL', 'TEMPEST', 'ROGUE_GALLEON']);

const isWater = (t: TerrainType) => t === 'DEEP_SEA' || t === 'SHALLOW_WATER';

function driftUnit(unit: UnitEntity, terrain: TerrainType[][], units: UnitEntity[]): UnitEntity {
  const dx = unit.heading === 0 ? 1 : -1;
  const nextCol = unit.col + dx;
  const inBounds = nextCol >= 0 && nextCol < GRID_WIDTH;
  const occupied = units.some((o) => o.id !== unit.id && o.row === unit.row && o.col === nextCol);
  if (!inBounds || !isWater(terrain[unit.row][nextCol]) || occupied) {
    return { ...unit, heading: unit.heading === 0 ? 180 : 0 };
  }
  return { ...unit, col: nextCol };
}

/**
 * Pure turn-tick: yields, consumption, births/deaths, unrest drift and
 * neutral entity movement. Returns the next snapshot plus a report for the log.
 */
export function advanceTurn(state: GameStateSnapshot): { state: GameStateSnapshot; report: TurnReport } {
  if (state.phase !== 'playing') {
    return {
      state,
      report: { turn: state.turn, foodProduced: 0, foodConsumed: 0, satsEarned: 0, populationChange: 0, events: [] },
    };
  }

  const own = state.buildings.filter((b) => b.faction === 'player');
  const count = (type: BuildingType) => own.filter((b) => b.type === type).length;

  const foodProduced = count('PLANTATION') * 30;
  const satsEarned = 40 + count('TRADING_POST') * 120;
  const housingCapacity = 100 + count('SETTLER_QUARTERS') * 40;

  const econ = state.economy;
  const events: string[] = [];

  const foodConsumed = Math.ceil(econ.population * 0.4);
  let food = econ.foodReserves + foodProduced - foodConsumed;
  let population = econ.population;
  let mortality = econ.mortalityRate;
  let unrest = econ.unrestIndex;
  let populationChange = 0;

  if (food < 0) {
    const deaths = Math.max(1, Math.ceil(population * 0.02));
    population = Math.max(0, population - deaths);
    populationChange = -deaths;
    mortality = Math.min(100, mortality + 2);
    unrest = Math.min(100, unrest + 5);
    events.push(`Food shortage — ${deaths} settlers lost to hunger.`);
    food = 0;
  } else {
    const healing = count('APOTHECARY') * 2;
    mortality = Math.max(0, mortality - healing);
    unrest = Math.max(0, Math.min(100, unrest + 1 - count('COASTAL_BASTION') * 5));
    if (food > population * 2 && population < housingCapacity) {
      const births = Math.min(housingCapacity - population, Math.max(1, Math.ceil(population * 0.02)));
      population += births;
      populationChange = births;
      events.push(`${births} new settlers arrived at the quay.`);
    }
  }

  const units = state.units.map((u) =>
    u.faction === 'neutral' && DRIFTERS.has(u.type) ? driftUnit(u, state.terrain, state.units) : u,
  );

  const turn = state.turn + 1;
  const phase: GamePhase = population <= 0 ? 'ended' : 'playing';
  if (phase === 'ended') events.push('The last settler has fallen — the colony is lost.');

  const nextState: GameStateSnapshot = {
    ...state,
    phase,
    turn,
    units,
    economy: {
      ...econ,
      population,
      housingCapacity,
      foodReserves: food,
      mortalityRate: mortality,
      treasurySats: econ.treasurySats + satsEarned,
      unrestIndex: unrest,
      victoryPoints: turn,
    },
    updatedAt: Date.now(),
  };

  return {
    state: nextState,
    report: { turn, foodProduced, foodConsumed, satsEarned, populationChange, events },
  };
}
