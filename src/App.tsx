import { BuildingType, ChronicleEntry, GameStateSnapshot, UnitType, BASE_YEAR } from '@/types/game';
import { calculateTurnAudit, TurnAuditReport } from '@/utils/economyEngine';
import { Hud } from '@/components/Hud';
import { GameBoard } from '@/components/GameBoard';
import { PortraitOverlay } from '@/components/PortraitOverlay';
import { RightRail } from '@/components/RightRail';
import { CommandConsole } from '@/components/CommandConsole';
import type { TrayStage } from '@/components/CommandConsole';
import { TitleScreen } from '@/components/TitleScreen';
import type { VoyageMode } from '@/components/TitleScreen';
import { RetrospectiveScreen } from '@/components/RetrospectiveScreen';
import type { RetrospectiveStats } from '@/components/RetrospectiveScreen';
import { rankForScore, scoreForCampaign } from '@/utils/scoring';
import { useCompactLandscape } from '@/hooks/useMediaQuery';
import { useSimulationLoop } from '@/hooks/useSimulationLoop';
import { useGamePersistence } from '@/hooks/useGamePersistence';
import { db, loadOrCreateSettings, DEFAULT_SETTINGS, recordMatchOutcome, recordCampaignResult } from '@/db/gameDatabase';
import { createInitialGameState } from '@/game/initialState';
import { MapId, TileType, activateMap } from '@/constants/mapData';
import { INITIAL_MAP } from '@/constants/mapData';
import { planGovernorBuild } from '@/utils/governorAI';
import { deriveHeartbeat, isVesselType } from '@/utils/simulationReducer';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommandTab } from '@/components/commandTabs';
import { canPlaceItem } from '@/utils/placementRules';
import { isBuildingType, itemCost, BUILDING_BLUEPRINTS, UNIT_BLUEPRINTS, SHOAL_HARVEST_FOOD, GALLEON_BOUNTY_SATS } from '@/constants/blueprints';
import { chebyshev } from '@/utils/coordinates';
import { ToastManager, useToasts } from '@/components/ToastManager';
import { TurnGazetteModal } from '@/components/TurnGazetteModal';

export interface BoardEffect {
  id: string;
  x: number;
  y: number;
  kind: 'text' | 'flash';
  text?: string;
  color: string;
  born: number;
}

type ScreenMode = 'TITLE' | 'PLAYING' | 'RETROSPECTIVE';

const isVessel = (t: UnitType) => isVesselType(t);

interface MoveCredit {
  left: number;
  turn: number;
}

