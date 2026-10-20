import { Wind, CloudLightning, CloudRain, Sun, Sprout, Sailboat, ScrollText, type LucideIcon } from 'lucide-react';
import { BuildingType, GameStateSnapshot, UnitType, BUILDING_SPEC, UNIT_SPEC } from '@/types/game';
import { BUILDING_ICON, UNIT_ICON } from '@/game/entityIcons';
import { clampPercent, formatSats } from '@/utils/format';
import type { CommandTab } from './commandTabs';

const LAUNCH_COST: Partial<Record<UnitType, number>> = {
  FISHING_SCHOONER: 600,
  PRIVATEER_SLOOP: 1400,
};

const TAB_META: Array<{ id: CommandTab; label: string; icon: LucideIcon }> = [
  { id: 'construct', label: 'Construct Infrastructure', icon: Sprout },
  { id: 'launch', label: 'Launch Fleet', icon: Sailboat },
  { id: 'status', label: 'Territory Orders', icon: ScrollText },
];

interface CommandConsoleProps {
  tab: CommandTab;
  onTabChange: (tab: CommandTab) => void;
  game: GameStateSnapshot;
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onLaunch: (type: UnitType) => void;
  busy: boolean;
  onEndTurn: () => void;
}

interface CardItem {
  key: string;
  label: string;
  description: string;
  cost: number;
  affordable: boolean;
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
}

function ForecastPanel({ game }: { game: GameStateSnapshot }) {
  const econ = game.economy;
  const storms = game.units.filter((u) => u.type === 'SQUALL' || u.type === 'TEMPEST').length;
  const foodBuffer = econ.foodReserves - Math.ceil(econ.population * 0.4);
  const foodTurns = foodBuffer >= 0 ? Math.floor(econ.foodReserves / Math.max(1, Math.ceil(econ.population * 0.4))) : 0;
  const unrest = clampPercent(econ.unrestIndex);
  const stability = clampPercent(100 - unrest - econ.mortalityRate * 0.5);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border border-rim/50 bg-ocean/30 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-foam/60">Intelligence & Status</p>

      <div className="rounded-md border border-rim/40 bg-charcoal/60 p-2">
        <p className="text-[10px] uppercase tracking-wide text-foam/60">Island Stability</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-abyss">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stability >= 60 ? 'bg-ok' : stability >= 30 ? 'bg-warn' : 'bg-danger'}`}
            style={{ width: `${stability}%` }}
          />
        </div>
        <p className="mt-1 font-mono text-xs text-parchment">{stability}% stable</p>
      </div>

      <div className="rounded-md border border-rim/40 bg-charcoal/60 p-2">
        <p className="text-[10px] uppercase tracking-wide text-foam/60">Food Buffer</p>
        <p className="mt-1 font-mono text-xs text-parchment">
          {foodBuffer >= 0
            ? `Surplus for ~${foodTurns} turn${foodTurns === 1 ? '' : 's'} (${foodBuffer} after next harvest)`
            : `Deficit — famine risk (${foodBuffer})`}
        </p>
      </div>

      <div className="rounded-md border border-rim/40 bg-charcoal/60 p-2">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foam/60">
          {storms >= 2 ? <CloudLightning className="h-3.5 w-3.5 text-warn" aria-hidden /> : storms === 1 ? <CloudRain className="h-3.5 w-3.5 text-warn" aria-hidden /> : <Sun className="h-3.5 w-3.5 text-ok" aria-hidden />}
          Seasonal Forecast
        </p>
        <p className="mt-1 text-xs text-parchment">
          {storms >= 2
            ? 'Heavy storm systems massing over the channel.'
            : storms === 1
              ? 'A squall is crossing the channel — expect delays.'
              : 'Fair winds across both isles.'}
        </p>
      </div>

      <div className="mt-auto rounded-md border border-rim/40 bg-charcoal/60 p-2 text-[11px] text-foam/80">
        <p>Structures: <span className="font-mono text-parchment">{game.buildings.filter((b) => b.faction === 'player').length}</span></p>
        <p>Vessels: <span className="font-mono text-parchment">{game.units.filter((u) => u.faction === 'player').length}</span></p>
        <p>Victory points: <span className="font-mono text-parchment">{econ.victoryPoints}</span></p>
      </div>
    </div>
  );
}

export function CommandConsole({ tab, onTabChange, game, selectedBuilding, onSelectBuilding, onLaunch, busy, onEndTurn }: CommandConsoleProps) {
  const cards: CardItem[] =
    tab === 'construct'
      ? (Object.keys(BUILDING_SPEC) as BuildingType[]).map((type) => {
          const spec = BUILDING_SPEC[type];
          const Icon = BUILDING_ICON[type];
          return {
            key: type,
            label: spec.label,
            description: spec.effect,
            cost: spec.costSats,
            affordable: game.economy.treasurySats >= spec.costSats,
            active: selectedBuilding === type,
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
              description: UNIT_SPEC[type].description,
              cost,
              affordable: game.economy.treasurySats >= cost,
              active: false,
              onClick: () => onLaunch(type),
              icon: Icon,
            };
          })
        : [];

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(150px,1fr)_2.4fr_minmax(180px,1.1fr)] gap-2 overflow-hidden">
      {/* Left column: action selection */}
      <div className="flex min-h-0 flex-col gap-1.5" role="tablist" aria-label="Command categories">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foam/60">Command</p>
        {TAB_META.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
            className={`flex min-h-[44px] select-none items-center gap-2 rounded-md border px-2.5 text-left text-xs font-bold transition-colors ${
              tab === id ? 'border-brass/60 bg-brass/15 text-brass' : 'border-rim/40 text-foam/80 hover:bg-rim/20'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="leading-tight">{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onEndTurn}
          disabled={busy}
          className="mt-auto flex min-h-[48px] select-none items-center justify-center gap-1.5 rounded-md bg-terra font-display text-xs font-bold uppercase tracking-widest text-parchment shadow-panel transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Wind className="h-4 w-4" aria-hidden /> {busy ? 'Charting…' : 'End Turn'}
        </button>
      </div>

      {/* Center column: active options grid */}
      <div className="min-h-0 overflow-y-auto" role="tabpanel">
        {tab === 'status' ? (
          <div className="grid h-full place-items-center rounded-lg border border-rim/50 bg-ocean/30 p-4 text-center">
            <p className="text-sm text-foam/80">
              {selectedBuilding
                ? 'Tap a brass-highlighted soil tile on your isle to place the structure.'
                : 'Pick a category on the left to review construction or fleet options. Territory intelligence lives on the right.'}
            </p>
          </div>
        ) : (
          <div className="grid h-full auto-rows-min grid-cols-2 gap-2 xl:grid-cols-3">
            {cards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={card.onClick}
                disabled={!card.affordable}
                className={`flex min-h-[84px] select-none flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors ${
                  card.active
                    ? 'border-brass bg-brass/15'
                    : card.affordable
                      ? 'border-rim/40 hover:border-foam/40 hover:bg-rim/15'
                      : 'border-rim/20 opacity-50'
                }`}
              >
                <span className="flex w-full items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-parchment">
                    <card.icon className="h-4 w-4 shrink-0" aria-hidden /> {card.label}
                  </span>
                  <span className={`shrink-0 font-mono text-[10px] font-semibold ${card.affordable ? 'text-brass' : 'text-danger/80'}`}>
                    {formatSats(card.cost)}
                  </span>
                </span>
                <span className="text-[10px] leading-snug text-foam/75">{card.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right column: intelligence & status */}
      <ForecastPanel game={game} />
    </section>
  );
}
