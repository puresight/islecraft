import { BuildingType, GameStateSnapshot, UnitType } from '@/types/game';
import { advanceTurn, TurnReport } from '@/game/turnEngine';
import { Hud } from '@/components/Hud';
import { GameBoard } from '@/components/GameBoard';
import { PortraitOverlay } from '@/components/PortraitOverlay';
import { RightRail } from '@/components/RightRail';
import { CommandConsole } from '@/components/CommandConsole';
import type { TrayStage } from '@/components/CommandConsole';
import { useCompactLandscape } from '@/hooks/useMediaQuery';
import { useSimulationLoop } from '@/hooks/useSimulationLoop';
import { db, saveActiveGame, recordMatchOutcome } from '@/db/gameDatabase';
import { createInitialGameState } from '@/game/initialState';
import { INITIAL_MAP, TileType } from '@/constants/mapData';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import type { CommandTab } from '@/components/commandTabs';
import { canPlaceItem, isBuildingType, itemCost } from '@/utils/placementRules';
import { DynamicEntity } from '@/types/entities';

export interface BoardEffect {
  id: string;
  x: number;
  y: number;
  kind: 'text' | 'flash';
  text?: string;
  color: string;
  born: number;
}

const VESSEL_TYPES: UnitType[] = ['FISHING_SCHOONER', 'PRIVATEER_SLOOP'];
const isVessel = (t: UnitType) => VESSEL_TYPES.includes(t);
const chebyshev = (ax: number, ay: number, bx: number, by: number) =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

interface MoveCredit {
  left: number;
  turn: number;
}

