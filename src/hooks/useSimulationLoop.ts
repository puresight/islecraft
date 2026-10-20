import { useCallback, useEffect, useRef, useState } from 'react';
import { DynamicEntity } from '@/types/entities';
import { initialEntities, tickEntities } from '@/utils/entitySpawner';
import { advanceTurn } from '@/game/turnEngine';
import { GameStateSnapshot } from '@/types/game';

export const TURN_SECONDS = 60;
const HEARTBEAT_MS = 1500;

interface SimulationLoopOptions {
  game: GameStateSnapshot | null;
  /** Applies a mutated snapshot to React state and Dexie. */
  onTurnAdvance: (next: GameStateSnapshot) => Promise<void> | void;
  enabled: boolean;
}

/**
 * Real-time turn clock (60s) plus a 1.5s world heartbeat that drifts
 * weather and sea entities. Returns the visible countdown and live entities.
 */
export function useSimulationLoop({ game, onTurnAdvance, enabled }: SimulationLoopOptions) {
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  const [entities, setEntities] = useState<DynamicEntity[]>(() => initialEntities());
  const gameRef = useRef(game);
  gameRef.current = game;
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  useEffect(() => {
    if (!enabled || !game || game.phase !== 'playing') return;

    const heartbeat = setInterval(() => {
      setEntities((prev) => {
        const next = tickEntities(prev);
        entitiesRef.current = next;
        return next;
      });
    }, HEARTBEAT_MS);

    const clock = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        // Turn rollover
        const current = gameRef.current;
        if (current && current.phase === 'playing') {
          const { state } = advanceTurn(current);
          // Fold live entity positions into the durable snapshot
          const merged: GameStateSnapshot = {
            ...state,
            units: [
              ...state.units.filter((u) => u.faction !== 'neutral'),
              ...entitiesRef.current.map((e) => ({
                id: e.id.replace('ent_', 'unt_'),
                type: e.type,
                faction: 'neutral' as const,
                col: e.x,
                row: e.y,
                heading: e.direction,
              })),
            ],
          };
          void onTurnAdvance(merged);
        }
        return TURN_SECONDS;
      });
    }, 1000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(clock);
    };
  }, [enabled, game?.id, game?.phase, onTurnAdvance]);

  const resetClock = useCallback(() => setSecondsLeft(TURN_SECONDS), []);

  return { secondsLeft, entities, resetClock };
}
