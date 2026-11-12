import { Faction, GameStateSnapshot, BuildingType, UnitType } from '@/types/game';
import { INITIAL_MAP, MAP_COLS, MAP_ROWS, TileType } from '@/constants/mapData';
import { isBuildingType, itemCost } from '@/constants/blueprints';
import { neighborsOf } from '@/utils/coordinates';

export interface PlacementCheck {
  valid: boolean;
  reason?: string;
}

const HOME_TILE: Record<Faction, TileType> = {
  player: TileType.P1_TERRITORY,
  rival: TileType.P2_TERRITORY,
};

function tileAt(x: number, y: number): TileType | undefined {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return undefined;
  return INITIAL_MAP[y][x];
}

export function canPlaceItem(
  itemType: BuildingType | UnitType,
  x: number,
  y: number,
  activeFaction: Faction,
  gameState: GameStateSnapshot,
): PlacementCheck {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) {
    return { valid: false, reason: 'Outside the chart' };
  }

  const occupied =
    gameState.buildings.some((b) => b.col === x && b.row === y) ||
    gameState.units.some((u) => u.col === x && u.row === y);
  if (occupied) return { valid: false, reason: 'Cell already occupied' };

  if (itemCost(itemType) > gameState.economy.treasurySats) {
    return { valid: false, reason: 'Treasury short of the cost' };
  }

  const tile = tileAt(x, y);
  const home = HOME_TILE[activeFaction];

  if (isBuildingType(itemType)) {
    if (tile !== home) {
      return { valid: false, reason: 'Structures may only stand on home territory' };
    }
    if (itemType === 'COASTAL_BASTION') {
      const touchesWater = neighborsOf(x, y).some(([nx, ny]) => {
        const t = tileAt(nx, ny);
        return t === TileType.SHALLOW_WATER || t === TileType.DEEP_SEA;
      });
      if (!touchesWater) return { valid: false, reason: 'Bastion must adjoin water' };
    }
    return { valid: true };
  }

  if (tile !== TileType.SHALLOW_WATER && tile !== TileType.DEEP_SEA) {
    return { valid: false, reason: 'Vessels require open water' };
  }
  const shoresHome = neighborsOf(x, y).some(([nx, ny]) => tileAt(nx, ny) === home);
  if (!shoresHome) return { valid: false, reason: 'Vessel must launch beside home shores' };

  return { valid: true };
}
