import {
  Building,
  GameStateSnapshot,
  UnitEntity,
} from '@/types/game';
import { buildTerrainGrid } from './terrain';

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

function initialBuildings(): Building[] {
  return [
    { id: makeId('bld'), type: 'SETTLER_QUARTERS', faction: 'player', col: 5, row: 8, level: 1, builtOnTurn: 0 },
    { id: makeId('bld'), type: 'PLANTATION', faction: 'player', col: 7, row: 9, level: 1, builtOnTurn: 0 },
    { id: makeId('bld'), type: 'TRADING_POST', faction: 'player', col: 9, row: 8, level: 1, builtOnTurn: 0 },
    { id: makeId('bld'), type: 'SETTLER_QUARTERS', faction: 'rival', col: 20, row: 8, level: 1, builtOnTurn: 0 },
    { id: makeId('bld'), type: 'PLANTATION', faction: 'rival', col: 22, row: 9, level: 1, builtOnTurn: 0 },
    { id: makeId('bld'), type: 'TRADING_POST', faction: 'rival', col: 18, row: 8, level: 1, builtOnTurn: 0 },
  ];
}

function initialUnits(): UnitEntity[] {
  return [
    { id: makeId('unt'), type: 'FISHING_SCHOONER', faction: 'player', col: 2, row: 8, heading: 0 },
    { id: makeId('unt'), type: 'FISHING_SCHOONER', faction: 'rival', col: 26, row: 8, heading: 180 },
    { id: makeId('unt'), type: 'FISH_SHOAL', faction: 'neutral', col: 14, row: 3, heading: 0 },
    { id: makeId('unt'), type: 'FISH_SHOAL', faction: 'neutral', col: 14, row: 12, heading: 180 },
    { id: makeId('unt'), type: 'ROGUE_GALLEON', faction: 'neutral', col: 14, row: 8, heading: 0 },
  ];
}

export function createInitialGameState(): GameStateSnapshot {
  const now = Date.now();
  return {
    id: 'active',
    phase: 'playing',
    turn: 1,
    createdAt: now,
    updatedAt: now,
    terrain: buildTerrainGrid(),
    buildings: initialBuildings(),
    units: initialUnits(),
    economy: {
      population: 120,
      housingCapacity: 140,
      foodReserves: 600,
      mortalityRate: 0,
      treasurySats: 12500,
      unrestIndex: 8,
      victoryPoints: 0,
    },
  };
}
