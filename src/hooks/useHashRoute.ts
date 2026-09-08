import { useCallback, useEffect, useState } from 'react';
import { ROUTES } from '../data';
import type { Route } from '../types';

const fromHash = (): Route | null => {
  const h = window.location.hash.replace(/^#/, '');
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : null;
};

export function useHashRoute(): [Route | null, (id: Route | null) => void] {
  const [route, setRoute] = useState<Route | null>(fromHash);

  useEffect(() => {
    const onChange = () => setRoute(fromHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id: Route | null) => {
    window.location.hash = id ?? '';
    setRoute(id);
  }, []);

  return [route, navigate];
}
