export const GRID_WIDTH = 29;
export const GRID_HEIGHT = 16;

export type TerrainType =
  | 'DEEP_SEA'
  | 'SHALLOW_WATER'
  | 'ISLAND_1_SOIL'
  | 'ISLAND_2_SOIL'
  | 'MOUNTAIN';

export type Faction = 'player' | 'rival';
export type UnitAlignment = Faction | 'neutral';

export type BuildingType =
  | 'PLANTATION'
  | 'TRADING_POST'
  | 'SETTLER_QUARTERS'
  | 'COASTAL_BASTION'
  | 'APOTHECARY';

export type UnitType =
  | 'FISHING_SCHOONER'
  | 'PRIVATEER_SLOOP'
  | 'SQUALL'
  | 'TEMPEST'
  | 'FISH_SHOAL'
  | 'ROGUE_GALLEON';

export type GamePhase = 'playing' | 'ended';

export interface Coordinates {
  col: number;
  row: number;
}

export interface Building extends Coordinates {
  id: string;
  type: BuildingType;
  faction: Faction;
  level: number;
  builtOnTurn: number;
}

export interface UnitEntity extends Coordinates {
  id: string;
  type: UnitType;
  faction: UnitAlignment;
  /** 0 = drifting east, 180 = drifting west */
  heading: 0 | 180;
}

export interface EconomyState {
  population: number;
  housingCapacity: number;
  foodReserves: number;
  /** percent 0-100 */
  mortalityRate: number;
  /** balance in satoshis */
  treasurySats: number;
  /** percent 0-100 */
  unrestIndex: number;
  victoryPoints: number;
}

export interface GameStateSnapshot {
  id: 'active';
  phase: GamePhase;
  turn: number;
  createdAt: number;
  updatedAt: number;
  /** terrain[row][col] */
  terrain: TerrainType[][];
  buildings: Building[];
  units: UnitEntity[];
  economy: EconomyState;
}

export interface MatchHistoryRecord {
  id?: number;
  completedAt: number;
  outcome: 'victory' | 'defeat' | 'abandoned';
  victoryPoints: number;
  finalTreasurySats: number;
  turnsSurvived: number;
}

export interface PlayerSettings {
  key: 'default';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  colorTheme: 'parchment' | 'midnight';
  controlScheme: 'touch' | 'pointer';
}

export interface BuildingSpec {
  label: string;
  description: string;
  costSats: number;
  effect: string;
}

export const BUILDING_SPEC: Record<BuildingType, BuildingSpec> = {
  PLANTATION: {
    label: 'Plantation',
    description: 'Tilled fields and cane rows worked by your settlers.',
    costSats: 800,
    effect: '+30 food per turn',
  },
  TRADING_POST: {
    label: 'Trading Post',
    description: 'Harbor-side exchange where cargo is settled in sats.',
    costSats: 1200,
    effect: '+120 sats per turn',
  },
  SETTLER_QUARTERS: {
    label: 'Settler Quarters',
    description: 'Timber lodgings that shelter new arrivals to the isle.',
    costSats: 1000,
    effect: '+40 housing capacity',
  },
  COASTAL_BASTION: {
    label: 'Coastal Bastion',
    description: 'Cannon battery guarding the anchorage from raiders.',
    costSats: 1500,
    effect: '-5 unrest per turn',
  },
  APOTHECARY: {
    label: 'Apothecary',
    description: 'Herbalist infirmary tending the sick and wounded.',
    costSats: 900,
    effect: '-2 mortality per turn',
  },
};

export interface UnitSpec {
  label: string;
  description: string;
  alignment: UnitAlignment;
}

export const UNIT_SPEC: Record<UnitType, UnitSpec> = {
  FISHING_SCHOONER: {
    label: 'Fishing Schooner',
    description: 'Working vessel that hauls in food when moored near shoals.',
    alignment: 'player',
  },
  PRIVATEER_SLOOP: {
    label: 'Privateer Sloop',
    description: 'Fast armed raider that can strike rival shipping lanes.',
    alignment: 'player',
  },
  SQUALL: {
    label: 'Squall',
    description: 'A brief violent gust front that scatters loose vessels.',
    alignment: 'neutral',
  },
  TEMPEST: {
    label: 'Tempest',
    description: 'A towering storm system — heavy damage, slow to pass.',
    alignment: 'neutral',
  },
  FISH_SHOAL: {
    label: 'Fish Shoal',
    description: 'Migrating schools that drift across the channel each turn.',
    alignment: 'neutral',
  },
  ROGUE_GALLEON: {
    label: 'Rogue Galleon',
    description: 'Masterless treasure ship; seize it before your rival does.',
    alignment: 'neutral',
  },
};
