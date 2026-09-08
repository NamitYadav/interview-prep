import { useCallback, useEffect, useState } from 'react';
import { ROUND_IDS } from '../data';
import type { RoundId } from '../types';

const fromHash = (): RoundId | null => {
  const h = window.location.hash.replace(/^#/, '');
  return (ROUND_IDS as readonly string[]).includes(h) ? (h as RoundId) : null;
};

export function useHashRoute(): [RoundId | null, (id: RoundId | null) => void] {
  const [route, setRoute] = useState<RoundId | null>(fromHash);

  useEffect(() => {
    const onChange = () => setRoute(fromHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id: RoundId | null) => {
    window.location.hash = id ?? '';
    setRoute(id);
  }, []);

  return [route, navigate];
}
