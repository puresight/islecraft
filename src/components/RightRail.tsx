import { Wind, type LucideIcon } from 'lucide-react';
import { BuildingType, GameStateSnapshot, UnitType, BUILDING_SPEC, UNIT_SPEC } from '@/types/game';
import { BUILDING_ICON, UNIT_ICON } from '@/game/entityIcons';
import { formatSats } from '@/utils/format';
import type { CommandTab } from './commandTabs';

const LAUNCH_COST: Partial<Record<UnitType, number>> = {
  FISHING_SCHOONER: 600,
  PRIVATEER_SLOOP: 1400,
};

interface RightRailProps {
  tab: CommandTab;
  onTabChange: (tab: CommandTab) => void;
  game: GameStateSnapshot;
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onLaunch: (type: UnitType) => void;
  busy: boolean;
  onEndTurn: () => void;
}

interface ActionItem {
  key: string;
  label: string;
  cost: number;
  affordable: boolean;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: LucideIcon;
}

export function RightRail({ tab, onTabChange, game, selectedBuilding, onSelectBuilding, onLaunch, busy, onEndTurn }: RightRailProps) {
  const items: ActionItem[] =
    tab === 'construct'
      ? (Object.keys(BUILDING_SPEC) as BuildingType[]).map((type) => {
          const spec = BUILDING_SPEC[type];
          const Icon = BUILDING_ICON[type];
          return {
            key: type,
            label: spec.label,
            cost: spec.costSats,
            affordable: game.economy.treasurySats >= spec.costSats,
            active: selectedBuilding === type,
            disabled: game.economy.treasurySats < spec.costSats,
            onClick: () => onSelectBuilding(selectedBuilding === type ? null : type),
            icon: Icon,
          };
        })
      : tab === 'launch'
        ? (['FISHING_SCHOONER', 'PRIVATEER_SLOOP'] as UnitType[]).map((type) => {
            const cost = LAUNCH_COST[type] ?? 0;
            const Icon = UNIT_ICON[type];
            return {
              key: type,
              label: UNIT_SPEC[type].label,
              cost,
              affordable: game.economy.treasurySats >= cost,
              active: false,
              disabled: game.economy.treasurySats < cost,
              onClick: () => onLaunch(type),
              icon: Icon,
            };
          })
        : [];

  return (
    <aside className="h-full w-48 flex-shrink-0 overflow-y-auto border-l border-rim bg-charcoal p-1.5 sm:w-56">
      <div className="flex flex-col gap-1" role="tablist" aria-label="Command categories">
        {(
          [
            { id: 'construct' as CommandTab, label: 'Construct' },
            { id: 'launch' as CommandTab, label: 'Launch' },
            { id: 'status' as CommandTab, label: 'Orders' },
          ]
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
            className={`flex min-h-[40px] select-none items-center justify-center rounded-md border text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === id ? 'border-brass/60 bg-brass/15 text-brass' : 'border-rim/40 text-foam/80 hover:bg-rim/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'status' ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-rim/40 bg-ocean/40 p-2 text-[11px] leading-relaxed text-foam/85">
          <p className="font-bold uppercase tracking-widest text-foam/60">Territory Orders</p>
          <p className="mt-1.5">
            Structures: <span className="font-mono text-parchment">{game.buildings.filter((b) => b.faction === 'player').length}</span>
          </p>
          <p>
            Vessels: <span className="font-mono text-parchment">{game.units.filter((u) => u.faction === 'player').length}</span>
          </p>
          <p>
            Victory points: <span className="font-mono text-parchment">{game.economy.victoryPoints}</span>
          </p>
          <p className="mt-2 text-foam/60">
            {selectedBuilding
              ? 'Tap a brass-highlighted soil tile on the isle to place your structure.'
              : 'Select a structure above, then tap the map to build.'}
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" role="tabpanel">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className={`flex min-h-[44px] select-none items-center gap-2 rounded-md border px-2 text-left transition-colors ${
                item.active
                  ? 'border-brass bg-brass/15 text-brass'
                  : item.affordable
                    ? 'border-rim/40 text-parchment hover:bg-rim/20'
                    : 'border-rim/20 text-foam/40'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{item.label}</span>
              <span className={`shrink-0 font-mono text-[10px] ${item.affordable ? 'text-brass' : 'text-danger/80'}`}>
                {formatSats(item.cost)}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onEndTurn}
        disabled={busy}
        className="flex min-h-[44px] shrink-0 select-none items-center justify-center gap-1.5 rounded-md bg-terra font-display text-xs font-bold uppercase tracking-widest text-parchment shadow-panel transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        <Wind className="h-4 w-4" aria-hidden /> {busy ? 'Charting…' : 'End Turn'}
      </button>
    </aside>
  );
}