export default function App() {
  const [screenMode, setScreenMode] = useState<ScreenMode>('TITLE');
  const [tab, setTab] = useState<CommandTab>('construct');
  const [selectedItem, setSelectedItem] = useState<BuildingType | UnitType | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [gazetteAudit, setGazetteAudit] = useState<TurnAuditReport | null>(null);
  const [gazetteOpen, setGazetteOpen] = useState(false);
  const [gazetteFlashUntil, setGazetteFlashUntil] = useState(0);
  const [isHiddenPaused, setIsHiddenPaused] = useState(false);
  const [retroStats, setRetroStats] = useState<RetrospectiveStats | null>(null);
  const [chronicle, setChronicle] = useState<ChronicleEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<GameStateSnapshot | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasSavedRun, setHasSavedRun] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [trayStage, setTrayStage] = useState<TrayStage>('default');
  const [effects, setEffects] = useState<BoardEffect[]>([]);
  const { toasts, pushToast } = useToasts();
  const compactLandscape = useCompactLandscape();
  const gameRef = useRef<GameStateSnapshot | null>(null);
  gameRef.current = game;
  const selectedVesselRef = useRef(selectedVesselId);
  selectedVesselRef.current = selectedVesselId;
  const moveCredits = useRef(new Map<string, MoveCredit>());
  const chronicleRef = useRef<ChronicleEntry[]>([]);
  chronicleRef.current = chronicle;
  const selectedItemRef = useRef(selectedItem);
  selectedItemRef.current = selectedItem;

  const commit = useGamePersistence(gameRef);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, saved] = await Promise.all([
        loadOrCreateSettings(),
        db.activeGame.toCollection().first(),
      ]);
      if (cancelled) return;
      setSettings(loadedSettings);
      if (saved && saved.phase === 'playing') {
        setGame(saved);
        setHasSavedRun(true);
      }
      setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const changeSettings = useCallback((next: typeof settings) => {
    setSettings(next);
    void db.settings.put(next);
  }, []);

  const pushChronicle = useCallback((entries: ChronicleEntry[]) => {
    setChronicle((prev) => [...prev, ...entries].slice(-40));
  }, []);

  const pushGame = useCallback(
    (mutator: (state: GameStateSnapshot) => GameStateSnapshot) => {
      const next = commit(mutator);
      if (next) setGame(next);
    },
    [commit],
  );

  const pushEffect = useCallback((fx: Omit<BoardEffect, 'id' | 'born'>) => {
    const effect: BoardEffect = { ...fx, id: `fx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, born: performance.now() };
    setEffects((prev) => [...prev, effect]);
    setTimeout(() => setEffects((prev) => prev.filter((e) => e.id !== effect.id)), 2000);
  }, []);

  function handleSelectTile(col: number, row: number) {
    const current = gameRef.current;
    if (!current || busy || isHiddenPaused) return;

    if (selectedItem) {
      const check = canPlaceItem(selectedItem, col, row, 'player', current);
      const clickedVessel = current.units.find(
        (u) => u.faction === 'player' && isVessel(u.type) && u.col === col && u.row === row,
      );
      if (clickedVessel) {
        setSelectedItem(null);
        setSelectedVesselId(clickedVessel.id);
        pushToast(`Commanding ${UNIT_BLUEPRINTS[clickedVessel.type].label} — Select adjacent sea to navigate`, 'gold');
        return;
      }
      if (!check.valid) {
        pushToast(`Cannot build here: ${check.reason ?? 'unavailable'}`, 'error');
        return;
      }
      const cost = itemCost(selectedItem);
      navigator.vibrate?.(30);
      if (isBuildingType(selectedItem)) {
        const label = BUILDING_BLUEPRINTS[selectedItem].label;
        pushGame((state) => ({
          ...state,
          buildings: [
            ...state.buildings,
            {
              id: `bld_${Math.random().toString(36).slice(2, 9)}`,
              type: selectedItem,
              faction: 'player',
              col,
              row,
              level: 1,
              builtOnTurn: state.turn,
            },
          ],
          economy: { ...state.economy, treasurySats: state.economy.treasurySats - cost },
        }));
        pushChronicle([
          { turn: current.turn, year: BASE_YEAR + current.turn, text: `A ${label} was erected on the isle.` },
        ]);
        pushToast(`Constructed ${label} (-${cost} sats)`, 'gold');
      } else {
        pushGame((state) => ({
          ...state,
          units: [
            ...state.units,
            {
              id: `unt_${Math.random().toString(36).slice(2, 9)}`,
              type: selectedItem,
              faction: 'player',
              col,
              row,
              heading: 0,
            },
          ],
          economy: { ...state.economy, treasurySats: state.economy.treasurySats - cost },
        }));
        pushToast(`Commissioned ${UNIT_BLUEPRINTS[selectedItem].label} (-${cost} sats)`, 'gold');
      }
      if (gameRef.current && gameRef.current.economy.treasurySats < cost) {
        setSelectedItem(null);
      }
      return;
    }

    const clickedVessel = current.units.find(
      (u) => u.faction === 'player' && isVessel(u.type) && u.col === col && u.row === row,
    );
    if (clickedVessel) {
      setSelectedVesselId(clickedVessel.id);
      pushToast(`Commanding ${UNIT_BLUEPRINTS[clickedVessel.type].label} — Select adjacent sea to navigate`, 'gold');
      return;
    }

    const vesselId = selectedVesselRef.current;
    if (vesselId) {
      const moved = attemptVesselMove(vesselId, col, row);
      if (moved) return;
      setSelectedVesselId(null);
    }
  }

  function handleCancelSelection() {
    setSelectedItem(null);
    setSelectedVesselId(null);
  }

  function attemptVesselMove(vesselId: string, col: number, row: number): boolean {
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
      foodBonus = SHOAL_HARVEST_FOOD;
      consumed.push(shoal.id);
      pushEffect({ x: col, y: row, kind: 'text', text: `+${SHOAL_HARVEST_FOOD} Food`, color: '#4E8752' });
      pushToast(`Schooner harvested fish shoal (+${SHOAL_HARVEST_FOOD} Food)`, 'success');
    }
    if (galleonHere) {
      satsBonus = GALLEON_BOUNTY_SATS;
      consumed.push(galleonHere.id);
      pushEffect({ x: col, y: row, kind: 'text', text: `+${GALLEON_BOUNTY_SATS} ₿`, color: '#F59E0B' });
      pushToast(`Privateer Sloop neutralized Rogue Galleon (+${GALLEON_BOUNTY_SATS} sats bounty)`, 'success');
      pushChronicle([
        { turn: current.turn, year: BASE_YEAR + current.turn, text: 'Privateers neutralized a rogue galleon.' },
      ]);
      void commit((state) => ({
        ...state,
        economy: { ...state.economy, raidersSunk: (state.economy.raidersSunk ?? 0) + 1 },
      }));
    }
    if (consumed.length > 0) {
      setEntities((prev) => prev.filter((e) => !consumed.includes(e.id)));
    }

    pushGame((state) => ({
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedVesselRef.current || selectedItemRef.current) {
        handleCancelSelection();
        return;
      }
      if (screenMode !== 'PLAYING') return;
      setGazetteOpen((prev) => !prev);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenMode]);

  useEffect(() => {
    if (screenMode !== 'PLAYING') return;
    const onVisibility = () => setIsHiddenPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [screenMode]);

  const runSettlementRef = useRef<() => Promise<void>>();
  runSettlementRef.current = runSettlement;

  const handleTurnExpire = useCallback(() => {
    void runSettlementRef.current?.();
  }, []);

  async function runSettlement() {
    const current = gameRef.current;
    if (!current || busy || current.phase !== 'playing') return;
    setBusy(true);
    try {
      const audit = calculateTurnAudit(current);

      let buildings = current.buildings;
      let units = current.units;

      const existingMutineer = current.units.find((u) => u.type === 'CORSAIR_MUTINEER');
      if (existingMutineer) {
        units = current.units.filter((u) => u.id !== existingMutineer.id);
        const mutineerTile = { col: existingMutineer.col, row: existingMutineer.row };
        const bastion = buildings.find(
          (b) => b.faction === 'player' && b.type === 'COASTAL_BASTION' && chebyshev(b.col, b.row, mutineerTile.col, mutineerTile.row) <= 1,
        );
        if (bastion) {
          pushToast('Coastal Bastion quelled the mutiny!', 'success');
          pushEffect({ x: bastion.col, y: bastion.row, kind: 'flash', color: '#F59E0B' });
          navigator.vibrate?.(40);
        } else {
          const adjacent = buildings.filter(
            (b) => b.faction === 'player' && chebyshev(b.col, b.row, mutineerTile.col, mutineerTile.row) === 1,
          );
          if (adjacent.length > 0) {
            const victim = adjacent[Math.floor(Math.random() * adjacent.length)];
            buildings = buildings.filter((b) => b.id !== victim.id);
            pushToast(`Mutineers pillaged a ${BUILDING_BLUEPRINTS[victim.type].label}!`, 'error');
            pushEffect({ x: victim.col, y: victim.row, kind: 'flash', color: '#C84630' });
            navigator.vibrate?.([60, 40, 60]);
          }
        }
      }

      if (audit.mutineerSpawn) {
        units = [
          ...units,
          {
            id: `unt_${Math.random().toString(36).slice(2, 9)}`,
            type: 'CORSAIR_MUTINEER' as const,
            faction: 'neutral' as const,
            col: audit.mutineerSpawn.col,
            row: audit.mutineerSpawn.row,
            heading: 0,
          },
        ];
      }

      const turn = current.turn + 1;

      const rival = { ...current.rivalEconomy };
      let nextBuildings = buildings;
      let nextUnits = units;
      if (current.mode === 'solo') {
        const bluePlantations = current.buildings.filter((b) => b.faction === 'rival' && b.type === 'PLANTATION').length;
        const blueMints = current.buildings.filter((b) => b.faction === 'rival' && b.type === 'TRADING_POST').length;
        const blueQuarters = current.buildings.filter((b) => b.faction === 'rival' && b.type === 'SETTLER_QUARTERS').length;
        rival.treasurySats += blueMints * 40;
        rival.foodReserves += bluePlantations * 25;
        const foodDemandBlue = Math.ceil(rival.population / 500) * 20;
        rival.foodReserves -= foodDemandBlue;
        if (rival.foodReserves < 0) {
          rival.population = Math.max(0, rival.population - Math.max(1, Math.floor(rival.population * 0.1)));
          rival.foodReserves = 0;
        } else {
          rival.population = Math.min(rival.housingCapacity, rival.population + Math.round(rival.population * 0.06));
        }
        rival.housingCapacity = blueQuarters * 1000 + 140;

        const build = planGovernorBuild(current, entitiesRef.current);
        if (build) {
          const cost = itemCost(build.item);
          rival.treasurySats -= cost;
          if (build.item === 'FISHING_SCHOONER' || build.item === 'PRIVATEER_SLOOP') {
            nextUnits = [
              ...nextUnits,
              { id: `unt_${Math.random().toString(36).slice(2, 9)}`, type: build.item, faction: 'rival', col: build.col, row: build.row, heading: 180 },
            ];
          } else {
            nextBuildings = [
              ...nextBuildings,
              { id: `bld_${Math.random().toString(36).slice(2, 9)}`, type: build.item, faction: 'rival', col: build.col, row: build.row, level: 1, builtOnTurn: current.turn },
            ];
          }
        }
      }

      const next: GameStateSnapshot = {
        ...current,
        turn,
        phase: 'playing',
        buildings: nextBuildings,
        units: nextUnits,
        economy: {
          ...current.economy,
          treasurySats: audit.netTreasury,
          foodReserves: audit.netFood,
          population: audit.netPop,
          housingCapacity: audit.housingCapacity,
          unrestIndex: audit.newUnrest,
          victoryPoints: turn,
          peakPopulation: Math.max(current.economy.peakPopulation ?? 0, audit.netPop),
          raidersSunk: current.economy.raidersSunk ?? 0,
        },
        rivalEconomy: rival,
        history: [
          ...current.history,
          {
            turn,
            p1Pop: audit.netPop,
            p2Pop: rival.population,
            p1Sats: audit.netTreasury,
            p2Sats: rival.treasurySats,
            p1Food: audit.netFood,
            p2Food: rival.foodReserves,
          },
        ],
        updatedAt: Date.now(),
      };

      commit(() => next);
      setGame(next);
      gameRef.current = next;
      setGazetteAudit(audit);
      setGazetteFlashUntil(Date.now() + 10_000);
      pushChronicle(
        audit.events.map((text) => ({ turn: current.turn, year: BASE_YEAR + current.turn, text })),
      );

      if (current.turn >= settings.campaignTurns) {
        setRetroStats(buildRetrospective(next, 'victory'));
        setScreenMode('RETROSPECTIVE');
        return;
      }

      if (next.economy.population <= 0) {
        next.phase = 'ended';
        commit(() => next);
        setGame(next);
        gameRef.current = next;
        setRetroStats(buildRetrospective(next, 'defeat'));
        setScreenMode('RETROSPECTIVE');
        return;
      }

      resetClock();
    } finally {
      setBusy(false);
    }
  }

  function openGazette() {
    setGazetteOpen(true);
    setGazetteFlashUntil(0);
  }

  function closeGazette() {
    setGazetteOpen(false);
  }

  function handleHeartbeat() {
    const current = gameRef.current;
    if (!current || current.phase !== 'playing') return;

    for (const v of current.units.filter((u) => u.faction === 'player' && isVessel(u.type))) {
      const credit = moveCredits.current.get(v.id);
      if (!credit || credit.turn !== current.turn) {
        moveCredits.current.set(v.id, { left: 1, turn: current.turn });
      } else {
        moveCredits.current.set(v.id, { left: Math.min(4, credit.left + 1), turn: current.turn });
      }
    }

    const outcome = deriveHeartbeat(current, entitiesRef.current);

    if (outcome.nextUnits !== current.units) {
      pushGame((state) => ({ ...state, units: outcome.nextUnits }));
    }
    if (outcome.consumedEntityIds.length > 0) {
      setEntities((prev) => prev.filter((e) => !outcome.consumedEntityIds.includes(e.id)));
    }
    outcome.flashTiles.forEach((f) => pushEffect({ x: f.col, y: f.row, kind: 'flash', color: '#F59E0B' }));
    outcome.harvestedTiles.forEach((h) => pushEffect({ x: h.col, y: h.row, kind: 'text', text: `+${SHOAL_HARVEST_FOOD} Food`, color: '#4E8752' }));
    outcome.notices.forEach((n) => pushToast(n.text, n.kind));
    if (outcome.flashTiles.length > 0) navigator.vibrate?.(40);
    if (outcome.foodBonus > 0) {
      pushGame((state) => ({
        ...state,
        economy: { ...state.economy, foodReserves: state.economy.foodReserves + outcome.foodBonus },
      }));
    }
  }

  const { secondsLeft, entities, setEntities, resetClock } = useSimulationLoop({
    game,
    paused: gazetteOpen || isHiddenPaused,
    onTurnExpire: handleTurnExpire,
    enabled: isHydrated && screenMode === 'PLAYING' && game?.phase === 'playing' && !busy,
    onHeartbeat: handleHeartbeat,
    turnSeconds: settings.turnSeconds,
  });

  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  async function handleEndTurn() {
    const current = gameRef.current;
    if (!current || busy || gazetteOpen || isHiddenPaused) return;
    await runSettlement();
  }

  function buildRetrospective(
    state: GameStateSnapshot,
    outcome: 'victory' | 'defeat',
  ): RetrospectiveStats {
    const score = scoreForCampaign(
      state.economy.population,
      state.economy.treasurySats,
      state.buildings.filter((b) => b.faction === 'player').length,
      state.economy.raidersSunk ?? 0,
    );
    const { rank, flavor } = rankForScore(score);
    return {
      outcome,
      finalTreasurySats: state.economy.treasurySats,
      peakPopulation: state.economy.peakPopulation,
      foodReserves: state.economy.foodReserves,
      raidersSunk: state.economy.raidersSunk ?? 0,
      buildingCount: state.buildings.filter((b) => b.faction === 'player').length,
      finalScore: score,
      rank,
      rankFlavor: flavor,
      chronicle: chronicleRef.current,
      history: state.history,
    };
  }

  async function handleCommence(mode: VoyageMode) {
    activateMap(settings.mapId as MapId);
    const fresh = createInitialGameState(mode, settings.mapId as MapId);
    await db.activeGame.put(fresh);
    setGame(fresh);
    gameRef.current = fresh;
    setHasSavedRun(true);
    setRetroStats(null);
    setChronicle([]);
    setGazetteAudit(null);
    setGazetteOpen(false);
    setGazetteFlashUntil(0);
    setSelectedItem(null);
    setSelectedVesselId(null);
    setIsHiddenPaused(false);
    setTab('construct');
    resetClock();
    setScreenMode('PLAYING');
    pushToast(
      mode === 'duel'
        ? 'Pass-and-play duel begun — share the chart and alternate the helm'
        : 'Solo voyage commenced — the Governor of Blue takes the helm opposite you',
      'gold',
    );
  }

  function handleResume() {
    setScreenMode('PLAYING');
  }

  async function handleSaveArchives() {
    if (!retroStats || !game) return;
    if (retroStats.outcome === 'victory') {
      await recordCampaignResult({
        date: new Date().toISOString(),
        faction: 'P1',
        finalScore: retroStats.finalScore,
        rank: retroStats.rank,
        turnsSurvived: game.turn,
        treasurySats: retroStats.finalTreasurySats,
        peakPop: retroStats.peakPopulation,
      });
    } else {
      await recordMatchOutcome(game, 'defeat');
    }
  }

  function handleReturnToTitle() {
    void (async () => {
      await db.activeGame.clear();
    })();
    setHasSavedRun(false);
    setGame(null);
    gameRef.current = null;
    setRetroStats(null);
    setChronicle([]);
    setGazetteAudit(null);
    setGazetteOpen(false);
    setGazetteFlashUntil(0);
    setSelectedItem(null);
    setSelectedVesselId(null);
    setIsHiddenPaused(false);
    setScreenMode('TITLE');
  }

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center overflow-hidden bg-charcoal">
        <p className="animate-sway font-display text-sm uppercase tracking-[0.3em] text-foam/60">Charting the isles…</p>
      </div>
    );
  }

  if (screenMode === 'TITLE') {
    return (
      <div className="h-full w-screen overflow-hidden bg-charcoal pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]">
        <ToastManager toasts={toasts} />
        <TitleScreen
          hasSavedRun={hasSavedRun}
          settings={settings}
          onChangeSettings={changeSettings}
          onCommence={handleCommence}
          onResume={handleResume}
        />
      </div>
    );
  }

  if (screenMode === 'RETROSPECTIVE' && retroStats) {
    return (
      <div className="h-full w-screen overflow-hidden bg-charcoal pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]">
        <ToastManager toasts={toasts} />
        <RetrospectiveScreen
          stats={retroStats}
          turnsSurvived={game?.turn ?? settings.campaignTurns}
          onSaveArchives={handleSaveArchives}
          onReturnToTitle={handleReturnToTitle}
        />
      </div>
    );
  }

  if (!game) {
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
    gazetteFlashUntil,
    onOpenGazette: openGazette,
  };

  return (
    <div className="flex h-full w-screen flex-col overflow-hidden bg-charcoal pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]">
      <PortraitOverlay />
      <ToastManager toasts={toasts} />
      {gazetteOpen && gazetteAudit && <TurnGazetteModal audit={gazetteAudit} onClose={closeGazette} />}
      {compactLandscape && <Hud turn={game.turn} economy={game.economy} />}

      <main className="relative flex min-h-0 w-full flex-1 overflow-hidden">
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
                onSelectTile={handleSelectTile}
                onCancel={handleCancelSelection}
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
                  onSelectTile={handleSelectTile}
                  onCancel={handleCancelSelection}
                />
              </div>
            </div>
            <CommandConsole
              {...railProps}
              stage={trayStage}
              onStageChange={setTrayStage}
              secondsLeft={secondsLeft}
              campaignTurns={settings.campaignTurns}
            />
          </div>
        )}
      </main>
    </div>
  );
}