export default function App() {
  const [tab, setTab] = useState<CommandTab>('construct');
  const [selectedItem, setSelectedItem] = useState<BuildingType | UnitType | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<TurnReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<GameStateSnapshot | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [trayStage, setTrayStage] = useState<TrayStage>('default');
  const [effects, setEffects] = useState<BoardEffect[]>([]);
  const compactLandscape = useCompactLandscape();
  const gameRef = useRef<GameStateSnapshot | null>(null);
  gameRef.current = game;
  const selectedVesselRef = useRef(selectedVesselId);
  selectedVesselRef.current = selectedVesselId;
  const moveCredits = useRef(new Map<string, MoveCredit>());

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

  const pushEffect = useCallback((fx: Omit<BoardEffect, 'id' | 'born'>) => {
    const effect: BoardEffect = { ...fx, id: `fx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, born: performance.now() };
    setEffects((prev) => [...prev, effect]);
    setTimeout(() => setEffects((prev) => prev.filter((e) => e.id !== effect.id)), 2000);
  }, []);

  async function handleCellTap(col: number, row: number) {
    const current = gameRef.current;
    if (!current || busy) return;

    // Build card active: construction takes priority
    if (selectedItem) {
      const check = canPlaceItem(selectedItem, col, row, 'player', current);
      if (!check.valid) return;
      const cost = itemCost(selectedItem);
      navigator.vibrate?.(30);
      if (isBuildingType(selectedItem)) {
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
      if (gameRef.current && gameRef.current.economy.treasurySats < cost) {
        setSelectedItem(null);
      }
      return;
    }

    // No build card: vessel selection / steering
    const clickedVessel = current.units.find(
      (u) => u.faction === 'player' && isVessel(u.type) && u.col === col && u.row === row,
    );
    if (clickedVessel) {
      setSelectedVesselId(clickedVessel.id);
      return;
    }

    const vesselId = selectedVesselRef.current;
    if (vesselId) {
      const moved = await attemptVesselMove(vesselId, col, row);
      if (moved) return;
      setSelectedVesselId(null);
    }
  }

  async function attemptVesselMove(vesselId: string, col: number, row: number): Promise<boolean> {
    const current = gameRef.current;
    if (!current) return false;
    const vessel = current.units.find((u) => u.id === vesselId && u.faction === 'player');
    if (!vessel) return false;
    if (chebyshev(vessel.col, vessel.row, col, row) !== 1) return false;

    const tile = INITIAL_MAP[row]?.[col];
    if (tile !== TileType.SHALLOW_WATER && tile !== TileType.DEEP_SEA) return false;
    const blockedByFriendly = current.units.some(
      (u) => u.id !== vessel.id && u.faction === 'player' && u.col === col && u.row === row,
    );
    if (blockedByFriendly) return false;

    const galleonHere = entitiesRef.current.find(
      (e) => e.type === 'ROGUE_GALLEON' && e.x === col && e.y === row,
    );
    // Only a sloop may enter a pirate's tile (to engage); a schooner is repelled
    if (galleonHere && vessel.type !== 'PRIVATEER_SLOOP') return false;

    const credit = moveCredits.current.get(vesselId);
    const available = credit && credit.turn === current.turn ? credit.left : 1;
    if (available <= 0) return false;
    moveCredits.current.set(vesselId, { left: available - 1, turn: current.turn });

    navigator.vibrate?.(15);

    let foodBonus = 0;
    let satsBonus = 0;
    const consumed: string[] = [];

    const shoal = entitiesRef.current.find((e) => e.type === 'FISH_SHOAL' && e.x === col && e.y === row);
    if (shoal && vessel.type === 'FISHING_SCHOONER') {
      foodBonus = 50;
      consumed.push(shoal.id);
      pushEffect({ x: col, y: row, kind: 'text', text: '+50 Food', color: '#8FAF68' });
    }
    if (galleonHere) {
      satsBonus = 35;
      consumed.push(galleonHere.id);
      pushEffect({ x: col, y: row, kind: 'text', text: '+35 ₿', color: '#D4A346' });
    }
    if (consumed.length > 0) {
      setEntities((prev) => prev.filter((e) => !consumed.includes(e.id)));
    }

    await persist((state) => ({
      ...state,
      units: state.units.map((u) => (u.id === vesselId ? { ...u, col, row } : u)),
      economy: {
        ...state.economy,
        treasurySats: state.economy.treasurySats + satsBonus,
        foodReserves: state.economy.foodReserves + foodBonus,
      },
    }));
    return true;
  }

  // Esc cancels vessel selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedVesselId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleTurnAdvance = useCallback(
    async (next: GameStateSnapshot) => {
      setGame(next);
      gameRef.current = next;
      await saveActiveGame(next);
    },
    [],
  );

  const { secondsLeft, entities, setEntities, resetClock } = useSimulationLoop({
    game,
    onTurnAdvance: handleTurnAdvance,
    enabled: isHydrated && game?.phase === 'playing' && !busy,
    onHeartbeat: handleHeartbeat,
  });

  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  function handleHeartbeat() {
    const current = gameRef.current;
    if (!current || current.phase !== 'playing') return;

    // Refresh steering credits: 1 per tick, capped at 4 per turn
    current.units
      .filter((u) => u.faction === 'player' && isVessel(u.type))
      .forEach((v) => {
        const credit = moveCredits.current.get(v.id);
        if (!credit || credit.turn !== current.turn) {
          moveCredits.current.set(v.id, { left: 1, turn: current.turn });
        } else {
          moveCredits.current.set(v.id, { left: Math.min(4, credit.left + 1), turn: current.turn });
        }
      });

    let foodBonus = 0;
    const consumed: string[] = [];
    const flashes: Array<{ x: number; y: number }> = [];

    // Bastion defense: sink pirates skulking beside the cannons
    const bastions = current.buildings.filter((b) => b.faction === 'player' && b.type === 'COASTAL_BASTION');
    entitiesRef.current
      .filter((e) => e.type === 'ROGUE_GALLEON')
      .forEach((g) => {
        if (bastions.some((b) => chebyshev(b.col, b.row, g.x, g.y) <= 1)) {
          consumed.push(g.id);
          const bastion = bastions.find((b) => chebyshev(b.col, b.row, g.x, g.y) <= 1)!;
          flashes.push({ x: bastion.col, y: bastion.row });
        }
      });

    // Schooners resting on a shoal haul in the catch
    const schooners = current.units.filter((u) => u.faction === 'player' && u.type === 'FISHING_SCHOONER');
    entitiesRef.current
      .filter((e) => e.type === 'FISH_SHOAL')
      .forEach((shoal) => {
        if (schooners.some((s) => s.col === shoal.x && s.row === shoal.y)) {
          foodBonus += 50;
          consumed.push(shoal.id);
          pushEffect({ x: shoal.x, y: shoal.y, kind: 'text', text: '+50 Food', color: '#8FAF68' });
        }
      });

    if (consumed.length > 0) {
      setEntities((prev) => prev.filter((e) => !consumed.includes(e.id)));
    }
    flashes.forEach((f) => pushEffect({ x: f.x, y: f.y, kind: 'flash', color: '#E8D8A0' }));
    if (flashes.length > 0) navigator.vibrate?.(40);

    if (foodBonus > 0) {
      void persist((state) => ({
        ...state,
        economy: { ...state.economy, foodReserves: state.economy.foodReserves + foodBonus },
      }));
    }
  }

  async function handleEndTurn() {
    if (!game || busy) return;
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
      resetClock();
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
    setSelectedVesselId(null);
    setTab('construct');
    resetClock();
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
                  dynamicEntities={entities}
                  selectedVesselId={selectedVesselId}
                  effects={effects}
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
                    dynamicEntities={entities}
                    selectedVesselId={selectedVesselId}
                    effects={effects}
                    onCellTap={handleCellTap}
                  />
                </div>
              </div>
              <CommandConsole {...railProps} stage={trayStage} onStageChange={setTrayStage} secondsLeft={secondsLeft} />
            </div>
          )}
        </main>
      )}
    </div>
  );
}
