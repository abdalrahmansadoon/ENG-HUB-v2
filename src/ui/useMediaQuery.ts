import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  const subscribe = useCallback((change: () => void) => {
    const media = matchMedia(query);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, [query]);
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false);
}
