import { BuildingType, GameStateSnapshot, UnitType, BUILDING_SPEC } from '@/types/game';
import { advanceTurn, TurnReport } from '@/game/turnEngine';
import { Hud } from '@/components/Hud';
import { GameBoard } from '@/components/GameBoard';
import { PortraitOverlay } from '@/components/PortraitOverlay';
import { RightRail } from '@/components/RightRail';
import { CommandConsole } from '@/components/CommandConsole';
import type { TrayStage } from '@/components/CommandConsole';
import { useCompactLandscape } from '@/hooks/useMediaQuery';
import { db, saveActiveGame, recordMatchOutcome } from '@/db/gameDatabase';
import { createInitialGameState } from '@/game/initialState';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import type { CommandTab } from '@/components/commandTabs';
import { canPlaceItem, isBuildingType, itemCost } from '@/utils/placementRules';

export default function App() {
  const [tab, setTab] = useState<CommandTab>('construct');
  const [selectedItem, setSelectedItem] = useState<BuildingType | UnitType | null>(null);
  const [lastReport, setLastReport] = useState<TurnReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<GameStateSnapshot | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [trayStage, setTrayStage] = useState<TrayStage>('default');
  const compactLandscape = useCompactLandscape();
  const gameRef = useRef<GameStateSnapshot | null>(null);
  gameRef.current = game;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await db.activeGame.toCollection().first();
      if (cancelled) return;
      if (saved) {
        setGame(saved);
      } else {
        const fresh = createInitialGameState();
        await db.activeGame.put(fresh);
        setGame(fresh);
      }
      setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (mutator: (state: GameStateSnapshot) => GameStateSnapshot) => {
    const current = gameRef.current;
    if (!current) return;
    const next = mutator(current);
    gameRef.current = next;
    setGame(next);
    await saveActiveGame(next);
  }, []);

  async function handleCellTap(col: number, row: number) {
    const current = gameRef.current;
    if (!current || !selectedItem || busy) return;

    const check = canPlaceItem(selectedItem, col, row, 'player', current);
    if (!check.valid) return;

    const cost = itemCost(selectedItem);
    const isStructure = isBuildingType(selectedItem);

    if (isStructure) {
      navigator.vibrate?.(30);
      await persist((state) => ({
        ...state,
        buildings: [
          ...state.buildings,
          {
            id: `bld_${Math.random().toString(36).slice(2, 9)}`,
            type: selectedItem as BuildingType,
            faction: 'player',
            col,
            row,
            level: 1,
            builtOnTurn: state.turn,
          },
        ],
        economy: { ...state.economy, treasurySats: state.economy.treasurySats - cost },
      }));
    } else {
      navigator.vibrate?.(30);
      await persist((state) => ({
        ...state,
        units: [
          ...state.units,
          {
            id: `unt_${Math.random().toString(36).slice(2, 9)}`,
            type: selectedItem as UnitType,
            faction: 'player',
            col,
            row,
            heading: 0,
          },
        ],
        economy: { ...state.economy, treasurySats: state.economy.treasurySats - cost },
      }));
    }

    // Stay selected for batch construction; drop the item once sats run dry
    if (gameRef.current && gameRef.current.economy.treasurySats < cost) {
      setSelectedItem(null);
    }
  }

  async function handleEndTurn() {
    if (!game) return;
    setBusy(true);
    try {
      const { state, report } = advanceTurn(game);
      setLastReport(report);
      if (state.phase === 'ended') {
        await recordMatchOutcome(state, 'defeat');
      }
      await saveActiveGame(state);
      setGame(state);
      gameRef.current = state;
    } finally {
      setBusy(false);
    }
  }

  async function handleRestart() {
    const fresh = createInitialGameState();
    await db.activeGame.put(fresh);
    setGame(fresh);
    gameRef.current = fresh;
    setLastReport(null);
    setSelectedItem(null);
    setTab('construct');
  }

  if (!isHydrated || !game) {
    return (
      <div className="flex h-full items-center justify-center overflow-hidden bg-charcoal">
        <p className="animate-sway font-display text-sm uppercase tracking-[0.3em] text-foam/60">Charting the isles…</p>
      </div>
    );
  }

  const railProps = {
    tab,
    onTabChange: setTab,
    game,
    selectedItem,
    onSelectItem: setSelectedItem,
    busy,
    onEndTurn: handleEndTurn,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-charcoal">
      <PortraitOverlay />
      {compactLandscape && <Hud turn={game.turn} economy={game.economy} />}

      {game.phase === 'ended' ? (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4">
          <div className="panel flex max-w-sm flex-col items-center gap-3 p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-danger" aria-hidden />
            <p className="font-display text-lg font-bold text-parchment">The Colony Has Fallen</p>
            <p className="text-sm text-foam">
              Your settlement survived {game.turn} rounds with {game.economy.treasurySats.toLocaleString()} sats in the
              treasury and {game.economy.victoryPoints} victory points.
            </p>
            <button
              type="button"
              onClick={handleRestart}
              className="flex min-h-[44px] items-center gap-2 rounded-md bg-brass px-5 text-sm font-bold uppercase tracking-widest text-abyss shadow-panel transition-transform active:scale-[0.98]"
            >
              <RotateCw className="h-4 w-4" aria-hidden /> New Voyage
            </button>
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 w-full flex-1 overflow-hidden">
          {compactLandscape ? (
            <>
              <div className="flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden p-1">
                <GameBoard
                  state={game}
                  placementActive={selectedItem !== null}
                  activeFaction="player"
                  selectedItem={selectedItem}
                  onCellTap={handleCellTap}
                  className="h-full max-h-full max-w-full"
                />
              </div>
              <RightRail {...railProps} />
            </>
          ) : (
            <div className="relative h-full w-full flex-1 overflow-hidden">
              <div className="relative flex h-full w-full flex-1 flex-col items-center justify-start overflow-hidden pt-0">
                <div className="w-full max-w-full" style={{ aspectRatio: '29 / 16' }}>
                  <GameBoard
                    state={game}
                    placementActive={selectedItem !== null}
                    activeFaction="player"
                    selectedItem={selectedItem}
                    onCellTap={handleCellTap}
                  />
                </div>
              </div>
              <CommandConsole {...railProps} stage={trayStage} onStageChange={setTrayStage} />
            </div>
          )}
        </main>
      )}
    </div>
  );
}
