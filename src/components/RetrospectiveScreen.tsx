import { useEffect, useState } from 'react';
import { Archive, Award, Coins, Flag, Ship, Swords, Users, Wheat } from 'lucide-react';
import type { ChronicleEntry, VitalSnapshot } from '@/types/game';
import { VitalsCharts } from '@/components/VitalsCharts';

export interface RetrospectiveStats {
  outcome: 'victory' | 'defeat';
  finalTreasurySats: number;
  peakPopulation: number;
  foodReserves: number;
  raidersSunk: number;
  buildingCount: number;
  finalScore: number;
  rank: string;
  rankFlavor: string;
  chronicle: ChronicleEntry[];
  history: VitalSnapshot[];
}

interface RetrospectiveScreenProps {
  stats: RetrospectiveStats;
  turnsSurvived: number;
  onSaveArchives: () => Promise<void>;
  onReturnToTitle: () => void;
}

export function RetrospectiveScreen({ stats, turnsSurvived, onSaveArchives, onReturnToTitle }: RetrospectiveScreenProps) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [stats]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveArchives();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const ledger: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    { icon: <Coins className="h-3.5 w-3.5" aria-hidden />, label: 'Final Bitcoin Treasury', value: `${stats.finalTreasurySats.toLocaleString()} ₿` },
    { icon: <Users className="h-3.5 w-3.5" aria-hidden />, label: 'Peak Census', value: stats.peakPopulation.toLocaleString() },
    { icon: <Wheat className="h-3.5 w-3.5" aria-hidden />, label: 'Agricultural Reserves', value: stats.foodReserves.toLocaleString() },
    { icon: <Swords className="h-3.5 w-3.5" aria-hidden />, label: 'Corsairs Sunk', value: String(stats.raidersSunk) },
    { icon: <Flag className="h-3.5 w-3.5" aria-hidden />, label: 'Structures Standing', value: String(stats.buildingCount) },
  ];

  return (
    <main className="flex h-full w-full items-start justify-center overflow-y-auto bg-charcoal px-3 py-6">
      <div className="w-full max-w-md rounded-lg border-2 border-brass/70 bg-parchment shadow-panel">
        <header className="border-b-2 border-terra/40 px-5 pb-4 pt-5 text-center">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-terra">
            Historical Retrospective
          </p>
          <h1 className="mt-1 font-display text-xl font-bold text-abyss">The Chronicle of Twin Reaches</h1>
          <p className="mt-1 text-[12px] text-abyss/70">
            {turnsSurvived} turns sailed · Final score{' '}
            <span className="font-mono font-bold text-terra">{stats.finalScore}</span>
          </p>
        </header>

        <div className="px-5 py-4">
          {/* Sovereign Assessment */}
          <div className="rounded-md border border-brass/60 bg-abyss/5 px-4 py-3 text-center">
            <Award className="mx-auto h-6 w-6 text-terra" aria-hidden />
            <p className="mt-1 font-display text-base font-bold text-abyss">{stats.rank}</p>
            <p className="text-[12px] text-abyss/70">{stats.rankFlavor}</p>
          </div>

          {/* Hindsight Ledger */}
          <h2 className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em] text-abyss/60">Hindsight Ledger</h2>
          <table className="mt-2 w-full text-left text-[13px]">
            <tbody>
              {ledger.map((row) => (
                <tr key={row.label} className="border-b border-abyss/15">
                  <th scope="row" className="py-1.5 font-medium text-abyss/70">
                    <span className="flex items-center gap-2">{row.icon}{row.label}</span>
                  </th>
                  <td className="py-1.5 text-right font-mono font-bold text-abyss">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Settlement vitals charts */}
          <VitalsCharts history={stats.history} />

          {/* Chronicle log */}
          <h2 className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em] text-abyss/60">Chronicle of Events</h2>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1 text-[12px] text-abyss/85">
            {stats.chronicle.length === 0 && <li className="italic text-abyss/50">The scribes recorded little of note.</li>}
            {stats.chronicle.map((entry, i) => (
              <li key={`${entry.turn}-${i}`} className="flex gap-2 border-b border-abyss/10 pb-1.5 last:border-0">
                <span className="shrink-0 font-mono font-bold text-terra">Year {entry.year}</span>
                <span>{entry.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="flex flex-col gap-2 border-t border-abyss/20 px-5 pb-4 pt-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saved || saving}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-terra px-5 text-sm font-bold uppercase tracking-widest text-parchment shadow-panel transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            <Archive className="h-4 w-4" aria-hidden />
            {saved ? 'Archived for Posterity' : saving ? 'Committing…' : 'Save to Archives'}
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border-2 border-abyss/40 bg-transparent px-5 text-sm font-bold uppercase tracking-widest text-abyss transition-transform hover:bg-abyss/10 active:scale-[0.98]"
          >
            <Ship className="h-4 w-4" aria-hidden /> Return to Title
          </button>
        </footer>
      </div>
    </main>
  );
}
