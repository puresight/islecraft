import {
  Building,
  GameStateSnapshot,
  RivalEconomy,
  TerrainType,
  UnitEntity,
  GameMode,
} from '@/types/game';
import { INITIAL_MAP, MapId, MAP_COLS, MAP_ROWS, TileType, activateMap } from '@/constants/mapData';

const TERRAIN_BY_TILE: Record<TileType, TerrainType> = {
  [TileType.DEEP_SEA]: 'DEEP_SEA',
  [TileType.SHALLOW_WATER]: 'SHALLOW_WATER',
  [TileType.P1_TERRITORY]: 'ISLAND_1_SOIL',
  [TileType.P2_TERRITORY]: 'ISLAND_2_SOIL',
  [TileType.MOUNTAIN]: 'MOUNTAIN',
};

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const tileAt = (col: number, row: number): TileType | undefined =>
  col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS ? INITIAL_MAP[row][col] : undefined;

function nearestTileOf(
  wanted: TileType[],
  col: number,
  row: number,
  occupied: Set<string>,
): { col: number; row: number } | null {
  let best: { col: number; row: number } | null = null;
  let bestDist = Infinity;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (occupied.has(`${c},${r}`)) continue;
      const t = tileAt(c, r);
      if (!t || !wanted.includes(t)) continue;
      const dist = Math.abs(c - col) + Math.abs(r - row);
      if (dist < bestDist) {
        bestDist = dist;
        best = { col: c, row: r };
      }
    }
  }
  return best;
}

function initialBuildings(): Building[] {
  // Canonical Twin Reaches berths; each clamps to the nearest home-soil tile
  // on any chart so smaller fragments still get a full settlement.
  const berths: Array<{ type: Building['type']; faction: Building['faction']; col: number; row: number }> = [
    { type: 'SETTLER_QUARTERS', faction: 'player', col: 5, row: 8 },
    { type: 'PLANTATION', faction: 'player', col: 7, row: 9 },
    { type: 'TRADING_POST', faction: 'player', col: 9, row: 8 },
    { type: 'SETTLER_QUARTERS', faction: 'rival', col: 22, row: 9 },
    { type: 'PLANTATION', faction: 'rival', col: 23, row: 9 },
    { type: 'TRADING_POST', faction: 'rival', col: 24, row: 9 },
  ];
  const taken = new Set<string>();
  const homes: Record<Building['faction'], TileType[]> = {
    player: [TileType.P1_TERRITORY],
    rival: [TileType.P2_TERRITORY],
  };
  return berths.map((berth) => {
    const wanted = homes[berth.faction];
    const direct = tileAt(berth.col, berth.row);
    const spot =
      direct && wanted.includes(direct) && !taken.has(`${berth.col},${berth.row}`)
        ? berth
        : nearestTileOf(wanted, berth.col, berth.row, taken);
    const pos = spot ?? berth;
    taken.add(`${pos.col},${pos.row}`);
    return { id: makeId('bld'), type: berth.type, faction: berth.faction, ...pos, level: 1, builtOnTurn: 0 };
  });
}

function initialUnits(): UnitEntity[] {
  const wishes: Array<{ type: UnitEntity['type']; faction: UnitEntity['faction']; col: number; row: number; heading: 0 | 180 }> = [
    { type: 'FISHING_SCHOONER', faction: 'player', col: 2, row: 8, heading: 0 },
    { type: 'FISHING_SCHOONER', faction: 'rival', col: 26, row: 8, heading: 180 },
    { type: 'FISH_SHOAL', faction: 'neutral', col: 16, row: 3, heading: 0 },
    { type: 'FISH_SHOAL', faction: 'neutral', col: 16, row: 12, heading: 180 },
    { type: 'ROGUE_GALLEON', faction: 'neutral', col: 14, row: 8, heading: 0 },
  ];
  const taken = new Set<string>();
  const homes: Record<UnitEntity['faction'], TileType[]> = {
    player: [TileType.P1_TERRITORY, TileType.SHALLOW_WATER, TileType.DEEP_SEA],
    rival: [TileType.P2_TERRITORY, TileType.SHALLOW_WATER, TileType.DEEP_SEA],
    neutral: [TileType.SHALLOW_WATER, TileType.DEEP_SEA],
  };
  return wishes.map((wish) => {
    const direct = tileAt(wish.col, wish.row);
    const spot =
      direct && homes[wish.faction].includes(direct) && !taken.has(`${wish.col},${wish.row}`)
        ? wish
        : nearestTileOf(homes[wish.faction], wish.col, wish.row, taken);
    const pos = spot ?? wish;
    taken.add(`${pos.col},${pos.row}`);
    return { id: makeId('unt'), type: wish.type, faction: wish.faction, ...pos, heading: wish.heading };
  });
}

const INITIAL_RIVAL_ECONOMY: RivalEconomy = {
  population: 120,
  housingCapacity: 140,
  foodReserves: 600,
  treasurySats: 12500,
};

export function createInitialGameState(mode: GameMode, mapId: MapId): GameStateSnapshot {
  const map = activateMap(mapId);
  const now = Date.now();
  return {
    id: 'active',
    phase: 'playing',
    turn: 1,
    createdAt: now,
    updatedAt: now,
    mode,
    mapId,
    terrain: map.map((row) => row.map((tile) => TERRAIN_BY_TILE[tile])),
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
      peakPopulation: 120,
      raidersSunk: 0,
    },
    rivalEconomy: { ...INITIAL_RIVAL_ECONOMY },
    history: [
      {
        turn: 1,
        p1Pop: 120,
        p2Pop: 120,
        p1Sats: 12500,
        p2Sats: 12500,
        p1Food: 600,
        p2Food: 600,
      },
    ],
  };
}
