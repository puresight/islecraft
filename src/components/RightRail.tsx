import { Wind, Newspaper, type LucideIcon } from 'lucide-react';
import { BuildingType, GameStateSnapshot, UnitType } from '@/types/game';
import { BUILDING_ICON, UNIT_ICON } from '@/game/entityIcons';
import { BUILDING_BLUEPRINTS, UNIT_BLUEPRINTS, VESSEL_BLUEPRINTS } from '@/constants/blueprints';
import { formatSats } from '@/utils/format';
import type { CommandTab } from './commandTabs';
import type { BuildableVesselType } from '@/constants/blueprints';

interface RightRailProps {
  tab: CommandTab;
  onTabChange: (tab: CommandTab) => void;
  game: GameStateSnapshot;
  selectedItem: BuildingType | UnitType | null;
  onSelectItem: (type: BuildingType | UnitType | null) => void;
  busy: boolean;
  onEndTurn: () => void;
  /** Timestamp until which the newspaper button flashes (fresh dispatch ready). */
  gazetteFlashUntil: number;
  onOpenGazette: () => void;
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

export function RightRail({ tab, onTabChange, game, selectedItem, onSelectItem, busy, onEndTurn, gazetteFlashUntil, onOpenGazette }: RightRailProps) {
  const items: ActionItem[] =
    tab === 'construct'
      ? (Object.keys(BUILDING_BLUEPRINTS) as BuildingType[]).map((type) => {
          const spec = BUILDING_BLUEPRINTS[type];
          const Icon = BUILDING_ICON[type];
          return {
            key: type,
            label: spec.label,
            cost: spec.costSats,
            affordable: game.economy.treasurySats >= spec.costSats,
            active: selectedItem === type,
            disabled: game.economy.treasurySats < spec.costSats,
            onClick: () => onSelectItem(selectedItem === type ? null : type),
            icon: Icon,
          };
        })
      : tab === 'launch'
        ? (['FISHING_SCHOONER', 'PRIVATEER_SLOOP'] as BuildableVesselType[]).map((type) => {
            const cost = VESSEL_BLUEPRINTS[type].costSats;
            const Icon = UNIT_ICON[type];
            return {
              key: type,
              label: UNIT_BLUEPRINTS[type].label,
              cost,
              affordable: game.economy.treasurySats >= cost,
              active: selectedItem === type,
              disabled: game.economy.treasurySats < cost,
              onClick: () => onSelectItem(selectedItem === type ? null : type),
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
            {selectedItem
              ? 'Tap an emerald-highlighted tile on the isle to place your structure.'
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

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          aria-label="Open Settlement Report"
          onClick={onOpenGazette}
          className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md border border-rim/50 font-display text-xs font-bold uppercase tracking-widest transition-colors hover:bg-rim/20 ${
            Date.now() < gazetteFlashUntil ? 'animate-pulse border-amber-400 text-amber-400' : 'text-foam'
          }`}
        >
          <Newspaper className="h-4 w-4" aria-hidden />
          Dispatch
          {Date.now() < gazetteFlashUntil && (
            <span
              className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.6)]"
              aria-hidden
            />
          )}
        </button>
      </div>

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
