import { Hammer, Sailboat, ScrollText, type LucideIcon } from 'lucide-react';

export type CommandTab = 'construct' | 'launch' | 'status';

export const TABS: Array<{ id: CommandTab; label: string; icon: LucideIcon }> = [
  { id: 'construct', label: 'Construct', icon: Hammer },
  { id: 'launch', label: 'Launch', icon: Sailboat },
  { id: 'status', label: 'Status', icon: ScrollText },
];

interface CommandBarProps {
  active: CommandTab;
  onChange: (tab: CommandTab) => void;
}

export function CommandBar({ active, onChange }: CommandBarProps) {
  return (
    <div className="flex min-h-[44px] items-stretch gap-1" role="tablist" aria-label="Command categories">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={`command-tab ${
            active === id ? 'border-brass/60 bg-brass/15 text-brass' : 'border-rim/40 text-foam/80 hover:bg-rim/20'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
