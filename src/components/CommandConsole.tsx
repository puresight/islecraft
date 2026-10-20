import { useCallback, useRef, useState } from 'react';
import { Wind, CloudLightning, CloudRain, Sun, Sprout, Sailboat, ScrollText, ChevronUp, ChevronDown, Flag, Hourglass, Coins, Users, Wheat, Flame, type LucideIcon } from 'lucide-react';
import { BuildingType, GameStateSnapshot, UnitType, BUILDING_SPEC, UNIT_SPEC } from '@/types/game';
import { BUILDING_ICON, UNIT_ICON } from '@/game/entityIcons';
import { clampPercent, formatSats } from '@/utils/format';
import { itemCost } from '@/utils/placementRules';
import type { CommandTab } from './commandTabs';

const TAB_META: Array<{ id: CommandTab; label: string; icon: LucideIcon }> = [
  { id: 'construct', label: 'Construct', icon: Sprout },
  { id: 'launch', label: 'Launch Fleet', icon: Sailboat },
  { id: 'status', label: 'Territory', icon: ScrollText },
];

export type TrayStage = 'peek' | 'default' | 'expanded';

const STAGE_ORDER: TrayStage[] = ['peek', 'default', 'expanded'];

const STAGE_HEIGHT: Record<TrayStage, string> = {
  peek: 'h-11',
  default: 'h-44',
  expanded: 'h-80 max-h-[42vh]',
};

interface CommandConsoleProps {
  tab: CommandTab;
  onTabChange: (tab: CommandTab) => void;
  game: GameStateSnapshot;
  selectedItem: BuildingType | UnitType | null;
  onSelectItem: (type: BuildingType | UnitType | null) => void;
  busy: boolean;
  onEndTurn: () => void;
  secondsLeft: number;
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

function buildCards(props: CommandConsoleProps): CardItem[] {
  const { tab, game, selectedItem, onSelectItem } = props;
  if (tab === 'construct') {
    return (Object.keys(BUILDING_SPEC) as BuildingType[]).map((type) => {
      const spec = BUILDING_SPEC[type];
      const Icon = BUILDING_ICON[type];
      return {
        key: type,
        label: spec.label,
        description: spec.effect,
        cost: spec.costSats,
        affordable: game.economy.treasurySats >= spec.costSats,
        active: selectedItem === type,
        onClick: () => onSelectItem(selectedItem === type ? null : type),
        icon: Icon,
      };
    });
  }
  if (tab === 'launch') {
    return (['FISHING_SCHOONER', 'PRIVATEER_SLOOP'] as UnitType[]).map((type) => {
      const cost = itemCost(type);
      const Icon = UNIT_ICON[type];
      return {
        key: type,
        label: UNIT_SPEC[type].label,
        description: UNIT_SPEC[type].description,
        cost,
        affordable: game.economy.treasurySats >= cost,
        active: selectedItem === type,
        onClick: () => onSelectItem(selectedItem === type ? null : type),
        icon: Icon,
      };
    });
  }
  return [];
}

function ForecastPanel({ game }: { game: GameStateSnapshot }) {
  const econ = game.economy;
  const storms = game.units.filter((u) => u.type === 'SQUALL' || u.type === 'TEMPEST').length;
  const foodBuffer = econ.foodReserves - Math.ceil(econ.population * 0.4);
  const foodTurns = foodBuffer >= 0 ? Math.floor(econ.foodReserves / Math.max(1, Math.ceil(econ.population * 0.4))) : 0;
  const stability = clampPercent(100 - clampPercent(econ.unrestIndex) - econ.mortalityRate * 0.5);

  return (
    <div className="flex h-full min-h-0 flex-col rounded border border-rim/50 bg-charcoal/70 p-2">
      <p className="shrink-0 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-foam/60">Intelligence & Status</p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        <div className="rounded-md border border-rim/40 bg-ocean/40 p-2">
          <p className="text-[10px] uppercase tracking-wide text-foam/60">Island Stability</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-abyss">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${stability >= 60 ? 'bg-ok' : stability >= 30 ? 'bg-warn' : 'bg-danger'}`}
              style={{ width: `${stability}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-xs text-parchment">{stability}% stable</p>
        </div>
        <div className="rounded-md border border-rim/40 bg-ocean/40 p-2">
          <p className="text-[10px] uppercase tracking-wide text-foam/60">Food Buffer</p>
          <p className="mt-1 font-mono text-xs text-parchment">
            {foodBuffer >= 0
              ? `Surplus for ~${foodTurns} turn${foodTurns === 1 ? '' : 's'} (${foodBuffer} after next harvest)`
              : `Deficit — famine risk (${foodBuffer})`}
          </p>
        </div>
        <div className="rounded-md border border-rim/40 bg-ocean/40 p-2">
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
        <div className="rounded-md border border-rim/40 bg-ocean/40 p-2 text-[11px] text-foam/80">
          <p>Structures: <span className="font-mono text-parchment">{game.buildings.filter((b) => b.faction === 'player').length}</span></p>
          <p>Vessels: <span className="font-mono text-parchment">{game.units.filter((u) => u.faction === 'player').length}</span></p>
          <p>Victory points: <span className="font-mono text-parchment">{econ.victoryPoints}</span></p>
        </div>
      </div>
    </div>
  );
}

function EndTurnButton({ busy, onEndTurn }: { busy: boolean; onEndTurn: () => void }) {
  return (
    <button
      type="button"
      onClick={onEndTurn}
      disabled={busy}
      className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-md bg-terra px-3 font-display text-[11px] font-bold uppercase tracking-widest text-parchment shadow-panel transition-transform active:scale-[0.98] disabled:opacity-50"
    >
      <Wind className="h-4 w-4" aria-hidden /> {busy ? 'Charting…' : 'End Turn'}
    </button>
  );
}

export function CommandConsole(props: CommandConsoleProps & { stage: TrayStage; onStageChange: (stage: TrayStage) => void }) {
  const { stage } = props;
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden border-t border-slate-700/60 bg-slate-950/85 shadow-2xl backdrop-blur-md transition-[height] duration-200 ease-out ${STAGE_HEIGHT[stage]}`}
    >
      <DrawerHandle {...props} />
      {stage !== 'peek' && <DangerBanners game={props.game} />}
      {stage === 'default' ? (
        <DefaultBody {...props} />
      ) : stage === 'expanded' ? (
        <ExpandedBody {...props} />
      ) : null}
    </div>
  );
}

function DrawerHandle({ stage, onStageChange, game, secondsLeft }: CommandConsoleProps & { stage: TrayStage; onStageChange: (s: TrayStage) => void }) {
  const track = useRef<{ id: number; startY: number; stage: TrayStage } | null>(null);

  const step = (dir: 1 | -1) =>
    onStageChange(STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, Math.max(0, STAGE_ORDER.indexOf(stage) + dir))]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      track.current = { id: e.pointerId, startY: e.clientY, stage };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [stage],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const t = track.current;
      if (!t || t.id !== e.pointerId) return;
      const dy = e.clientY - t.startY;
      const threshold = 36;
      if (dy < -threshold && t.stage !== 'expanded') {
        step(1);
        track.current = null;
      } else if (dy > threshold && t.stage !== 'peek') {
        step(-1);
        track.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stage, onStageChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (track.current?.id === e.pointerId) track.current = null;
  }, []);

