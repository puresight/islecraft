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
  | 'ROGUE_GALLEON'
  | 'CORSAIR_MUTINEER';

export type GamePhase = 'playing' | 'ended';

export type GameMode = 'solo' | 'duel';

/** In-world calendar year for campaign turn 1. */
export const BASE_YEAR = 1780;

/** Blue faction ledger, simulated by the Governor AI or duel bookkeeping. */
export interface RivalEconomy {
  population: number;
  housingCapacity: number;
  foodReserves: number;
  treasurySats: number;
}

/** Per-turn vital signs captured for the retrospective charts. */
export interface VitalSnapshot {
  turn: number;
  p1Pop: number;
  p2Pop: number;
  p1Sats: number;
  p2Sats: number;
  p1Food: number;
  p2Food: number;
}

/** One recorded historical event for the retrospective chronicle. */
export interface ChronicleEntry {
  turn: number;
  year: number;
  text: string;
}

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
  /** highest population ever reached this campaign */
  peakPopulation: number;
  /** rogue galleons sunk by sloops or bastions this campaign */
  raidersSunk: number;
}

export interface GameStateSnapshot {
  id: 'active';
  phase: GamePhase;
  turn: number;
  createdAt: number;
  updatedAt: number;
  mode: GameMode;
  /** MapId of the chart this campaign is played on. */
  mapId: string;
  /** terrain[row][col] */
  terrain: TerrainType[][];
  buildings: Building[];
  units: UnitEntity[];
  economy: EconomyState;
  rivalEconomy: RivalEconomy;
  history: VitalSnapshot[];
}

export interface MatchHistoryRecord {
  id?: number;
  completedAt: number;
  outcome: 'victory' | 'defeat' | 'abandoned';
  victoryPoints: number;
  finalTreasurySats: number;
  turnsSurvived: number;
  date?: string;
  faction?: string;
  finalScore?: number;
  rank?: string;
  peakPop?: number;
}

export interface PlayerSettings {
  key: 'default';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  colorTheme: 'parchment' | 'midnight';
  controlScheme: 'touch' | 'pointer';
  /** Turn clock length in seconds. */
  turnSeconds: 45 | 60 | 90;
  /** Total turns in the campaign. */
  campaignTurns: 10 | 12 | 15;
  /** Chart selected for the next voyage. */
  mapId: string;
}
