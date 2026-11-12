import { useState } from 'react';
import { Anchor, Flag, Hourglass, Map as MapIcon, MoveHorizontal, ScrollText, Settings2, Ship, Smartphone, Sailboat } from 'lucide-react';
import type { PlayerSettings } from '@/types/game';
import { MAP_DEFINITIONS, MAP_ORDER } from '@/constants/mapData';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export type VoyageMode = 'solo' | 'duel';

interface TitleScreenProps {
  hasSavedRun: boolean;
  settings: PlayerSettings;
  onChangeSettings: (next: PlayerSettings) => void;
  onCommence: (mode: VoyageMode) => void;
  onResume: () => void;
}

const TIMER_SPEEDS: PlayerSettings['turnSeconds'][] = [45, 60, 90];
const CAMPAIGN_LENGTHS: PlayerSettings['campaignTurns'][] = [10, 12, 15];

function Segmented<T extends number>({
  options,
  value,
  onChange,
  label,
  suffix,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  label: React.ReactNode;
  suffix: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-widest text-foam/70">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-rim/60 bg-abyss/50">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={value === opt}
            className={`min-h-[36px] px-3 font-mono text-[12px] font-bold transition-colors ${
              value === opt ? 'bg-brass text-abyss' : 'text-foam/80 hover:bg-ocean/60'
            }`}
          >
            {opt}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

function PortraitGuard() {
  return (
    <main className="flex h-full w-full flex-col items-center justify-center gap-5 bg-charcoal px-6 text-center">
      <Smartphone className="h-10 w-10 animate-sway text-brass" aria-hidden />
      <h1 className="font-display text-xl font-bold tracking-[0.15em] text-parchment">Heave To &amp; Turn the Wheel</h1>
      <p className="max-w-xs font-display text-sm uppercase tracking-[0.2em] leading-relaxed text-foam/80">
        Orient Device to Landscape to Review the Admiralty Charts
      </p>
      <div className="flex items-center gap-2 text-foam/50" aria-hidden>
        <MoveHorizontal className="h-5 w-5" />
        <span className="h-px w-16 bg-foam/30" />
      </div>
    </main>
  );
}

function MapSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (mapId: string) => void;
}) {
  const index = Math.max(0, MAP_ORDER.indexOf(value as never));
  const active = MAP_DEFINITIONS[MAP_ORDER[index]];
  const shift = (dir: 1 | -1) => {
    const next = (index + dir + MAP_ORDER.length) % MAP_ORDER.length;
    onChange(MAP_ORDER[next]);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-foam/70">
        <MapIcon className="h-3.5 w-3.5" aria-hidden /> Chart
      </span>
      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          type="button"
          aria-label="Previous chart"
          onClick={() => shift(-1)}
          className="min-h-[36px] rounded-md border border-rim/60 bg-abyss/50 px-2 font-mono text-[13px] font-bold text-foam/80 hover:bg-ocean/60"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-display text-[13px] font-bold text-parchment">{active.name}</p>
          <p className="truncate text-[10px] text-foam/60">{active.tagline}</p>
        </div>
        <button
          type="button"
          aria-label="Next chart"
          onClick={() => shift(1)}
          className="min-h-[36px] rounded-md border border-rim/60 bg-abyss/50 px-2 font-mono text-[13px] font-bold text-foam/80 hover:bg-ocean/60"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: VoyageMode;
  onChange: (mode: VoyageMode) => void;
}) {
  const options: Array<{ id: VoyageMode; label: string; icon: typeof Ship }> = [
    { id: 'solo', label: 'Solo Command vs. Governor AI (Blue)', icon: Ship },
    { id: 'duel', label: 'Two-Player Pass & Play Duel', icon: Sailboat },
  ];
  return (
    <div className="flex overflow-hidden rounded-md border border-rim/60 bg-abyss/50">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={mode === id}
          className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
            mode === id ? 'bg-brass text-abyss' : 'text-foam/80 hover:bg-ocean/60'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

export function TitleScreen({ hasSavedRun, settings, onChangeSettings, onCommence, onResume }: TitleScreenProps) {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const [mode, setMode] = useState<VoyageMode>('solo');

  if (isPortrait) {
    return <PortraitGuard />;
  }

  return (
    <main className="flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-charcoal px-4 py-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        {/* Masthead */}
        <header className="flex flex-col items-center text-center">
          <Anchor className="h-8 w-8 text-brass" aria-hidden />
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[0.18em] text-parchment">ISLECRAFT</h1>
          <p className="mt-2 font-display text-[11px] uppercase tracking-[0.3em] text-foam/70">
            An Age of Sail Territory Chronicle
          </p>
        </header>

        {/* Dual-crest motif */}
        <div className="flex items-center gap-4" aria-hidden>
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#C84630]/70 bg-[#C84630]/15">
            <Flag className="h-5 w-5 text-[#E06A50]" />
          </span>
          <span className="h-px w-10 bg-gradient-to-r from-[#C84630]/60 via-foam/30 to-[#5E93A3]/60" />
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#5E93A3]/70 bg-[#5E93A3]/15">
            <Flag className="h-5 w-5 text-[#8FC0CE]" />
          </span>
        </div>
        <p className="-mt-3 text-[11px] uppercase tracking-[0.25em] text-foam/50">Red Faction vs Blue Faction</p>

        {/* Mode options */}
        <div className="flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onCommence(mode)}
            className="flex min-h-[52px] items-center gap-3 rounded-lg border border-brass/50 bg-gradient-to-r from-ocean/80 to-abyss/60 px-4 text-left shadow-panel transition-transform hover:border-brass active:scale-[0.99]"
          >
            <Ship className="h-5 w-5 shrink-0 text-brass" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="font-display text-sm font-bold uppercase tracking-widest text-parchment">
                {mode === 'solo' ? 'Commence Solo Voyage' : 'Commence Duel Voyage'}
              </span>
              <span className="text-[11px] text-foam/70">
                {mode === 'solo' ? 'Red vs. Governor AI (Blue)' : 'Two-player local turn rotation'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onCommence('duel')}
            className="flex min-h-[52px] items-center gap-3 rounded-lg border border-rim/60 bg-ocean/50 px-4 text-left transition-transform hover:border-brass/60 active:scale-[0.99]"
          >
            <Sailboat className="h-5 w-5 shrink-0 text-foam" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="font-display text-sm font-bold uppercase tracking-widest text-parchment">
                Pass-and-Play Duel
              </span>
              <span className="text-[11px] text-foam/70">Two-player local turn rotation</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onResume}
            disabled={!hasSavedRun}
            className="flex min-h-[52px] items-center gap-3 rounded-lg border border-rim/60 bg-ocean/50 px-4 text-left transition-transform enabled:hover:border-brass/60 enabled:active:scale-[0.99] disabled:opacity-40"
          >
            <ScrollText className="h-5 w-5 shrink-0 text-foam" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="font-display text-sm font-bold uppercase tracking-widest text-parchment">
                Resume Existing Expedition
              </span>
              <span className="text-[11px] text-foam/70">
                {hasSavedRun ? 'Your saved campaign awaits' : 'No unfinished expedition found'}
              </span>
            </span>
          </button>
        </div>

        {/* Settings */}
        <section className="w-full rounded-lg border border-rim/50 bg-abyss/40 p-4" aria-label="Voyage settings">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-foam/70">
            <Settings2 className="h-3.5 w-3.5" aria-hidden /> Voyage Settings
          </p>
          <div className="flex flex-col gap-3">
            <ModeToggle mode={mode} onChange={setMode} />
            <MapSelector value={settings.mapId} onChange={(mapId) => onChangeSettings({ ...settings, mapId })} />
            <Segmented
              label={<span className="flex items-center gap-1.5"><Hourglass className="h-3.5 w-3.5" aria-hidden /> Turn timer</span>}
              options={TIMER_SPEEDS}
              value={settings.turnSeconds}
              onChange={(turnSeconds) => onChangeSettings({ ...settings, turnSeconds })}
              suffix="s"
            />
            <Segmented
              label="Campaign length"
              options={CAMPAIGN_LENGTHS}
              value={settings.campaignTurns}
              onChange={(campaignTurns) => onChangeSettings({ ...settings, campaignTurns })}
              suffix=" turns"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