  return (
    <div
      className="flex h-11 w-full shrink-0 touch-none select-none items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/90 px-4"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Zone 1 — identity: crest + round counter */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-terra shadow-inset" aria-hidden>
          <Flag className="h-3.5 w-3.5 text-parchment" />
        </span>
        <span className="hidden font-display text-[11px] font-bold tracking-wide text-parchment md:block">Isle of Red</span>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold text-foam/90">
          <Hourglass className="h-3.5 w-3.5 text-foam/70" aria-hidden /> Year 1781 · Turn {game.turn}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
            secondsLeft <= 10 ? 'bg-danger/20 text-danger' : 'bg-abyss/60 text-ok'
          }`}
          aria-label={`${secondsLeft} seconds remaining this turn`}
        >
          {formatClock(secondsLeft)}
        </span>
      </div>

      {/* Zone 2 — tactile drag handle, centered */}
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="h-1.5 w-14 cursor-pointer rounded-full bg-slate-600 transition-colors hover:bg-slate-400" />
      </div>

      {/* Zone 3 — economy + controls, right-justified */}
      <div className="flex min-w-0 items-center justify-end gap-2.5">
        <HeaderMetric icon={Coins} label="Sats" value={`₿ ${formatSats(game.economy.treasurySats)}`} tone="text-amber-400" />
        <HeaderMetric
          icon={Users}
          label="Pop"
          value={`${game.economy.population.toLocaleString()}/${game.economy.housingCapacity}`}
          tone="text-foam/90"
        />
        <FoodBadge game={game} />
        <button
          type="button"
          aria-label={stage === 'expanded' ? 'Collapse command deck' : 'Expand command deck'}
          onClick={() => step(stage === 'expanded' ? -1 : 1)}
          className="rounded p-1 text-foam/80 transition-colors hover:bg-slate-800 hover:text-parchment"
        >
          {stage === 'expanded' ? <ChevronDown className="h-5 w-5" aria-hidden /> : <ChevronUp className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function HeaderMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-label={`${label}: ${value}`}>
      <Icon className="h-3.5 w-3.5 text-foam/70" aria-hidden />
      <span className={`font-mono text-[11px] font-semibold ${tone}`}>{value}</span>
    </span>
  );
}

function FoodBadge({ game }: { game: GameStateSnapshot }) {
  const capacity = Math.max(game.economy.population * 2, 1);
  const pct = clampPercent(Math.round((game.economy.foodReserves / capacity) * 100));
  const tone =
    game.economy.foodReserves < game.economy.population * 0.5
      ? 'bg-danger/20 text-danger'
      : pct < 50
        ? 'bg-warn/20 text-warn'
        : 'bg-ok/20 text-ok';
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${tone}`}
      aria-label={`Food: ${pct} percent capacity`}
    >
      Food: {pct}%
    </span>
  );
}

