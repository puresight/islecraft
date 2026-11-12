import { useCallback, useEffect, useRef, useState } from 'react';
import { DynamicEntity } from '@/types/entities';
import { initialEntities } from '@/utils/entitySpawner';
import { tickWorld } from '@/utils/simulationReducer';
import { GameStateSnapshot } from '@/types/game';

const DEFAULT_TURN_SECONDS = 60;
const HEARTBEAT_MS = 1500;

interface SimulationLoopOptions {
  game: GameStateSnapshot | null;
  /** Freezes both the countdown and the world pulse (e.g. while the Gazette is open). */
  paused?: boolean;
  /** Fired once when the countdown reaches 0. */
  onTurnExpire?: () => void;
  /** Runs on each 1.5s world pulse, after entities drift. */
  onHeartbeat?: () => void;
  enabled: boolean;
  /** Turn clock length in seconds (settings-configurable). */
  turnSeconds?: number;
}

/**
 * Real-time turn clock plus a 1.5s world heartbeat that drifts
 * weather and sea entities. Returns the visible countdown and live entities.
 */
export function useSimulationLoop({
  game,
  paused = false,
  onTurnExpire,
  onHeartbeat,
  enabled,
  turnSeconds = DEFAULT_TURN_SECONDS,
}: SimulationLoopOptions) {
  const [secondsLeft, setSecondsLeft] = useState(turnSeconds);
  const [entities, setEntities] = useState<DynamicEntity[]>(() => initialEntities());
  const gameRef = useRef(game);
  gameRef.current = game;
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const heartbeatRef = useRef(onHeartbeat);
  heartbeatRef.current = onHeartbeat;
  const expireRef = useRef(onTurnExpire);
  expireRef.current = onTurnExpire;

  useEffect(() => {
    if (!enabled || paused || !gameRef.current || gameRef.current.phase !== 'playing') return;

    const heartbeat = setInterval(() => {
      setEntities((prev) => {
        const next = tickWorld(prev);
        entitiesRef.current = next;
        // Notify world systems (bastions, harvesting) after the drift
        heartbeatRef.current?.();
        return next;
      });
    }, HEARTBEAT_MS);

    const clock = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        expireRef.current?.();
        return 0;
      });
    }, 1000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(clock);
    };
  }, [enabled, paused]);

  const resetClock = useCallback(() => setSecondsLeft(turnSeconds), [turnSeconds]);

  return { secondsLeft, entities, setEntities, resetClock };
}
