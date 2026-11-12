import type { BuildingType, UnitType } from '@/types/game';

/**
 * Single declarative registry of every placed item's stats. Costs, labels and
 * per-turn yields live here so UI cards, the settlement audit and the AI all
 * read one source of truth. Display `effect` strings are intentionally frozen
 * as authored — they are copy, not balance math.
 */
export interface BuildingBlueprint {
  label: string;
  description: string;
  costSats: number;
  effect: string;
  /** Grain added to the granary each settlement audit. */
  foodPerTurn: number;
  /** Grain added instead when a plantation is watered by a squall. */
  wateredFood: number;
  /** Satoshis minted each settlement audit. */
  satsPerTurn: number;
  /** Housing capacity contributed per structure. */
  housingPerUnit: number;
  /** Unrest relieved each settlement audit (percent points). */
  unrestReduction: number;
}

export interface UnitBlueprint {
  label: string;
  description: string;
}

export const BUILDABLE_VESSELS = ['FISHING_SCHOONER', 'PRIVATEER_SLOOP'] as const;
export type BuildableVesselType = (typeof BUILDABLE_VESSELS)[number];

export const BUILDING_BLUEPRINTS: Record<BuildingType, BuildingBlueprint> = {
  PLANTATION: {
    label: 'Plantation',
    description: 'Tilled fields and cane rows worked by your settlers.',
    costSats: 800,
    effect: '+30 food per turn',
    foodPerTurn: 25,
    wateredFood: 50,
    satsPerTurn: 0,
    housingPerUnit: 0,
    unrestReduction: 0,
  },
  TRADING_POST: {
    label: 'Trading Post',
    description: 'Harbor-side exchange where cargo is settled in sats.',
    costSats: 1200,
    effect: '+120 sats per turn',
    foodPerTurn: 0,
    wateredFood: 0,
    satsPerTurn: 40,
    housingPerUnit: 0,
    unrestReduction: 0,
  },
  SETTLER_QUARTERS: {
    label: 'Settler Quarters',
    description: 'Timber lodgings that shelter new arrivals to the isle.',
    costSats: 1000,
    effect: '+40 housing capacity',
    foodPerTurn: 0,
    wateredFood: 0,
    satsPerTurn: 0,
    housingPerUnit: 1000,
    unrestReduction: 0,
  },
  COASTAL_BASTION: {
    label: 'Coastal Bastion',
    description: 'Cannon battery guarding the anchorage from raiders.',
    costSats: 1500,
    effect: '-5 unrest per turn',
    foodPerTurn: 0,
    wateredFood: 0,
    satsPerTurn: 0,
    housingPerUnit: 0,
    unrestReduction: 5,
  },
  APOTHECARY: {
    label: 'Apothecary',
    description: 'Herbalist infirmary tending the sick and wounded.',
    costSats: 900,
    effect: '-2 mortality per turn',
    foodPerTurn: 0,
    wateredFood: 0,
    satsPerTurn: 0,
    housingPerUnit: 0,
    unrestReduction: 10,
  },
};

export const VESSEL_BLUEPRINTS: Record<BuildableVesselType, UnitBlueprint & { costSats: number }> = {
  FISHING_SCHOONER: {
    label: 'Fishing Schooner',
    description: 'Working vessel that hauls in food when moored near shoals.',
    costSats: 600,
  },
  PRIVATEER_SLOOP: {
    label: 'Privateer Sloop',
    description: 'Fast armed raider that can strike rival shipping lanes.',
    costSats: 1400,
  },
};

export const UNIT_BLUEPRINTS: Record<UnitType, UnitBlueprint> = {
  FISHING_SCHOONER: { ...VESSEL_BLUEPRINTS.FISHING_SCHOONER },
  PRIVATEER_SLOOP: { ...VESSEL_BLUEPRINTS.PRIVATEER_SLOOP },
  SQUALL: {
    label: 'Squall',
    description: 'A brief violent gust front that scatters loose vessels.',
  },
  TEMPEST: {
    label: 'Tempest',
    description: 'A towering storm system — heavy damage, slow to pass.',
  },
  FISH_SHOAL: {
    label: 'Fish Shoal',
    description: 'Migrating schools that drift across the channel each turn.',
  },
  ROGUE_GALLEON: {
    label: 'Rogue Galleon',
    description: 'Masterless treasure ship; seize it before your rival does.',
  },
  CORSAIR_MUTINEER: {
    label: 'Corsair Mutineer',
    description: 'Rabble roused by unrest — quell them with a Coastal Bastion or lose a building.',
  },
};

export function isBuildableVessel(type: UnitType): type is BuildableVesselType {
  return (BUILDABLE_VESSELS as readonly UnitType[]).includes(type);
}

export const BUILDABLE_BUILDINGS = Object.keys(BUILDING_BLUEPRINTS) as BuildingType[];

export function isBuildingType(item: BuildingType | UnitType): item is BuildingType {
  return (BUILDABLE_BUILDINGS as readonly string[]).includes(item);
}

export function itemCost(item: BuildingType | UnitType): number {
  if (isBuildingType(item)) return BUILDING_BLUEPRINTS[item].costSats;
  return isBuildableVessel(item) ? VESSEL_BLUEPRINTS[item].costSats : Infinity;
}

/** Food a moored schooner passively contributes each settlement audit. */
export const SCHOONER_PASSIVE_FOOD = 15;
/** Food hauled in when a schooner rests on a fish shoal tile. */
export const SHOAL_HARVEST_FOOD = 50;
/** Satoshi bounty paid when a sloop neutralizes a rogue galleon. */
export const GALLEON_BOUNTY_SATS = 35;
