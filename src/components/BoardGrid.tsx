import { Building, BuildingType, GameStateSnapshot, TerrainType, UnitEntity, UnitType } from '@/types/game';
import { BUILDING_ICON, UNIT_ICON } from '@/game/entityIcons';

const TERRAIN_STYLE: Record<TerrainType, string> = {
  DEEP_SEA: 'bg-ocean',
  SHALLOW_WATER: 'bg-shallows',
  ISLAND_1_SOIL: 'bg-sand/85',
  ISLAND_2_SOIL: 'bg-timber/85',
  MOUNTAIN: 'bg-foam/40',
};

interface BoardGridProps {
  state: GameStateSnapshot;
  placementActive: boolean;
  onCellTap: (col: number, row: number) => void;
  className?: string;
}

export function BoardGrid({ state, placementActive, onCellTap, className = '' }: BoardGridProps) {
  const buildingAt = new Map<string, Building>();
  state.buildings.forEach((b) => buildingAt.set(`${b.col},${b.row}`, b));
  const unitAt = new Map<string, UnitEntity>();
  state.units.forEach((u) => unitAt.set(`${u.col},${u.row}`, u));

  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 border-rim shadow-panel ${className}`}
      style={{ aspectRatio: '29 / 16' }}
      role="grid"
      aria-label="Dual isle chart"
    >
      <div
        className="grid h-full w-full"
        style={{ gridTemplateColumns: `repeat(29, 1fr)`, gridTemplateRows: `repeat(16, 1fr)` }}
      >
        {state.terrain.map((rowCells, row) =>
          rowCells.map((terrain, col) => {
            const key = `${col},${row}`;
            const building = buildingAt.get(key);
            const unit = unitAt.get(key);
            const occupant = building ?? unit;
            return (
              <button
                key={key}
                type="button"
                aria-label={`Chart cell ${col + 1},${row + 1}${occupant ? ', occupied' : ''}`}
                onClick={() => onCellTap(col, row)}
                className={`relative ${TERRAIN_STYLE[terrain]} ${placementActive ? 'cursor-crosshair' : 'cursor-default'}`}
              >
                {building && (
                  <span className={`absolute inset-0 flex items-center justify-center ${building.faction === 'player' ? 'bg-terra/70' : 'bg-cobalt/80'}`}>
                    {(() => {
                      const Glyph = BUILDING_ICON[building.type as BuildingType];
                      return <Glyph className="h-[62%] w-[62%] text-charcoal" strokeWidth={2.4} />;
                    })()}
                  </span>
                )}
                {!building && unit && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    {(() => {
                      const Glyph = UNIT_ICON[unit.type as UnitType];
                      return (
                        <Glyph
                          className={`h-[64%] w-[64%] ${unit.faction === 'player' ? 'text-terra' : unit.faction === 'rival' ? 'text-cobalt-light' : 'text-parchment/80'} ${
                            unit.type === 'FISH_SHOAL' ? 'animate-sway' : ''
                          }`}
                          strokeWidth={2.2}
                        />
                      );
                    })()}
                  </span>
                )}
                {placementActive && !occupant && terrain === 'ISLAND_1_SOIL' && <span className="absolute inset-0 bg-brass/25" />}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
