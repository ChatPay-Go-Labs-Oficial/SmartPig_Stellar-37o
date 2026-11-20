import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** O app está à frente (AppState "active"). */
export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setActive(next === 'active'));
    return () => subscription.remove();
  }, []);
  return active;
}
