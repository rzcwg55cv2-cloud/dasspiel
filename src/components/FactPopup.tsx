import { getFactDuration } from '../game/bierwissen';
import { KoelschGlass } from './KoelschGlass';
import { PopupCard } from './PopupCard';

/** Unnützes Wissen – wahr, aber völlig sinnlos. */
export function FactPopup({ fact, onClose }: { fact: string; onClose: () => void }) {
  return (
    <PopupCard
      icon={<KoelschGlass className="mx-auto h-14 w-7" />}
      label="UNNÜTZES WISSEN"
      text={fact}
      durationMs={getFactDuration(fact)}
      onClose={onClose}
    />
  );
}
