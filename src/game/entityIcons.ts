import { Sprout, Coins, Home, Shield, Leaf, Sailboat, Ship, Swords, Wind, CloudLightning, Fish, Skull, type LucideIcon } from 'lucide-react';
import { BuildingType, UnitType } from '@/types/game';

export const BUILDING_ICON: Record<BuildingType, LucideIcon> = {
  PLANTATION: Sprout,
  TRADING_POST: Coins,
  SETTLER_QUARTERS: Home,
  COASTAL_BASTION: Shield,
  APOTHECARY: Leaf,
};

export const UNIT_ICON: Record<UnitType, LucideIcon> = {
  FISHING_SCHOONER: Sailboat,
  PRIVATEER_SLOOP: Ship,
  SQUALL: Wind,
  TEMPEST: CloudLightning,
  FISH_SHOAL: Fish,
  ROGUE_GALLEON: Skull,
  CORSAIR_MUTINEER: Swords,
};
