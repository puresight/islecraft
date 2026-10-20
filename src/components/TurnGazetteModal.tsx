import { AlertTriangle, Coins, Home, Scale, Sprout, Users } from 'lucide-react';
import type { TurnAuditReport } from '@/utils/economyEngine';

interface TurnGazetteModalProps {
  audit: TurnAuditReport;
  onRatify: () => void;
}

const STABILITY_STYLES: Record<TurnAuditReport['stability'], { text: string; note: string; border: string }> = {
  Peaceful: { text: 'text-[#34D399]', note: 'The isle rests easy tonight.', border: 'border-[#34D399]/60' },
  Agitated: { text: 'text-[#D4A346]', note: 'Grumbling in the taverns — mind the mob.', border: 'border-[#D4A346]/60' },
  Mutinous: { text: 'text-[#B85D3D]', note: 'The crew grows dangerous. Act quickly.', border: 'border-[#B85D3D]/70' },
};

function LedgerRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[13px] text-abyss/70">{label}</span>
      <span className={`font-mono text-[13px] font-bold ${tone ?? 'text-abyss'}`}>{value}</span>
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 border-b border-abyss/20 pb-1 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-abyss/60">
      {icon}
      {children}
    </h3>
  );
}

export function TurnGazetteModal({ audit, onRatify }: TurnGazetteModalProps) {
  const stability = STABILITY_STYLES[audit.stability];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#16262E]/80 p-3 backdrop-blur-sm">
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-[#B85D3D]/60 bg-[#D8C596] shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Colonial Dispatch, turn ${audit.turn} settlement report`}
      >
        <header className="border-b-2 border-[#B85D3D]/40 px-5 pt-4 pb-3 text-center">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-[#B85D3D]">
            Colonial Dispatch
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-abyss">
            Turn {audit.turn} Settlement Report
          </h2>
        </header>

        <div className="space-y-4 px-5 py-4">
          <section>
            <SectionHeading icon={<Coins className="h-3.5 w-3.5" aria-hidden />}>Treasury Ledger</SectionHeading>
            <LedgerRow label="Mint & Trading revenue" value={`+${audit.revenueSats} ₿`} tone="text-[#1a6b45]" />
            <LedgerRow label="Treasury balance" value={`${audit.netTreasury.toLocaleString()} ₿`} />
          </section>

          <section>
            <SectionHeading icon={<Sprout className="h-3.5 w-3.5" aria-hidden />}>Agriculture & Stores</SectionHeading>
            <LedgerRow label="Harvested" value={`+${audit.foodHarvested} bbl`} tone="text-[#1a6b45]" />
            <LedgerRow label="Consumed by settlers" value={`-${audit.foodConsumed} bbl`} tone="text-[#B85D3D]" />
            <LedgerRow label="Remaining in stores" value={`${audit.netFood.toLocaleString()} bbl`} />
          </section>

          <section>
            <SectionHeading icon={<Users className="h-3.5 w-3.5" aria-hidden />}>Census</SectionHeading>
            <LedgerRow
              label="Births / losses"
              value={`${audit.popDelta >= 0 ? '+' : ''}${audit.popDelta}`}
              tone={audit.popDelta >= 0 ? 'text-[#1a6b45]' : 'text-[#B85D3D]'}
            />
            <LedgerRow label="Total population" value={audit.netPop.toLocaleString()} />
            <LedgerRow
              label="Housing occupancy"
              value={audit.housingCapacity > 0 ? `${audit.housingOccupancy}%` : 'No quarters'}
              tone={audit.housingOccupancy > 100 ? 'text-[#B85D3D]' : undefined}
            />
          </section>

          <section>
            <SectionHeading icon={<Scale className="h-3.5 w-3.5" aria-hidden />}>Public Stability</SectionHeading>
            <div className={`mt-1 rounded-md border ${stability.border} bg-abyss/5 px-3 py-2`}>
              <p className={`font-display text-sm font-bold ${stability.text}`}>{audit.stability}</p>
              <p className="text-[12px] text-abyss/70">{stability.note}</p>
            </div>
          </section>

          {audit.events.length > 0 && (
            <section>
              <SectionHeading icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden />}>Dispatches</SectionHeading>
              <ul className="mt-1 space-y-1">
                {audit.events.map((event, i) => (
                  <li key={i} className="text-[12px] leading-snug text-abyss/80">— {event}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="border-t border-abyss/20 px-5 pb-4 pt-3">
          <button
            type="button"
            onClick={onRatify}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-[#B85D3D] px-5 text-sm font-bold uppercase tracking-widest text-parchment shadow-panel transition-transform hover:brightness-110 active:scale-[0.98]"
          >
            <Home className="h-4 w-4" aria-hidden /> Ratify & Resume Command
          </button>
        </footer>
      </div>
    </div>
  );
}
