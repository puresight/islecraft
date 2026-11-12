import type { VitalSnapshot } from '@/types/game';

interface VitalSeries {
  points: Array<{ turn: number; p1: number; p2: number }>;
}

const WIDTH = 320;
const HEIGHT = 96;
const PAD_X = 6;
const PAD_Y = 10;
const GRID_LINES = 4;

const P1_STROKE = '#C84630';
const P2_STROKE = '#2B6CB0';

function scalePath(points: VitalSeries['points'], max: number): { p1: string; p2: string } {
  if (points.length === 0 || max <= 0) return { p1: '', p2: '' };
  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;
  const minTurn = points[0].turn;
  const maxTurn = Math.max(points[points.length - 1].turn, minTurn + 1);
  const xFor = (turn: number) => PAD_X + ((turn - minTurn) / (maxTurn - minTurn)) * innerW;
  const yFor = (v: number) => PAD_Y + innerH - (Math.min(v, max) / max) * innerH;
  const line = (key: 'p1' | 'p2') =>
    points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${xFor(pt.turn).toFixed(1)},${yFor(pt[key]).toFixed(1)}`).join(' ');
  return { p1: line('p1'), p2: line('p2') };
}

function VitalChart({
  title,
  points,
  unit,
}: {
  title: string;
  points: VitalSeries['points'];
  unit: string;
}) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.p1, p.p2)));
  const paths = scalePath(points, max);

  return (
    <div className="rounded-md border border-[#F59E0B]/40 bg-[#16262E] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#F2E7CD]/85">{title}</p>
        <p className="font-mono text-[10px] text-[#F2E7CD]/50">{unit}</p>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`${title} chart`}
      >
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const y = PAD_Y + ((HEIGHT - PAD_Y * 2) / GRID_LINES) * i;
          return <line key={i} x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y} stroke="rgba(242,231,205,0.12)" strokeWidth="1" />;
        })}
        {paths.p1 && <path d={paths.p1} fill="none" stroke={P1_STROKE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {paths.p2 && <path d={paths.p2} fill="none" stroke={P2_STROKE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1.5 text-[#F2E7CD]/75">
          <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: P1_STROKE }} aria-hidden /> Red
        </span>
        <span className="flex items-center gap-1.5 text-[#F2E7CD]/75">
          <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: P2_STROKE }} aria-hidden /> Blue
        </span>
      </div>
    </div>
  );
}

export function VitalsCharts({
  history,
}: {
  history: VitalSnapshot[];
}) {
  if (history.length === 0) return null;
  const toPoints = (sel: (h: VitalSnapshot) => { p1: number; p2: number }) =>
    history.map((h) => ({ turn: h.turn, ...sel(h) }));

  return (
    <div className="mt-4 space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-abyss/60">Settlement Vitals</h2>
      <VitalChart title="Population Trends" points={toPoints((h) => ({ p1: h.p1Pop, p2: h.p2Pop }))} unit="souls" />
      <VitalChart title="Treasury Accumulation" points={toPoints((h) => ({ p1: h.p1Sats, p2: h.p2Sats }))} unit="₿ sats" />
      <VitalChart title="Food Reserves" points={toPoints((h) => ({ p1: h.p1Food, p2: h.p2Food }))} unit="barrels" />
    </div>
  );
}