import { useCallback } from 'react';
import { GameStateSnapshot } from '@/types/game';
import { saveActiveGame } from '@/db/gameDatabase';

type GameRef = { current: GameStateSnapshot | null };

/**
 * Reactive persistence seam: apply a pure mutation to the latest snapshot,
 * mirror it back into the ref (the single source of truth) and flush to Dexie.
 * Consumers never import the database directly.
 */
export function useGamePersistence(gameRef: GameRef) {
  const commit = useCallback(
    (mutator: (state: GameStateSnapshot) => GameStateSnapshot): GameStateSnapshot | null => {
      const current = gameRef.current;
      if (!current) return null;
      const next = mutator(current);
      gameRef.current = next;
      void saveActiveGame(next);
      return next;
    },
    [gameRef],
  );

  return commit;
}

export type GameCommit = ReturnType<typeof useGamePersistence>;
