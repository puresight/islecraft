import { Flag, Hourglass, Coins, Users, Wheat, HeartPulse, Flame } from 'lucide-react';
import { EconomyState } from '@/types/game';
import { clampPercent, formatSats } from '@/utils/format';

interface HudProps {
  turn: number;
  economy: EconomyState;
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = max > 0 ? clampPercent((value / max) * 100) : 0;
  return (
    <div className="flex min-w-[72px] flex-col justify-center">
      <span className="text-[9px] font-medium uppercase tracking-widest text-foam/70">{label}</span>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-abyss">
        <div className={`h-full rounded-full transition-[width] duration-500 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Hud({ turn, economy }: HudProps) {
  const starving = economy.foodReserves < economy.population * 0.5;
  const mutinous = economy.unrestIndex >= 60;

  return (
    <header className="z-20 shrink-0 border-b border-rim bg-charcoal/95">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-terra shadow-inset">
            <Flag className="h-4 w-4 text-parchment" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="font-display text-xs font-bold tracking-wide text-parchment">Terra Corsairs</p>
            <p className="text-[9px] uppercase tracking-widest text-foam/60">Isle One · Round {turn}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1">
            <Hourglass className="h-3.5 w-3.5 text-foam/70" aria-hidden />
            <span className="font-mono text-xs font-semibold">R{turn}</span>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-brass" aria-hidden />
            <span className="font-mono text-xs font-semibold text-brass">{formatSats(economy.treasurySats)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-foam/70" aria-hidden />
            <span className="font-mono text-xs font-semibold">{economy.population.toLocaleString()}</span>
          </div>
          <Meter label="Food" value={economy.foodReserves} max={Math.max(economy.population * 2, 1)} tone={starving ? 'bg-danger' : 'bg-ok'} />
          <Meter label="Mortality" value={economy.mortalityRate} max={100} tone={economy.mortalityRate > 20 ? 'bg-danger' : 'bg-warn'} />
          <Meter label="Unrest" value={economy.unrestIndex} max={100} tone={mutinous ? 'bg-danger' : 'bg-warn'} />
          <div className="hidden items-center gap-1 md:flex">
            <HeartPulse className="h-3.5 w-3.5 text-foam/70" aria-hidden />
            <span className="font-mono text-xs font-semibold">
              {economy.population}/{economy.housingCapacity}
            </span>
          </div>
        </div>
      </div>

      {(starving || mutinous) && (
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 pb-1.5">
          {starving && (
            <p className="flex items-center gap-1.5 rounded bg-danger/15 px-2 py-0.5 text-[11px] text-danger animate-fade-up">
              <Wheat className="h-3 w-3" aria-hidden /> Food low — settlers starving
            </p>
          )}
          {mutinous && (
            <p className="flex items-center gap-1.5 rounded bg-danger/15 px-2 py-0.5 text-[11px] text-danger animate-fade-up">
              <Flame className="h-3 w-3" aria-hidden /> Mutiny imminent
            </p>
          )}
        </div>
      )}
    </header>
  );
}
