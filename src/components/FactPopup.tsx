import { getFactDuration, getFactLabel } from '../game/bierwissen';
import { KoelschGlass } from './KoelschGlass';
import { PopupCard } from './PopupCard';

/** Unnützes Wissen (wahr, aber sinnlos) oder unnützes Bierwissen (absichtlich Quatsch). */
export function FactPopup({ fact, onClose }: { fact: string; onClose: () => void }) {
  return (
    <PopupCard
      icon={<KoelschGlass className="mx-auto h-14 w-7" />}
      label={getFactLabel(fact)}
      text={fact}
      durationMs={getFactDuration(fact)}
      onClose={onClose}
    />
  );
}