function DangerBanners({ game }: { game: GameStateSnapshot }) {
  const starving = game.economy.foodReserves < game.economy.population * 0.5;
  const mutinous = game.economy.unrestIndex >= 60;
  if (!starving && !mutinous) return null;
  return (
    <div className="flex shrink-0 items-center gap-2 px-3 pb-1">
      {starving && (
        <p className="flex items-center gap-1.5 rounded bg-danger/15 px-2 py-0.5 text-[10px] text-danger animate-fade-up">
          <Wheat className="h-3 w-3" aria-hidden /> Food low — settlers starving
        </p>
      )}
      {mutinous && (
        <p className="flex items-center gap-1.5 rounded bg-danger/15 px-2 py-0.5 text-[10px] text-danger animate-fade-up">
          <Flame className="h-3 w-3" aria-hidden /> Mutiny imminent
        </p>
      )}
    </div>
  );
}

function DefaultBody(props: CommandConsoleProps & { stage: TrayStage; onStageChange: (s: TrayStage) => void }) {
  const { tab, onTabChange } = props;
  const cards = buildCards(props).slice(0, 6);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex gap-1.5" role="tablist" aria-label="Command categories">
          {TAB_META.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTabChange(id)}
              className={`flex min-h-[36px] items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-bold transition-colors ${
                tab === id ? 'border-brass/60 bg-brass/15 text-brass' : 'border-rim/40 text-foam/80 hover:bg-rim/20'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
            </button>
          ))}
        </div>
        <EndTurnButton busy={props.busy} onEndTurn={props.onEndTurn} />
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            disabled={!card.affordable}
            className={`flex min-h-[52px] flex-col items-start justify-center gap-0.5 rounded-md border p-2 text-left transition-colors ${
              card.active
                ? 'border-brass bg-brass/15'
                : card.affordable
                  ? 'border-rim/40 hover:border-foam/40 hover:bg-rim/15'
                  : 'border-rim/20 opacity-50'
            }`}
          >
            <span className="flex w-full items-center justify-between gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-bold text-parchment">
                <card.icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> {card.label}
              </span>
              <span className={`shrink-0 font-mono text-[10px] ${card.affordable ? 'text-brass' : 'text-danger/80'}`}>
                {formatSats(card.cost)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ExpandedBody(props: CommandConsoleProps & { stage: TrayStage; onStageChange: (s: TrayStage) => void }) {
  const { tab, onTabChange, game, selectedItem } = props;
  const cards = buildCards(props);
  return (
    <div className="flex min-h-0 flex-1 gap-3 px-3 pb-2">
      <div className="flex h-full min-h-0 flex-col rounded border border-rim/50 bg-charcoal/70 p-2" role="tablist" aria-label="Command categories">
        <p className="shrink-0 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-foam/60">Command</p>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          {TAB_META.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTabChange(id)}
              className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-md border px-2.5 text-left text-xs font-bold transition-colors ${
                tab === id ? 'border-brass/60 bg-brass/15 text-brass' : 'border-rim/40 text-foam/80 hover:bg-rim/20'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>
        <EndTurnButton busy={props.busy} onEndTurn={props.onEndTurn} />
      </div>

      <div className="flex h-full min-h-0 flex-1 flex-col rounded border border-rim/50 bg-charcoal/70 p-2" role="tabpanel">
        <p className="shrink-0 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-foam/60">
          {tab === 'construct' ? 'Construction Options' : tab === 'launch' ? 'Fleet Commissioning' : 'Territory'}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === 'status' ? (
            <div className="grid h-full place-items-center rounded-lg border border-rim/50 bg-ocean/30 p-4 text-center">
              <p className="text-sm text-foam/80">
                {selectedItem
                  ? 'Tap an emerald-highlighted tile on your isle to place the structure.'
                  : 'Pick a category on the left to review construction or fleet options. Territory intelligence lives on the right.'}
              </p>
            </div>
          ) : (
            <div className="grid auto-rows-min grid-cols-2 gap-2 xl:grid-cols-3">
              {cards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={card.onClick}
                  disabled={!card.affordable}
                  className={`flex min-h-[84px] flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors ${
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
      </div>

      <ForecastPanel game={game} />
    </div>
  );
}
