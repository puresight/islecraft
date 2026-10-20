import Dexie, { Table } from 'dexie';
import { GameStateSnapshot, MatchHistoryRecord, PlayerSettings } from '@/types/game';

export class IslecraftDB extends Dexie {
  activeGame!: Table<GameStateSnapshot, string>;
  matchHistory!: Table<MatchHistoryRecord, number>;
  settings!: Table<PlayerSettings, string>;

  constructor() {
    super('IslecraftDB');
    this.version(1).stores({
      activeGame: 'id',
      matchHistory: '++id, completedAt, outcome',
      settings: 'key',
    });
  }
}

export const db = new IslecraftDB();

export const DEFAULT_SETTINGS: PlayerSettings = {
  key: 'default',
  soundEnabled: true,
  hapticsEnabled: true,
  colorTheme: 'parchment',
  controlScheme: 'touch',
};

export async function loadOrCreateSettings(): Promise<PlayerSettings> {
  const existing = await db.settings.get('default');
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveActiveGame(state: GameStateSnapshot): Promise<void> {
  await db.activeGame.put({ ...state, updatedAt: Date.now() });
}

export async function recordMatchOutcome(
  state: GameStateSnapshot,
  outcome: MatchHistoryRecord['outcome'],
): Promise<void> {
  await db.matchHistory.add({
    completedAt: Date.now(),
    outcome,
    victoryPoints: state.economy.victoryPoints,
    finalTreasurySats: state.economy.treasurySats,
    turnsSurvived: state.turn,
  });
}
