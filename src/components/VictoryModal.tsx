import { Award, Coins, Flag, Ship, Swords, Users } from 'lucide-react';

export interface VictoryStats {
  peakPopulation: number;
  finalTreasurySats: number;
  buildingCount: number;
  raidersSunk: number;
  finalScore: number;
  rank: string;
  rankFlavor: string;
}

interface VictoryModalProps {
  stats: VictoryStats;
  turnsSurvived: number;
  onNewVoyage: () => void;
}

const RANK_TIERS = [
  { min: 150, rank: 'Sovereign Maritime Commonwealth', flavor: 'Master of the Indies' },
  { min: 100, rank: 'Prosperous Royal Colony', flavor: 'The Crown sends its compliments.' },
  { min: 50, rank: 'Struggling Outpost', flavor: 'Barely holding the beachhead.' },
  { min: 0, rank: 'Abandoned Settlement', flavor: 'The palms reclaim what was built.' },
];

export function rankForScore(score: number): { rank: string; flavor: string } {
  const tier = RANK_TIERS.find((t) => score >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1];
  return { rank: tier.rank, flavor: tier.flavor };
}

export function scoreForCampaign(
  population: number,
  treasurySats: number,
  buildingCount: number,
  raidersSunk: number,
): number {
  return (
    Math.floor(population / 100) +
    Math.floor(treasurySats / 50) +
    buildingCount * 10 +
    raidersSunk * 15
  );
}

export function VictoryModal({ stats, turnsSurvived, onNewVoyage }: VictoryModalProps) {
  const rows: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    {
      icon: <Users className="h-3.5 w-3.5" aria-hidden />,
      label: 'Peak Population',
      value: stats.peakPopulation.toLocaleString(),
    },
    {
      icon: <Coins className="h-3.5 w-3.5" aria-hidden />,
      label: 'Final Treasury',
      value: `${stats.finalTreasurySats.toLocaleString()} ₿`,
    },
    {
      icon: <Flag className="h-3.5 w-3.5" aria-hidden />,
      label: 'Surviving Structures',
      value: String(stats.buildingCount),
    },
    {
      icon: <Swords className="h-3.5 w-3.5" aria-hidden />,
      label: 'Naval Triumphs',
      value: String(stats.raidersSunk),
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#16262E]/85 p-3 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-[#D4AF37]/70 bg-[#D8C596] shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Campaign ledger of history"
      >
        <header className="border-b-2 border-[#B85D3D]/40 px-5 pt-5 pb-4 text-center">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-[#B85D3D]">
            The Ledger of History
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-abyss">Isle of Red</h2>
          <p className="mt-1 text-[12px] text-abyss/70">
            {turnsSurvived} turns sailed · Final score{' '}
            <span className="font-mono font-bold text-[#B85D3D]">{stats.finalScore}</span>
          </p>
        </header>

        <div className="px-5 py-4">
          <div className="rounded-md border border-[#D4AF37]/60 bg-abyss/5 px-4 py-3 text-center">
            <Award className="mx-auto h-6 w-6 text-[#B85D3D]" aria-hidden />
            <p className="mt-1 font-display text-base font-bold text-abyss">{stats.rank}</p>
            <p className="text-[12px] text-abyss/70">{stats.rankFlavor}</p>
          </div>

          <table className="mt-4 w-full text-left text-[13px]">
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-abyss/15">
                  <th scope="row" className="py-1.5 font-medium text-abyss/70">
                    <span className="flex items-center gap-2">
                      {row.icon}
                      {row.label}
                    </span>
                  </th>
                  <td className="py-1.5 text-right font-mono font-bold text-abyss">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="border-t border-abyss/20 px-5 pb-4 pt-3">
          <button
            type="button"
            onClick={onNewVoyage}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-[#B85D3D] px-5 text-sm font-bold uppercase tracking-widest text-parchment shadow-panel transition-transform hover:brightness-110 active:scale-[0.98]"
          >
            <Ship className="h-4 w-4" aria-hidden /> Commence New Voyage
          </button>
        </footer>
      </div>
    </div>
  );
}
