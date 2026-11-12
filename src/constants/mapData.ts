import rawTwinReaches from './maps/twin-reaches.txt?raw';
import rawShatteredAtoll from './maps/shattered-atoll.txt?raw';
import rawCalderaSound from './maps/caldera-sound.txt?raw';
import rawIronStrait from './maps/iron-strait.txt?raw';

export enum TileType {
  DEEP_SEA,
  SHALLOW_WATER,
  P1_TERRITORY,
  P2_TERRITORY,
  MOUNTAIN,
}

export const MAP_COLS = 29;
export const MAP_ROWS = 16;

export type MapId = 'TWIN_REACHES' | 'SHATTERED_ATOLL' | 'CALDERA_SOUND' | 'IRON_STRAIT';

export interface MapDefinition {
  id: MapId;
  name: string;
  tagline: string;
  ascii: string[];
}

const toRows = (raw: string): string[] =>
  raw
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.length > 0);

export const MAP_DEFINITIONS: Record<MapId, MapDefinition> = {
  TWIN_REACHES: {
    id: 'TWIN_REACHES',
    name: 'Twin Reaches',
    tagline: 'The authentic interlocking boot',
    ascii: toRows(rawTwinReaches),
  },
  SHATTERED_ATOLL: {
    id: 'SHATTERED_ATOLL',
    name: 'Shattered Atoll',
    tagline: 'Fragmented cays, heavy naval & fishing emphasis',
    ascii: toRows(rawShatteredAtoll),
  },
  CALDERA_SOUND: {
    id: 'CALDERA_SOUND',
    name: 'Caldera Sound',
    tagline: 'Curved circular gulf with rich central fisheries',
    ascii: toRows(rawCalderaSound),
  },
  IRON_STRAIT: {
    id: 'IRON_STRAIT',
    name: 'Iron Strait',
    tagline: 'Tight chokepoint channel between massive bluffs',
    ascii: toRows(rawIronStrait),
  },
};

export const MAP_ORDER: MapId[] = ['TWIN_REACHES', 'SHATTERED_ATOLL', 'CALDERA_SOUND', 'IRON_STRAIT'];

const CHAR_TO_TILE: Record<string, TileType> = {
  '.': TileType.DEEP_SEA,
  '~': TileType.SHALLOW_WATER,
  '1': TileType.P1_TERRITORY,
  '2': TileType.P2_TERRITORY,
  '^': TileType.MOUNTAIN,
};

export function parseMapAscii(ascii: string[], mapId: MapId): TileType[][] {
  if (ascii.length !== MAP_ROWS || ascii.some((row) => row.length !== MAP_COLS)) {
    throw new Error(`${mapId} must be exactly ${MAP_ROWS} rows of ${MAP_COLS} columns`);
  }
  return ascii.map((row) =>
    row.split('').map((ch) => {
      const tile = CHAR_TO_TILE[ch];
      if (tile === undefined) throw new Error(`Unknown map character in ${mapId}: "${ch}"`);
      return tile;
    }),
  );
}

const ACTIVE_MAP_ID: MapId = 'TWIN_REACHES';

/**
 * The active chart. All legacy consumers (board rendering, placement rules,
 * entity drifting) keep reading INITIAL_MAP; selecting a map at campaign start
 * reassigns this backing store before the first snapshot is created.
 */
let activeAscii = MAP_DEFINITIONS[ACTIVE_MAP_ID].ascii;

export function activateMap(mapId: MapId): TileType[][] {
  activeAscii = MAP_DEFINITIONS[mapId].ascii;
  INITIAL_MAP = parseMapAscii(activeAscii, mapId);
  return INITIAL_MAP;
}

export let INITIAL_MAP: TileType[][] = parseMapAscii(activeAscii, ACTIVE_MAP_ID);
