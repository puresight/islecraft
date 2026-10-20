import { BuildingType, GameStateSnapshot } from '@/types/game';

export interface TurnAuditReport {
  turn: number;
  /** sats earned this turn (Mint/Trading Posts) */
  revenueSats: number;
  foodHarvested: number;
  foodConsumed: number;
  /** population before and after the audit */
  prevPop: number;
  netPop: number;
  popDelta: number;
  prevUnrest: number;
  newUnrest: number;
  /** treasury before and after */
  prevTreasurySats: number;
  netTreasury: number;
  /** food stores before and after, clamped at 0 */
  prevFood: number;
  netFood: number;
  housingCapacity: number;
  housingOccupancy: number;
  /** Settler Quarters count */
  quartersCount: number;
  events: string[];
  stability: 'Peaceful' | 'Agitated' | 'Mutinous';
}

const STABILITY_BANDS = [
  { max: 33, label: 'Peaceful' as const },
  { max: 66, label: 'Agitated' as const },
];

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

function stabilityFor(unrest: number): TurnAuditReport['stability'] {
  for (const band of STABILITY_BANDS) {
    if (unrest <= band.max) return band.label;
  }
  return 'Mutinous';
}

/**
 * Pure end-of-turn settlement audit. Reads the snapshot, returns the ledger —
 * does not mutate anything.
 */
  export function calculateTurnAudit(
  state: GameStateSnapshot,
  options?: { wateredPlantationKeys?: Set<string> },
): TurnAuditReport {
  const own = state.buildings.filter((b) => b.faction === 'player');
  const count = (type: BuildingType) => own.filter((b) => b.type === type).length;

  const mints = count('TRADING_POST');
  const quarters = count('SETTLER_QUARTERS');
  const apothecaries = count('APOTHECARY');
  const activeSchooners = state.units.filter(
    (u) => u.faction === 'player' && u.type === 'FISHING_SCHOONER',
  ).length;

  const econ = state.economy;
  const events: string[] = [];

  // --- Food Harvest (plantations watered by a squall yield double) ---
  let foodHarvested = activeSchooners * 15;
  let wateredCount = 0;
  own
    .filter((b) => b.type === 'PLANTATION')
    .forEach((b) => {
      const watered = options?.wateredPlantationKeys?.has(`${b.col},${b.row}`) ?? false;
      foodHarvested += watered ? 50 : 25;
      if (watered) wateredCount += 1;
    });
  if (wateredCount > 0) {
    events.push(`Squall rains watered ${wateredCount === 1 ? 'a plantation' : `${wateredCount} plantations`} (+50 food each).`);
  }

  // --- Food Consumption: 20 Food per 500 population ---
  const foodConsumed = Math.ceil((econ.population / 500) * 20);
  const netFoodRaw = econ.foodReserves + foodHarvested - foodConsumed;

  // --- Population & Unrest from the granary ---
  let netPop = econ.population;
  let unrest = econ.unrestIndex;
  let popDelta = 0;

  if (netFoodRaw < 0) {
    const lost = Math.max(1, Math.floor(econ.population * 0.1));
    netPop = Math.max(0, econ.population - lost);
    popDelta = netPop - econ.population;
    unrest = clampPct(unrest + 25);
    events.push(`Granary emptied — ${lost} settlers lost to starvation.`);
  } else {
    // Surplus: population grows 5% to 8%, capped by housing
    const growthPct = 0.05 + Math.random() * 0.03;
    const births = Math.min(
      Math.max(0, econ.housingCapacity - econ.population),
      Math.max(0, Math.round(econ.population * growthPct)),
    );
    if (births > 0) {
      netPop = econ.population + births;
      popDelta = births;
      events.push(`${births} settlers born under the palm roofs.`);
    }
  }

  // Clamp food at 0
  const netFood = Math.max(0, netFoodRaw);

  // --- Housing & Overcrowding ---
  const housingCapacity = quarters * 1000;
  if (housingCapacity === 0) {
    unrest = clampPct(unrest + 15);
    events.push('No Settler Quarters standing — the camp is overcrowded.');
  } else if (netPop > housingCapacity) {
    unrest = clampPct(unrest + 15);
    events.push('Housing shortage — tents on the strand, unrest rising.');
  }

  // --- Healthcare ---
  if (apothecaries > 0) {
    unrest = clampPct(unrest - apothecaries * 10);
    events.push(`Apothecary tended the sick (-${apothecaries * 10}% unrest).`);
  }

  // --- Treasury & Revenue ---
  const revenueSats = mints * 40;
  const netTreasury = econ.treasurySats + revenueSats;

  return {
    turn: state.turn,
    revenueSats,
    foodHarvested,
    foodConsumed,
    prevPop: econ.population,
    netPop,
    popDelta,
    prevUnrest: econ.unrestIndex,
    newUnrest: unrest,
    prevTreasurySats: econ.treasurySats,
    netTreasury,
    prevFood: econ.foodReserves,
    netFood,
    housingCapacity,
    housingOccupancy: housingCapacity > 0 ? Math.round((netPop / housingCapacity) * 100) : 100,
    quartersCount: quarters,
    events,
    stability: stabilityFor(unrest),
  };
}
