import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export function PortraitOverlay() {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!portrait) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ocean px-6 text-center">
      <span className="flex h-16 w-16 animate-sway items-center justify-center rounded-full border-2 border-rim bg-charcoal">
        <RotateCcw className="h-8 w-8 text-brass" aria-hidden />
      </span>
      <p className="font-display text-base font-bold tracking-wide text-parchment">
        Rotate device to landscape to command Islecraft
      </p>
      <p className="max-w-xs text-sm text-foam">
        The dual isles stretch across the horizon — turn your device sideways to take the helm.
      </p>
    </div>
  );
}
