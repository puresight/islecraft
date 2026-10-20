import { Wind, RotateCw, AlertTriangle } from 'lucide-react';
import { BuildingType, GameStateSnapshot, UnitType } from '@/types/game';
import { BUILDING_SPEC, UNIT_SPEC } from '@/types/game';
import { formatSats } from '@/utils/format';
import { BUILDING_ICON, UNIT_ICON } from '@/game/entityIcons';
import { CommandBar, CommandTab } from '@/components/CommandBar';
import { TurnReport } from '@/game/turnEngine';

interface BottomDockProps {
  tab: CommandTab;
  onTabChange: (tab: CommandTab) => void;
  game: GameStateSnapshot;
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onLaunch: (type: UnitType) => void;
  lastReport: TurnReport | null;
  busy: boolean;
  onEndTurn: () => void;
  onRestart: () => void;
}

const LAUNCH_COST: Partial<Record<UnitType, number>> = {
  FISHING_SCHOONER: 600,
  PRIVATEER_SLOOP: 1400,
};

export function BottomDock(props: BottomDockProps) {
  const { tab, onTabChange, game, selectedBuilding, onSelectBuilding, onLaunch, lastReport, busy, onEndTurn, onRestart } = props;

  if (game.phase === 'ended') {
    return (
      <footer className="flex shrink-0 items-center justify-center gap-4 border-t border-rim bg-charcoal px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm text-foam">
          <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />
          The colony fell after {game.turn} rounds · {formatSats(game.economy.treasurySats)} · {game.economy.victoryPoints} VP
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="flex min-h-[40px] items-center gap-2 rounded-md bg-brass px-4 text-xs font-bold uppercase tracking-widest text-abyss shadow-panel transition-transform active:scale-[0.98]"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden /> New Voyage
        </button>
      </footer>
    );
  }

  const actionable =
    tab === 'construct'
      ? (Object.keys(BUILDING_SPEC) as BuildingType[]).map((type) => {
          const spec = BUILDING_SPEC[type];
          const affordable = game.economy.treasurySats >= spec.costSats;
          const Icon = BUILDING_ICON[type];
          return {
            key: type,
            label: spec.label,
            cost: spec.costSats,
            affordable,
            active: selectedBuilding === type,
            disabled: !affordable,
            onClick: () => onSelectBuilding(selectedBuilding === type ? null : type),
            icon: <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />,
          };
        })
      : tab === 'launch'
        ? (['FISHING_SCHOONER', 'PRIVATEER_SLOOP'] as UnitType[]).map((type) => {
            const cost = LAUNCH_COST[type] ?? 0;
            const affordable = game.economy.treasurySats >= cost;
            const Icon = UNIT_ICON[type];
            return {
              key: type,
              label: UNIT_SPEC[type].label,
              cost,
              affordable,
              active: false,
              disabled: !affordable,
              onClick: () => onLaunch(type),
              icon: <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />,
            };
          })
        : null;

  return (
    <footer className="shrink-0 border-t border-rim bg-charcoal px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
        <CommandBar active={tab} onChange={onTabChange} />

        <div className="h-8 w-px shrink-0 bg-rim/50" aria-hidden />

        {actionable ? (
          <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto" role="tabpanel">
            {actionable.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex min-h-[44px] select-none items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-[11px] font-semibold transition-colors ${
                  action.active
                    ? 'border-brass bg-brass/15 text-brass'
                    : action.affordable
                      ? 'border-rim/40 text-parchment hover:bg-rim/20'
                      : 'border-rim/20 text-foam/40'
                }`}
              >
                {action.icon}
                <span className="truncate">{action.label}</span>
                <span className={`font-mono text-[10px] ${action.affordable ? 'text-brass' : 'text-danger/80'}`}>
                  ({formatSats(action.cost)})
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="min-w-0 flex-1 overflow-x-auto text-[11px] leading-snug text-foam/85" role="tabpanel">
            {lastReport ? (
              <span className="flex items-center gap-3 whitespace-nowrap">
                <span>Food <span className="font-mono text-ok">+{lastReport.foodProduced}</span> / <span className="font-mono text-danger">−{lastReport.foodConsumed}</span></span>
                <span>Income <span className="font-mono text-brass">+{lastReport.satsEarned} sats</span></span>
                <span>Settlers <span className="font-mono">{lastReport.populationChange >= 0 ? `+${lastReport.populationChange}` : lastReport.populationChange}</span></span>
                {lastReport.events.length > 0 && (
                  <span className="text-warn">{lastReport.events[lastReport.events.length - 1]}</span>
                )}
              </span>
            ) : (
              <span className="text-foam/60">End a turn to receive the harbor report.</span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onEndTurn}
          disabled={busy}
          className="flex min-h-[44px] shrink-0 select-none items-center gap-1.5 rounded-md bg-terra px-3.5 font-display text-xs font-bold uppercase tracking-widest text-parchment shadow-panel transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Wind className="h-4 w-4" aria-hidden /> {busy ? 'Charting…' : 'End Turn'}
        </button>
      </div>
    </footer>
  );
}
